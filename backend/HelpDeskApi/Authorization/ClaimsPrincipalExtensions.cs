using System.Security.Claims;

namespace HelpDeskApi.Authorization;

/// <summary>
/// Equivalent of authMiddleware.js's verifyToken (decoded payload -> req.user)
/// and filterByEmpCode (req.empCode, req.costCenter, req.isITStaff).
/// With [Authorize] + JwtBearer, ASP.NET Core already decodes the token into
/// User.Claims for every request - these helpers just read it back out the
/// same way the Node controllers read req.user / req.empCode / req.isITStaff.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    public static string GetEmpCode(this ClaimsPrincipal user) =>
        user.FindFirst("empcode")?.Value ?? "";

    public static string GetCostCenter(this ClaimsPrincipal user) =>
        user.FindFirst("cost_center")?.Value ?? "";

    public static string GetName(this ClaimsPrincipal user) =>
        user.FindFirst("name")?.Value ?? "";

    public static string GetEmail(this ClaimsPrincipal user) =>
        user.FindFirst("email")?.Value ?? "";

    public static string GetUsername(this ClaimsPrincipal user) =>
        user.FindFirst("username")?.Value ?? "";

    public static string GetSect(this ClaimsPrincipal user) =>
        user.FindFirst("sect")?.Value ?? "";

    public static string GetRole(this ClaimsPrincipal user) =>
        user.FindFirst("role")?.Value ?? "User";

    /// <summary>IT staff = role admin or it_staff (it_staff = cost center 7510).</summary>
    public static bool IsItStaff(this ClaimsPrincipal user) =>
        AccessRules.IsItStaffRole(user.FindFirst("role")?.Value);
}
