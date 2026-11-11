using System.Security.Claims;
using HelpDeskApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace HelpDeskApi.Authorization;

/// <summary>
/// Requires the JWT to carry the given permission code (claim "perm").
/// Permissions are read from ithd_user_roles -> ithd_role_permissions at login.
/// Must run after JWT auth, so the action also needs [Authorize].
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class RequirePermissionAttribute : ActionFilterAttribute
{
    private readonly string _permission;

    public RequirePermissionAttribute(string permission)
    {
        _permission = permission;
    }

    public override void OnActionExecuting(ActionExecutingContext context)
    {
        var user = context.HttpContext.User;
        if (!user.HasPermission(_permission))
        {
            context.Result = new ObjectResult(
                ApiResponse.Fail($"Access denied. Requires permission: {_permission}"))
            {
                StatusCode = 403
            };
        }
        base.OnActionExecuting(context);
    }
}

public static class PermissionClaimExtensions
{
    public static bool HasPermission(this ClaimsPrincipal user, string permission) =>
        user.FindAll("perm").Any(c => string.Equals(c.Value, permission, StringComparison.OrdinalIgnoreCase));
}
