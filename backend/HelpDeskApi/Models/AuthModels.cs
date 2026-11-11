using System.Text.Json.Serialization;

namespace HelpDeskApi.Models;

/// <summary>POST /api/auth/authen request body.</summary>
public class LoginRequest
{
    [JsonPropertyName("username")]
    public string? Username { get; set; }

    [JsonPropertyName("password")]
    public string? Password { get; set; }
}

/// <summary>
/// Shape returned by the Daikin AD REST API. Field names match the external API exactly
/// (PascalCase / underscore mix), same as apiData.EmpCode etc. in authController.js.
/// </summary>
public class DaikinAuthResponse
{
    public string? EmpCode { get; set; }
    public string? ShortName { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? EmpPic { get; set; }
    public string? SECT_Short { get; set; }
    public string? SECT_Long { get; set; }
    public string? Position { get; set; }
    public string? Cost_Center { get; set; }
}

/// <summary>
/// The "user" object returned in the login response AND encoded into the JWT.
/// Property names/casing intentionally match the original Node payload
/// (sect_short, cost_center, Position, empPic) so the frontend needs zero changes.
/// </summary>
public class AuthUser
{
    [JsonPropertyName("username")]
    public string Username { get; set; } = "";

    [JsonPropertyName("role")]
    public string Role { get; set; } = "User";

    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("sect")]
    public string Sect { get; set; } = "";

    [JsonPropertyName("sect_short")]
    public string SectShort { get; set; } = "";

    [JsonPropertyName("sect_long")]
    public string SectLong { get; set; } = "";

    [JsonPropertyName("empcode")]
    public string EmpCode { get; set; } = "";

    [JsonPropertyName("Position")]
    public string Position { get; set; } = "";

    [JsonPropertyName("email")]
    public string Email { get; set; } = "";

    [JsonPropertyName("cost_center")]
    public string CostCenter { get; set; } = "";

    // Only present on the login response, not stored in the JWT
    [JsonPropertyName("empPic")]
    public string? EmpPic { get; set; }

    // Permission codes granted to this user (also embedded in the JWT as "perm" claims)
    [JsonPropertyName("permissions")]
    public List<string> Permissions { get; set; } = new();
}

public class LoginResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("token")]
    public string? Token { get; set; }

    [JsonPropertyName("user")]
    public AuthUser? User { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}
