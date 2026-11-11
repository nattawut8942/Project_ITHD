using System.Security.Claims;
using HelpDeskApi.Authorization;
using HelpDeskApi.Models;
using Xunit;

namespace HelpDeskApi.Tests;

public class ResolveRoleTests
{
    [Fact]
    public void Manual_role_is_kept_even_when_cost_center_differs()
    {
        Assert.Equal("admin", AccessRules.ResolveRole("admin", "manual", "4130"));
        Assert.Equal("user", AccessRules.ResolveRole("user", "manual", "7510"));
    }

    [Fact]
    public void Auto_role_follows_cost_center_on_every_login()
    {
        Assert.Equal("it_staff", AccessRules.ResolveRole("user", "auto", "7510"));
        Assert.Equal("user", AccessRules.ResolveRole("it_staff", "auto", "4130"));
    }

    [Fact]
    public void Cost_center_is_trimmed_before_matching()
    {
        Assert.Equal("it_staff", AccessRules.ResolveRole(null, "auto", " 7510 "));
    }

    [Fact]
    public void Unknown_saved_role_falls_back_to_default()
    {
        Assert.Equal("user", AccessRules.ResolveRole("superuser", "manual", "4130"));
        Assert.Equal("it_staff", AccessRules.ResolveRole(null, null, "7510"));
    }
}

public class PermissionsTests
{
    [Fact]
    public void Admin_has_all_four_permissions()
    {
        var perms = AccessRules.PermissionsFor(AccessRules.RoleAdmin);
        Assert.Equal(4, perms.Count);
        Assert.Contains(AccessRules.PermMasterEdit, perms);
        Assert.Contains(AccessRules.PermUsersManage, perms);
        Assert.Contains(AccessRules.PermLogsView, perms);
        Assert.Contains(AccessRules.PermTicketsManage, perms);
    }

    [Fact]
    public void It_staff_can_only_manage_tickets()
    {
        var perms = AccessRules.PermissionsFor(AccessRules.RoleItStaff);
        Assert.Equal(new[] { AccessRules.PermTicketsManage }, perms);
    }

    [Fact]
    public void Regular_user_has_no_permissions()
    {
        Assert.Empty(AccessRules.PermissionsFor(AccessRules.RoleUser));
        Assert.Empty(AccessRules.PermissionsFor("anything-else"));
        Assert.Empty(AccessRules.PermissionsFor(null));
    }

    [Theory]
    [InlineData("admin", true)]
    [InlineData("it_staff", true)]
    [InlineData("user", false)]
    public void Only_admin_and_it_staff_count_as_it_staff(string role, bool expected)
    {
        Assert.Equal(expected, AccessRules.IsItStaffRole(role));
    }

    [Fact]
    public void Permission_attribute_check_reads_perm_claims()
    {
        var withLogs = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("perm", "logs.view"),
        }, "test"));
        var without = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("role", "user"),
        }, "test"));

        Assert.True(withLogs.HasPermission("logs.view"));
        Assert.True(withLogs.HasPermission("LOGS.VIEW"));
        Assert.False(withLogs.HasPermission("master.edit"));
        Assert.False(without.HasPermission("logs.view"));
    }
}

public class CancelRuleTests
{
    [Fact]
    public void Owner_can_cancel_while_ticket_is_open()
    {
        Assert.True(AccessRules.CanCancelOwn("41456", "41456", "Open"));
    }

    [Fact]
    public void Owner_cannot_cancel_after_work_has_started()
    {
        Assert.False(AccessRules.CanCancelOwn("41456", "41456", "In Progress"));
        Assert.False(AccessRules.CanCancelOwn("41456", "41456", "On Hold"));
        Assert.False(AccessRules.CanCancelOwn("41456", "41456", "Closed"));
        Assert.False(AccessRules.CanCancelOwn("41456", "41456", "Rejected"));
    }

    [Fact]
    public void Someone_else_cannot_cancel_even_when_open()
    {
        Assert.False(AccessRules.CanCancelOwn("41329", "41456", "Open"));
    }

    [Fact]
    public void Employee_code_comparison_ignores_case_and_spaces()
    {
        Assert.True(AccessRules.CanCancelOwn(" i7454 ", "I7454", "Open"));
    }

    [Fact]
    public void Missing_status_is_not_cancellable()
    {
        Assert.False(AccessRules.CanCancelOwn("41456", "41456", null));
    }
}

public class ThaiLabelTests
{
    [Theory]
    [InlineData("Open", "รอรับเรื่อง")]
    [InlineData("In Progress", "กำลังดำเนินการ")]
    [InlineData("On Hold", "พักไว้")]
    [InlineData("Closed", "ปิดแล้ว")]
    [InlineData("Rejected", "ปฏิเสธ")]
    [InlineData("Cancelled", "ยกเลิก")]
    public void Status_labels_are_thai(string status, string expected)
    {
        Assert.Equal(expected, ThaiLabels.Status(status));
    }

    [Fact]
    public void Unknown_status_is_shown_as_is()
    {
        Assert.Equal("Mystery", ThaiLabels.Status("Mystery"));
    }
}
