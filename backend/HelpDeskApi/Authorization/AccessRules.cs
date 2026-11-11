namespace HelpDeskApi.Authorization;

/// <summary>
/// กฎการเข้าถึงทั้งหมดของระบบอยู่ที่นี่ที่เดียว (บทบาท สิทธิ์ และการยกเลิกคำขอ)
/// ใช้ทั้งใน AuthController และ TicketController และถูกทดสอบโดยโปรเจกต์ Tests
/// </summary>
public static class AccessRules
{
    public const string RoleAdmin = "admin";
    public const string RoleItStaff = "it_staff";
    public const string RoleUser = "user";

    public const string PermMasterEdit = "master.edit";
    public const string PermUsersManage = "users.manage";
    public const string PermLogsView = "logs.view";
    public const string PermTicketsManage = "tickets.manage";

    public const string ItStaffCostCenter = "7510";

    public static readonly string[] ValidRoles = { RoleAdmin, RoleItStaff, RoleUser };

    /// <summary>
    /// บทบาทที่ตั้งจากหน้าเว็บ (manual) จะคงไว้ ส่วนที่ยังไม่ได้ตั้งเอง (auto) จะคำนวณจาก cost center ทุกครั้งที่ login
    /// </summary>
    public static string ResolveRole(string? savedRole, string? roleSource, string? costCenter)
    {
        if (string.Equals(roleSource, "manual", StringComparison.OrdinalIgnoreCase)
            && savedRole is RoleAdmin or RoleItStaff or RoleUser)
            return savedRole!;
        return DefaultRoleFor(costCenter);
    }

    /// <summary>บทบาทเริ่มต้นจาก cost center: 7510 เป็น it_staff ที่เหลือเป็น user</summary>
    public static string DefaultRoleFor(string? costCenter) =>
        (costCenter ?? "").Trim() == ItStaffCostCenter ? RoleItStaff : RoleUser;

    /// <summary>สิทธิ์ของแต่ละบทบาท</summary>
    public static List<string> PermissionsFor(string? role) => role switch
    {
        RoleAdmin => new List<string> { PermMasterEdit, PermUsersManage, PermLogsView, PermTicketsManage },
        RoleItStaff => new List<string> { PermTicketsManage },
        _ => new List<string>()
    };

    /// <summary>IT staff = admin หรือ it_staff</summary>
    public static bool IsItStaffRole(string? role) => role is RoleAdmin or RoleItStaff;

    /// <summary>
    /// ผู้แจ้งยกเลิกคำขอของตัวเองได้เฉพาะตอนที่เคสยังเป็น Open
    /// </summary>
    public static bool CanCancelOwn(string actorEmpCode, string ticketEmpCreated, string? ticketStatus) =>
        string.Equals((actorEmpCode ?? "").Trim(), (ticketEmpCreated ?? "").Trim(), StringComparison.OrdinalIgnoreCase)
        && ticketStatus == "Open";
}
