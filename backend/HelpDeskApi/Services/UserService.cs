using Dapper;
using HelpDeskApi.Data;
using Microsoft.Extensions.Caching.Memory;

namespace HelpDeskApi.Services;

public record UserRecord(string EmpCode, string Email, string Name, string Cost_Center, string Sect);

/// <summary>Port of backend/src/services/userService.js</summary>
public class UserService
{
    private readonly DbConnectionFactory _db;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1); // same as CACHE_DURATION = 3600000

    public UserService(DbConnectionFactory db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    /// <summary>
    /// getEmailByEmpCode: cache -> DB (dbo.ithd_users) -> fallback constructed from empCode.
    /// </summary>
    public async Task<string?> GetEmailByEmpCodeAsync(string? empCode)
    {
        if (string.IsNullOrEmpty(empCode)) return null;

        var cacheKey = $"user-email:{empCode}";
        if (_cache.TryGetValue(cacheKey, out string? cachedEmail))
            return cachedEmail;

        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var email = await conn.QueryFirstOrDefaultAsync<string>(
                "SELECT email FROM dbo.ithd_users WHERE empCode = @empCode", new { empCode });

            if (email != null)
            {
                _cache.Set(cacheKey, email, CacheDuration);
                return email;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to get email for {empCode}: {ex.Message}");
        }

        // Fallback: construct from empCode (mirrors the JS regex fallback)
        var emailPrefix = System.Text.RegularExpressions.Regex
            .Replace(empCode.ToLowerInvariant(), @"emp\d+", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase)
            .Trim();

        return emailPrefix.Contains('@') ? emailPrefix : $"{emailPrefix}@dci.daikin.co.jp";
    }

    /// <summary>getUserByEmpCode</summary>
    public async Task<UserRecord?> GetUserByEmpCodeAsync(string? empCode)
    {
        if (string.IsNullOrEmpty(empCode)) return null;
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            return await conn.QueryFirstOrDefaultAsync<UserRecord>(
                @"SELECT empCode AS EmpCode, email AS Email, name AS Name,
                         cost_center AS Cost_Center, sect AS Sect
                  FROM dbo.ithd_users WHERE empCode = @empCode", new { empCode });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to get user {empCode}: {ex.Message}");
            return null;
        }
    }

    /// <summary>getNameByEmpCode - falls back to returning empCode itself, same as JS.</summary>
    public async Task<string> GetNameByEmpCodeAsync(string? empCode)
    {
        if (string.IsNullOrEmpty(empCode)) return "User";
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var name = await conn.QueryFirstOrDefaultAsync<string>(
                "SELECT name FROM dbo.ithd_users WHERE empCode = @empCode", new { empCode });
            return name ?? empCode;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to get name for {empCode}: {ex.Message}");
            return empCode;
        }
    }

    /// <summary>syncUserFromDaikinAD - insert if new, else update by empCode/email match.</summary>
    public async Task<(bool Success, string? Action, string? Error)> SyncUserFromDaikinAdAsync(
        string empCode, string userName, string email, string costCenter, string sect)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();

            var existingEmpCode = await conn.QueryFirstOrDefaultAsync<string>(
                "SELECT empCode FROM dbo.ithd_users WHERE empCode = @empCode OR email = @email",
                new { empCode, email });

            if (existingEmpCode == null)
            {
                await conn.ExecuteAsync(
                    @"INSERT INTO dbo.ithd_users (empCode, email, name, cost_center, sect)
                      VALUES (@empCode, @email, @userName, @costCenter, @sect)",
                    new { empCode, email, userName, costCenter, sect });

                _cache.Remove($"user-email:{empCode}");
                Console.WriteLine($"✅ User synced to dbo.ithd_users: {empCode}");
                return (true, "inserted", null);
            }
            else
            {
                await conn.ExecuteAsync(
                    @"UPDATE dbo.ithd_users
                      SET empCode = @empCode, email = @email, name = @userName,
                          cost_center = @costCenter, sect = @sect
                      WHERE empCode = @existingEmpCode",
                    new { empCode, email, userName, costCenter, sect, existingEmpCode });

                _cache.Remove($"user-email:{empCode}");
                _cache.Remove($"user-email:{existingEmpCode}");
                return (true, "updated", null);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to sync user {empCode}: {ex.Message}");
            return (false, null, ex.Message);
        }
    }

    /// <summary>clearUserCache - IMemoryCache has no global clear, so this is a no-op stub;
    /// in practice cache entries just expire after CacheDuration. Wire up an eviction-token
    /// based cache if a hard "clear all" is required.</summary>
    public void ClearUserCache() => Console.WriteLine("User cache clear requested (entries expire automatically after 1h)");
}
