using Dapper;
using HelpDeskApi.Authorization;
using HelpDeskApi.Data;
using HelpDeskApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HelpDeskApi.Controllers;

/// <summary>
/// Administration endpoints. Every action requires a specific permission,
/// so only users granted that permission (in practice: admin) can call them.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize]
public partial class AdminController : ControllerBase
{
    private readonly DbConnectionFactory _db;

    public AdminController(DbConnectionFactory db)
    {
        _db = db;
    }

    // GET /api/admin/login-logs?empCode=&username=&success=&from=&to=&page=1&pageSize=50
    [HttpGet("login-logs")]
    [RequirePermission("logs.view")]
    public async Task<IActionResult> GetLoginLogs(
        [FromQuery] string? empCode,
        [FromQuery] string? username,
        [FromQuery] bool? success,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var where = new List<string> { "1 = 1" };
        var p = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(empCode))
        {
            where.Add("empCode = @empCode");
            p.Add("empCode", empCode.Trim());
        }
        if (!string.IsNullOrWhiteSpace(username))
        {
            where.Add("username LIKE @username");
            p.Add("username", $"%{username.Trim()}%");
        }
        if (success.HasValue)
        {
            where.Add("success = @success");
            p.Add("success", success.Value);
        }
        if (from.HasValue)
        {
            where.Add("logged_at >= @from");
            p.Add("from", from.Value.Date);
        }
        if (to.HasValue)
        {
            where.Add("logged_at < @to");
            p.Add("to", to.Value.Date.AddDays(1));
        }

        var whereSql = string.Join(" AND ", where);
        p.Add("offset", (page - 1) * pageSize);
        p.Add("pageSize", pageSize);

        using var conn = await _db.GetOpenConnectionAsync();

        var total = await conn.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*) FROM dbo.ithd_login_logs WHERE {whereSql}", p);

        var rows = await conn.QueryAsync<LoginLogRow>($@"
            SELECT id, empCode, username, success, reason, ip_address AS IpAddress,
                   user_agent AS UserAgent, logged_at AS LoggedAt
            FROM dbo.ithd_login_logs
            WHERE {whereSql}
            ORDER BY logged_at DESC, id DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY", p);

        return Ok(ApiResponse<object>.Ok(new
        {
            total,
            page,
            pageSize,
            items = rows
        }));
    }
}

/// <summary>GET /api/admin/users : list users with their role and login summary.</summary>
public partial class AdminController
{
    private static readonly string[] AllowedRoles = AccessRules.ValidRoles;

    // GET /api/admin/users?search=&role=&page=1&pageSize=50
    [HttpGet("users")]
    [RequirePermission("users.manage")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search,
        [FromQuery] string? role,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var where = new List<string> { "1 = 1" };
        var p = new DynamicParameters();
        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add("(empCode LIKE @search OR name LIKE @search OR email LIKE @search)");
            p.Add("search", $"%{search.Trim()}%");
        }
        if (!string.IsNullOrWhiteSpace(role) && AllowedRoles.Contains(role))
        {
            where.Add("Role = @role");
            p.Add("role", role);
        }
        var whereSql = string.Join(" AND ", where);
        p.Add("offset", (page - 1) * pageSize);
        p.Add("pageSize", pageSize);

        using var conn = await _db.GetOpenConnectionAsync();
        var total = await conn.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*) FROM dbo.ithd_users WHERE {whereSql}", p);
        var items = await conn.QueryAsync<AdminUserRow>($@"
            SELECT empCode, name, email, cost_center AS CostCenter, sect AS Sect, Position,
                   Role, LastLoginAt, LoginCount, IsActive, RoleUpdatedBy, RoleUpdatedAt
            FROM dbo.ithd_users
            WHERE {whereSql}
            ORDER BY name
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY", p);

        return Ok(ApiResponse<object>.Ok(new { total, page, pageSize, items }));
    }

    // PUT /api/admin/users/{empCode}/role   body: { "role": "admin" | "it_staff" | "user" }
    [HttpPut("users/{empCode}/role")]
    [RequirePermission("users.manage")]
    public async Task<IActionResult> SetUserRole(string empCode, [FromBody] SetRoleRequest body)
    {
        var target = (empCode ?? "").Trim();
        var newRole = (body?.Role ?? "").Trim();
        var actor = User.GetEmpCode();

        if (!AllowedRoles.Contains(newRole))
            return BadRequest(ApiResponse.Fail("บทบาทไม่ถูกต้อง (ใช้ admin, it_staff หรือ user)"));

        using var conn = await _db.GetOpenConnectionAsync();
        var exists = (await conn.QueryFirstOrDefaultAsync<int?>(
            "SELECT 1 FROM dbo.ithd_users WHERE empCode = @target", new { target })) != null;
        if (!exists)
            return NotFound(ApiResponse.Fail("ไม่พบผู้ใช้นี้"));

        var currentRole = await conn.QueryFirstOrDefaultAsync<string>(
            "SELECT Role FROM dbo.ithd_users WHERE empCode = @target", new { target });

        if (string.Equals(target, actor, StringComparison.OrdinalIgnoreCase) && newRole != "admin")
            return BadRequest(ApiResponse.Fail("ไม่สามารถลดบทบาท admin ของตัวเองได้"));

        if (currentRole == "admin" && newRole != "admin")
        {
            var adminCount = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM dbo.ithd_users WHERE Role = 'admin' AND IsActive = 1");
            if (adminCount <= 1)
                return BadRequest(ApiResponse.Fail("ต้องมี admin อย่างน้อย 1 คนในระบบ"));
        }

        await conn.ExecuteAsync(@"
            UPDATE dbo.ithd_users
            SET Role = @newRole, RoleSource = 'manual', RoleUpdatedBy = @actor, RoleUpdatedAt = SYSDATETIME()
            WHERE empCode = @target",
            new { newRole, actor, target });

        return Ok(ApiResponse<object>.Ok(new { empCode = target, role = newRole, updatedBy = actor }, "อัปเดตบทบาทแล้ว"));
    }
}

public class SetRoleRequest
{
    public string? Role { get; set; }
}

public class AdminUserRow
{
    public string EmpCode { get; set; } = "";
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? CostCenter { get; set; }
    public string? Sect { get; set; }
    public string? Position { get; set; }
    public string? Role { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public int LoginCount { get; set; }
    public bool IsActive { get; set; }
    public string? RoleUpdatedBy { get; set; }
    public DateTime? RoleUpdatedAt { get; set; }
}

public class LoginLogRow
{
    public long Id { get; set; }
    public string? EmpCode { get; set; }
    public string Username { get; set; } = "";
    public bool Success { get; set; }
    public string? Reason { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime LoggedAt { get; set; }
}
