using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Dapper;
using HelpDeskApi.Authorization;
using HelpDeskApi.Data;
using HelpDeskApi.Models;
using HelpDeskApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace HelpDeskApi.Controllers;

/// <summary>
/// Port of backend/src/controllers/authController.js.
/// Route is "api" (not "api/auth") because authRoute.js's paths were already
/// '/authen', '/logout', '/verify' and the frontend calls /api/authen directly.
/// </summary>
[ApiController]
[Route("api")]
public class AuthController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly DbConnectionFactory _db;
    private readonly UserService _userService;
    private readonly IConfiguration _config;

    public AuthController(IHttpClientFactory httpClientFactory, DbConnectionFactory db,
        UserService userService, IConfiguration config)
    {
        _httpClientFactory = httpClientFactory;
        _db = db;
        _userService = userService;
        _config = config;
    }

    // POST /api/auth/authen  (login)
    [HttpPost("authen")]
    public async Task<IActionResult> Login([FromBody] LoginRequest body)
    {
        if (string.IsNullOrEmpty(body?.Username) || string.IsNullOrEmpty(body?.Password))
            return Unauthorized(ApiResponse.Fail("Invalid username or password"));

        try
        {
            Console.WriteLine($"🔌 Calling Daikin AD API for: {body.Username}");

            var apiUrl = _config["Daikin:AuthApiUrl"];
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);

            var url = $"{apiUrl}?username={Uri.EscapeDataString(body.Username)}&password={Uri.EscapeDataString(body.Password)}";
            var response = await client.GetAsync(url);

            if (!response.IsSuccessStatusCode && response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                await WriteLoginLogAsync(body.Username, null, false, "invalid_credentials");
                return Unauthorized(ApiResponse.Fail("Invalid username or password"));
            }

            var raw = await response.Content.ReadAsStringAsync();
            // The Daikin API can return either a single object or an array with one object,
            // same handling as `Array.isArray(response.data) ? response.data[0] : response.data`.
            DaikinAuthResponse? apiData = null;
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(raw);
                var root = doc.RootElement;
                var target = root.ValueKind == System.Text.Json.JsonValueKind.Array
                    ? (root.GetArrayLength() > 0 ? root[0] : default)
                    : root;

                if (target.ValueKind == System.Text.Json.JsonValueKind.Object)
                {
                    apiData = System.Text.Json.JsonSerializer.Deserialize<DaikinAuthResponse>(
                        target.GetRawText(),
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                }
            }
            catch
            {
                apiData = null;
            }

            Console.WriteLine("=== Daikin API Response ===");
            Console.WriteLine(raw);
            Console.WriteLine("===========================");

            if (apiData == null)
            {
                await WriteLoginLogAsync(body.Username, null, false, "invalid_credentials");
                return Unauthorized(ApiResponse.Fail("Invalid username or password"));
            }

            var empCode = (apiData.EmpCode ?? "").Trim();
            var shortName = apiData.ShortName ?? "";
            var fullName = apiData.FullName ?? "";
            var email = apiData.Email ?? "";
            var empPic = apiData.EmpPic ?? "";
            var sectShort = apiData.SECT_Short ?? "";
            var sectLong = apiData.SECT_Long ?? "";
            var position = apiData.Position ?? "";
            var sect = !string.IsNullOrEmpty(sectLong) ? sectLong : sectShort;
            var costCenter = (apiData.Cost_Center ?? "").Trim();

            if (string.IsNullOrEmpty(empCode) && string.IsNullOrEmpty(shortName))
            {
                await WriteLoginLogAsync(body.Username, null, false, "invalid_credentials");
                return Unauthorized(ApiResponse.Fail("Invalid username or password"));
            }

            // Check if user is admin/staff in database
            using var conn = await _db.GetOpenConnectionAsync();
            // Role lives on ithd_users. A role set from the admin page (RoleSource = manual) is kept;
            // otherwise the role follows the current cost center on every login.
            var savedRoleRow = await conn.QueryFirstOrDefaultAsync<(string? Role, string? RoleSource)>(
                "SELECT Role, RoleSource FROM dbo.ithd_users WHERE empCode = @empCode", new { empCode });
            var role = AccessRules.ResolveRole(savedRoleRow.Role, savedRoleRow.RoleSource, costCenter);

            var resolvedName = !string.IsNullOrEmpty(shortName) ? shortName : (!string.IsNullOrEmpty(fullName) ? fullName : body.Username);
            var resolvedEmail = !string.IsNullOrEmpty(email) ? email : $"{body.Username}@dci.daikin.co.jp";

            // ✅ SYNC USER TO DATABASE
            try
            {
                await _userService.SyncUserFromDaikinAdAsync(empCode, resolvedName, resolvedEmail, costCenter, sect);
            }
            catch (Exception syncErr)
            {
                Console.WriteLine($"⚠️ User sync warning: {syncErr.Message}");
            }

            var user = new AuthUser
            {
                Username = body.Username,
                Role = role,
                Name = resolvedName,
                Sect = sect,
                SectShort = sectShort,
                SectLong = sectLong,
                EmpCode = empCode,
                Position = position,
                Email = resolvedEmail,
                CostCenter = costCenter,
                EmpPic = empPic
            };

            await UpdateLoginStatsAsync(empCode, position, role);
            await WriteLoginLogAsync(body.Username, empCode, true, "success");

            user.Permissions = AccessRules.PermissionsFor(role);
            var token = GenerateJwt(user);

            Console.WriteLine($"✅ Login success: {empCode} | Role: {role}");

            return Ok(new LoginResponse { Success = true, Token = token, User = user });
        }
        catch (TaskCanceledException)
        {
            await WriteLoginLogAsync(body?.Username ?? "", null, false, "ad_timeout");
            return StatusCode(503, ApiResponse.Fail("AD Server unavailable."));
        }
        catch (HttpRequestException ex)
        {
            Console.Error.WriteLine($"❌ Auth Error: {ex.Message}");
            await WriteLoginLogAsync(body?.Username ?? "", null, false, "ad_unavailable");
            return StatusCode(503, ApiResponse.Fail("AD Server unavailable."));
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"❌ Auth Error: {ex.Message}");
            await WriteLoginLogAsync(body?.Username ?? "", null, false, "error");
            return StatusCode(500, ApiResponse.Fail("Authentication service error"));
        }
    }

    /// <summary>
    /// Updates the per-user login summary on ithd_users after a successful login.
    /// Never throws: a failure here must not block sign-in.
    /// </summary>
    private async Task UpdateLoginStatsAsync(string empCode, string position, string role)
    {
        try
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var ua = Request.Headers["User-Agent"].ToString();
            if (ua.Length > 400) ua = ua[..400];

            using var conn = await _db.GetOpenConnectionAsync();
            await conn.ExecuteAsync(@"
                UPDATE dbo.ithd_users
                SET LastLoginAt = SYSDATETIME(),
                    LoginCount = ISNULL(LoginCount, 0) + 1,
                    LastLoginIp = @ip,
                    LastUserAgent = @ua,
                    Position = @position,
                    Role = @role,
                    IsActive = 1
                WHERE empCode = @empCode",
                new
                {
                    empCode = (empCode ?? "").Trim(),
                    role,
                    position = string.IsNullOrWhiteSpace(position) ? null : position.Trim(),
                    ip,
                    ua = string.IsNullOrEmpty(ua) ? null : ua
                });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"⚠️ Login stats update failed: {ex.Message}");
        }
    }

    /// <summary>
    /// Records one login attempt in dbo.ithd_login_logs. Never throws: a logging
    /// failure must not block the user from signing in.
    /// The password is never passed in or stored.
    /// </summary>
    private async Task WriteLoginLogAsync(string username, string? empCode, bool success, string reason)
    {
        try
        {
            var ua = Request.Headers["User-Agent"].ToString();
            if (ua.Length > 400) ua = ua[..400];

            using var conn = await _db.GetOpenConnectionAsync();
            await conn.ExecuteAsync(@"
                INSERT INTO dbo.ithd_login_logs (empCode, username, success, reason, ip_address, user_agent)
                VALUES (@empCode, @username, @success, @reason, @ip, @ua)",
                new
                {
                    empCode = string.IsNullOrWhiteSpace(empCode) ? null : empCode.Trim(),
                    username = (username ?? "").Trim(),
                    success,
                    reason,
                    ip = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    ua = string.IsNullOrEmpty(ua) ? null : ua
                });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"⚠️ Login log failed: {ex.Message}");
        }
    }

    private string GenerateJwt(AuthUser user)
    {
        var secret = _config["Jwt:SecretKey"] ?? "your-secret-key-change-this-in-env";
        var hours = double.Parse(_config["Jwt:ExpiresInHours"] ?? "8");

        var claims = new List<Claim>
        {
            new("username", user.Username),
            new(ClaimTypes.Role, user.Role),
            new("role", user.Role),
            new("name", user.Name),
            new("sect", user.Sect),
            new("sect_short", user.SectShort),
            new("sect_long", user.SectLong),
            new("empcode", user.EmpCode),
            new("Position", user.Position),
            new("email", user.Email),
            new("cost_center", user.CostCenter),
        };
        foreach (var perm in user.Permissions)
            claims.Add(new Claim("perm", perm));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(hours),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // POST /api/auth/logout
    [HttpPost("logout")]
    public IActionResult Logout() => Ok(ApiResponse.Ok());

    // GET /api/auth/verify
    [HttpGet("verify")]
    [Authorize]
    public IActionResult Verify()
    {
        var user = new AuthUser
        {
            Username = User.GetUsername(),
            Role = User.GetRole(),
            Name = User.GetName(),
            Sect = User.GetSect(),
            SectShort = User.FindFirst("sect_short")?.Value ?? "",
            SectLong = User.FindFirst("sect_long")?.Value ?? "",
            EmpCode = User.GetEmpCode(),
            Position = User.FindFirst("Position")?.Value ?? "",
            Email = User.GetEmail(),
            CostCenter = User.GetCostCenter()
        };
        return Ok(new { success = true, user });
    }
}
