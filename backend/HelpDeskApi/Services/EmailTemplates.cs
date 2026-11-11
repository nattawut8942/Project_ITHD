using System.Globalization;

namespace HelpDeskApi.Services;

public record EmailTemplate(string Subject, string Html);

/// <summary>
/// Port of backend/src/utils/emailTemplates.js.
/// `ticket` is `dynamic` (a Dapper row) so property access mirrors the original
/// JS object property access (ticket.req_id, ticket.project_name, ...) 1:1.
///
/// Shared pieces (Wrap / Header / Footer / MetaFooter / Button) live in one place so
/// the five emails stay visually identical and a style fix only needs to be made once.
/// </summary>
public class EmailTemplates
{
    private readonly string _portalUrl;
    private static readonly TimeZoneInfo BangkokTz =
        TimeZoneInfo.FindSystemTimeZoneById(OperatingSystem.IsWindows() ? "SE Asia Standard Time" : "Asia/Bangkok");
    private static readonly CultureInfo ThaiCulture = new("th-TH");

    // Tahoma first: it contains BOTH Thai and Latin glyphs, so Thai and English text render at the
    // same visual size. (Segoe UI has no Thai glyphs, which made Latin text look bigger than Thai.)
    private const string Font = "font-family: Tahoma, 'Leelawadee UI', 'Segoe UI', Arial, sans-serif;";

    public EmailTemplates(IConfiguration config)
    {
        _portalUrl = config["Frontend:Url"] ?? "http://localhost:5173";
    }

    // NOTE: all datetime columns are written as Bangkok wall-clock values (see
    // TicketController.GetBangkokNow), the same convention the Node app used, so
    // formatting here just renders the stored clock face - no further TZ conversion.
    private static string FormatThaiDateOnly(object? value)
    {
        if (value is null) return "";
        var dt = Convert.ToDateTime(value);
        return dt.ToString("d MMMM yyyy", ThaiCulture);
    }

    private static string FormatThaiDateTime(object? value = null)
    {
        var dt = value is null
            ? TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, BangkokTz)
            : Convert.ToDateTime(value);
        return dt.ToString("d MMMM yyyy HH:mm:ss", ThaiCulture);
    }

    /// <summary>
    /// Makes user-typed text safe and readable inside HTML: escapes &lt; &gt; &amp; (so typed
    /// characters/tags can't break the layout or inject markup into someone else's inbox)
    /// and turns line breaks into &lt;br&gt; (otherwise multi-line notes collapse into one blob).
    /// </summary>
    private static string H(object? value) =>
        System.Net.WebUtility.HtmlEncode(Convert.ToString(value) ?? "")
            .Replace("\r\n", "<br>").Replace("\n", "<br>");

    // All colors below are chosen so white text on them has contrast >= 4.5:1 (WCAG AA).
    private static string GetPriorityColor(string? priority) => priority switch
    {
        "Critical" => "#b91c1c",
        "High" => "#c2410c",
        "Medium" => "#b45309",
        _ => "#475569"
    };

    // Keys match the statuses the system actually uses (same palette as the web UI badges).
    private static string GetStatusColor(string? status) => status switch
    {
        "Open" => "#2563eb",         // Blue
        "In Progress" => "#d97706",  // Amber (เปลี่ยนจากสีเขียวเป็นสีเหลืองทอง)
        "On Hold" => "#ea580c",      // Orange (เปลี่ยนเป็นสีส้ม)
        "Closed" => "#059669",       // Emerald (เปลี่ยนจากสีเทาเป็นสีเขียว)
        "Rejected" => "#e11d48",     // Rose
        "Cancelled" => "#64748b",    // Slate
        _ => "#475569"
    };

    private static string GetStatusLabel(string? status) => status switch
    {
        "Open" => "📥 OPEN",
        "In Progress" => "🛠️ IN PROGRESS",
        "On Hold" => "⏳ ON HOLD",
        "Closed" => "✅ CLOSED",
        "Rejected" => "❌ REJECTED",
        "Cancelled" => "🚫 CANCELLED",
        _ => status?.ToUpper() ?? ""
    };

    /// <summary>
    /// "Bulletproof" button: background + padding live on the &lt;td&gt; (not the &lt;a&gt;) and the label is
    /// wrapped in a white span, so Outlook / webmail can't drop the padding or override the link color.
    /// </summary>
    private static string Button(string url, string text, string bgColor) => $@"
            <table role=""presentation"" cellspacing=""0"" cellpadding=""0"" border=""0"" align=""center"" style=""margin: 32px auto;"">
                <tr>
                    <td align=""center"" bgcolor=""{bgColor}"" style=""background-color: {bgColor}; border-radius: 6px; padding: 14px 28px;"">
                        <a href=""{url}"" style=""color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; {Font}""><span style=""color: #ffffff;"">{text}</span></a>
                    </td>
                </tr>
            </table>";

    /// <summary>Outer container as a table: Outlook ignores max-width on a div but honors width on a table.</summary>
    private static string Wrap(string inner) => $@"
<table role=""presentation"" width=""600"" cellspacing=""0"" cellpadding=""0"" border=""0"" align=""center"" style=""width: 100%; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; background-color: #ffffff; {Font}"">
    <tr>
        <td style=""{Font}"">{inner}
        </td>
    </tr>
</table>";

    /// <summary>Colored title bar. background-color is the fallback for clients (Outlook) that ignore gradients.</summary>
    private static string Header(string fromColor, string toColor, string title) => $@"
            <div style=""background-color: {fromColor}; background-image: linear-gradient(135deg, {fromColor} 0%, {toColor} 100%); color: #ffffff; padding: 24px; text-align: center;"">
                <h1 style=""margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px; color: #ffffff; {Font}"">{title}</h1>
            </div>";

    private static string Footer() => $@"
            <div style=""background-color: #1e293b; color: #cbd5e1; padding: 24px; text-align: center; font-size: 14px; line-height: 1.6;"">
                <p style=""margin: 0; color: #cbd5e1; {Font}"">IT Help Desk | Daikin Compressor Industries</p>
                <p style=""margin: 4px 0 0 0; color: #cbd5e1; {Font}"">© 2026 All Rights Reserved</p>
            </div>";

    private static string MetaFooter(string reqId, string timeLabel, string timeValue) => $@"
                    <p style=""margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; line-height: 1.6; {Font}"">
                        <strong>รหัสอ้างอิง:</strong> {reqId}<br>
                        <strong>{timeLabel}</strong> {timeValue}<br>
                        อีเมลฉบับนี้ส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
                    </p>";

    /// <summary>ticketCreatedTemplate - sent to the user who created the ticket.</summary>
    public EmailTemplate TicketCreated(dynamic ticket, string userName)
    {
        string reqId = ticket.req_id;
        string subject = $"[{reqId}] สร้างเคสสำเร็จ: {ticket.project_name}";
        string link = $"{_portalUrl}/?view=all&ticket={(int)ticket.id}";
        string header = Header("#667eea", "#764ba2", "✓ สร้างแจ้งซ่อมสำเร็จ");
        string button = Button(link, "ตรวจสอบสถานะเคสของคุณ", "#4f46e5");
        string meta = MetaFooter(reqId, "วันที่สร้าง:", FormatThaiDateTime(ticket.created_at));
        string html = Wrap($@"{header}
            <div style=""background-color: #f8fafc; padding: 32px 24px;"">
                <p style=""color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0; {Font}"">สวัสดีคุณ {H(userName)},</p>
                <p style=""color: #334155; font-size: 16px; line-height: 1.6; {Font}"">ระบบได้รับแจ้งปัญหาของคุณเรียบร้อยแล้ว และกำลังรอดำเนินการโดยทีมงาน IT</p>
                <div style=""background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-left: 4px solid #667eea; margin: 24px 0; border-radius: 4px;"">
                    <p style=""margin-top: 0; color: #1e293b; font-size: 16px; font-weight: bold; {Font}"">รายละเอียดเคส:</p>
                    <table style=""width: 100%; font-size: 16px; border-collapse: collapse; line-height: 1.6; {Font}"">
                        <tr><td style=""padding: 10px 0; color: #64748b; width: 35%; border-bottom: 1px solid #f1f5f9;""><strong>หมายเลขเคส:</strong></td><td style=""padding: 10px 0; color: #0f172a; font-weight: bold; border-bottom: 1px solid #f1f5f9;"">{reqId}</td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;""><strong>ประเภทคำขอ:</strong></td><td style=""padding: 10px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;"">{ticket.problem_type_name ?? ticket.request_type}</td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;""><strong>ปัญหา:</strong></td><td style=""padding: 10px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;"">{H(ticket.project_name)}</td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;""><strong>สถานที่:</strong></td><td style=""padding: 10px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;"">{H(ticket.location)}</td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;""><strong>ความเร่งด่วน:</strong></td><td style=""padding: 10px 0; border-bottom: 1px solid #f1f5f9;""><span style=""display: inline-block; background-color: {GetPriorityColor(ticket.priority)}; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-size: 14px; font-weight: bold;"">{ticket.priority}</span></td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;""><strong>วันที่ต้องการ:</strong></td><td style=""padding: 10px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;"">{FormatThaiDateOnly(ticket.target_date)}</td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b;""><strong>สถานะ:</strong></td><td style=""padding: 10px 0;""><span style=""display: inline-block; background-color: {GetStatusColor(ticket.status)}; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-size: 14px; font-weight: bold;"">{GetStatusLabel(ticket.status)}</span></td></tr>
                    </table>
                </div>
                {button}
                {meta}
            </div>
            {Footer()}");
        return new EmailTemplate(subject, html);
    }

    /// <summary>ticketUpdatedTemplate - sent to the requester on status change.</summary>
    public EmailTemplate TicketUpdated(dynamic ticket, string userName, string changeDetails)
    {
        string reqId = ticket.req_id;
        string subject = $"[{reqId}] อัปเดตสถานะ: {ticket.project_name}";
        string changeRow = !string.IsNullOrEmpty(changeDetails)
            ? $@"<tr><td style=""padding: 10px 0; color: #64748b; border-top: 1px solid #f1f5f9;""><strong>รายละเอียดที่เปลี่ยน:</strong></td><td style=""padding: 10px 0; color: #0f172a; border-top: 1px solid #f1f5f9;"">{H(changeDetails)}</td></tr>"
            : "";
        string notesBlock = ticket.notes is string notes && !string.IsNullOrEmpty(notes)
            ? $@"<div style=""background-color: #f0fdf4; padding: 20px; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 4px; margin: 24px 0;"">
                    <p style=""margin-top: 0; color: #166534; font-weight: bold; font-size: 16px; {Font}"">บันทึกจากทีมงาน IT (Notes):</p>
                    <p style=""margin: 0; color: #15803d; font-size: 16px; line-height: 1.6; {Font}"">{H(notes)}</p>
                </div>"
            : "";
        string link = $"{_portalUrl}/?view=all&ticket={(int)ticket.id}";
        string header = Header("#3b82f6", "#2563eb", "📢 มีการอัปเดตสถานะเคสของคุณ");
        string button = Button(link, "ดูรายละเอียดทั้งหมด", "#2563eb");
        string meta = MetaFooter(reqId, "อัปเดตเมื่อ:", FormatThaiDateTime());
        string html = Wrap($@"{header}
            <div style=""background-color: #f8fafc; padding: 32px 24px;"">
                <p style=""color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0; {Font}"">สวัสดีคุณ {H(userName)},</p>
                <p style=""color: #334155; font-size: 16px; line-height: 1.6; {Font}"">เคสแจ้งปัญหา IT ของคุณมีการอัปเดตสถานะ โปรดดูรายละเอียดด้านล่าง</p>
                <div style=""background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; margin: 24px 0; border-radius: 4px;"">
                    <p style=""margin-top: 0; color: #1e293b; font-size: 16px; font-weight: bold; {Font}"">ข้อมูลการอัปเดต:</p>
                    <table style=""width: 100%; font-size: 16px; border-collapse: collapse; line-height: 1.6; {Font}"">
                        <tr><td style=""padding: 10px 0; color: #64748b; width: 35%; border-bottom: 1px solid #f1f5f9;""><strong>หมายเลขเคส:</strong></td><td style=""padding: 10px 0; color: #0f172a; font-weight: bold; border-bottom: 1px solid #f1f5f9;"">{reqId}</td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;""><strong>ปัญหา:</strong></td><td style=""padding: 10px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;"">{H(ticket.project_name)}</td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b;""><strong>สถานะใหม่:</strong></td><td style=""padding: 10px 0;""><span style=""display: inline-block; background-color: {GetStatusColor(ticket.status)}; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 14px;"">{GetStatusLabel(ticket.status)}</span></td></tr>
                        {changeRow}
                    </table>
                </div>
                {notesBlock}
                {button}
                {meta}
            </div>
            {Footer()}");
        return new EmailTemplate(subject, html);
    }

    /// <summary>ticketCommentTemplate - sent to requester when IT staff comments.</summary>
    public EmailTemplate TicketComment(dynamic ticket, string author, string comment)
    {
        string reqId = ticket.req_id;
        string requesterName = ticket.requester_name ?? "ผู้แจ้ง";
        string subject = $"[{reqId}] มีข้อความใหม่ในเคสของคุณ";
        string link = $"{_portalUrl}/?view=all&ticket={(int)ticket.id}";
        string header = Header("#8b5cf6", "#6d28d9", "💬 มีข้อความใหม่ (Comment)");
        string button = Button(link, "ตอบกลับในระบบ", "#7c3aed");
        string meta = MetaFooter(reqId, "อัปเดตเมื่อ:", FormatThaiDateTime());
        string html = Wrap($@"{header}
            <div style=""background-color: #f8fafc; padding: 32px 24px;"">
                <p style=""color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0; {Font}"">สวัสดีคุณ {H(requesterName)},</p>
                <p style=""color: #334155; font-size: 16px; line-height: 1.6; {Font}""><strong>{H(author)}</strong> ได้เพิ่มข้อความใหม่ในเคสของคุณ</p>
                <div style=""background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-left: 4px solid #8b5cf6; margin: 24px 0; border-radius: 4px;"">
                    <p style=""margin-top: 0; margin-bottom: 8px; color: #64748b; font-size: 16px; {Font}""><strong>หมายเลขเคส:</strong> <span style=""color: #0f172a;"">{reqId}</span></p>
                    <p style=""margin-top: 0; margin-bottom: 16px; color: #64748b; font-size: 16px; {Font}""><strong>ปัญหา:</strong> <span style=""color: #0f172a;"">{H(ticket.project_name)}</span></p>
                    <p style=""margin-top: 0; margin-bottom: 8px; color: #64748b; font-size: 16px; {Font}""><strong>ข้อความ:</strong></p>
                    <div style=""background-color: #f1f5f9; padding: 20px; border-radius: 6px; color: #334155; font-size: 16px; line-height: 1.6; border: 1px solid #e2e8f0; {Font}"">{H(comment)}</div>
                </div>
                {button}
                {meta}
            </div>
            {Footer()}");
        return new EmailTemplate(subject, html);
    }

    /// <summary>ticketAssignedTemplate - sent to the IT staff member assigned.</summary>
    public EmailTemplate TicketAssigned(dynamic ticket, string staffName)
    {
        string reqId = ticket.req_id;
        string subject = $"[{reqId}] มีเคสใหม่มอบหมายให้คุณ";
        string notesBlock = ticket.notes is string notes && !string.IsNullOrEmpty(notes)
            ? $@"<div style=""background-color: #fffbeb; padding: 20px; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 24px 0;"">
                    <p style=""margin-top: 0; color: #b45309; font-weight: bold; font-size: 16px; {Font}"">บันทึก/รายละเอียดเพิ่มเติม:</p>
                    <p style=""margin: 0; color: #92400e; font-size: 16px; line-height: 1.6; {Font}"">{H(notes)}</p>
                </div>"
            : "";
        string link = $"{_portalUrl}/?view=all&ticket={(int)ticket.id}";
        string header = Header("#d97706", "#b45309", "🎯 เคสใหม่ถูกมอบหมายให้คุณ");
        string button = Button(link, "ตรวจสอบเคสของคุณ", "#b45309");
        string meta = MetaFooter(reqId, "มอบหมายเมื่อ:", FormatThaiDateTime());
        string html = Wrap($@"{header}
            <div style=""background-color: #f8fafc; padding: 32px 24px;"">
                <p style=""color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0; {Font}"">สวัสดีคุณ {H(staffName)},</p>
                <p style=""color: #334155; font-size: 16px; line-height: 1.6; {Font}"">มีงานแจ้งซ่อม IT ใหม่ถูกจ่ายงานมาที่คุณ กรุณาตรวจสอบและดำเนินการ</p>
                <div style=""background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; margin: 24px 0; border-radius: 4px;"">
                    <p style=""margin-top: 0; color: #1e293b; font-size: 16px; font-weight: bold; {Font}"">รายละเอียดเคส:</p>
                    <table style=""width: 100%; font-size: 16px; border-collapse: collapse; line-height: 1.6; {Font}"">
                        <tr><td style=""padding: 10px 0; color: #64748b; width: 35%; border-bottom: 1px solid #f1f5f9;""><strong>หมายเลขเคส:</strong></td><td style=""padding: 10px 0; color: #0f172a; font-weight: bold; border-bottom: 1px solid #f1f5f9;"">{reqId}</td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;""><strong>ผู้แจ้ง:</strong></td><td style=""padding: 10px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;"">{H(ticket.requester_name)}</td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;""><strong>ประเภทคำขอ:</strong></td><td style=""padding: 10px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;"">{ticket.problem_type_name ?? ticket.request_type}</td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;""><strong>ปัญหา:</strong></td><td style=""padding: 10px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;"">{H(ticket.project_name)}</td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;""><strong>สถานที่:</strong></td><td style=""padding: 10px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;"">{H(ticket.location)}</td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;""><strong>ความเร่งด่วน:</strong></td><td style=""padding: 10px 0; border-bottom: 1px solid #f1f5f9;""><span style=""display: inline-block; background-color: {GetPriorityColor(ticket.priority)}; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 14px;"">{ticket.priority}</span></td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b;""><strong>วันที่ต้องการ:</strong></td><td style=""padding: 10px 0; color: #0f172a;"">{FormatThaiDateOnly(ticket.target_date)}</td></tr>
                    </table>
                </div>
                {notesBlock}
                {button}
                {meta}
            </div>
            {Footer()}");
        return new EmailTemplate(subject, html);
    }

    /// <summary>ticketCompletedTemplate - sent to requester when ticket is closed.</summary>
    public EmailTemplate TicketCompleted(dynamic ticket, string userName)
    {
        string reqId = ticket.req_id;
        string subject = $"[{reqId}] ปิดเคสสำเร็จ (COMPLETED): {ticket.project_name}";
        string rootCauseRow = ticket.root_cause is string rc && !string.IsNullOrEmpty(rc)
            ? $@"<tr><td style=""padding: 10px 0; color: #64748b; vertical-align: top; border-top: 1px solid #f1f5f9;""><strong>สาเหตุของปัญหา:</strong></td><td style=""padding: 10px 0; color: #b45309; font-weight: bold; border-top: 1px solid #f1f5f9;"">{H(rc)}</td></tr>"
            : "";
        string solutionRow = ticket.solution is string sol && !string.IsNullOrEmpty(sol)
            ? $@"<tr><td style=""padding: 10px 0; color: #64748b; vertical-align: top; border-top: 1px solid #f1f5f9;""><strong>วิธีการแก้ไข:</strong></td><td style=""padding: 10px 0; color: #15803d; font-weight: bold; border-top: 1px solid #f1f5f9;"">{H(sol)}</td></tr>"
            : "";
        string notesBlock = ticket.notes is string notes && !string.IsNullOrEmpty(notes)
            ? $@"<div style=""background-color: #f0fdf4; padding: 20px; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 4px; margin: 24px 0;"">
                    <p style=""margin-top: 0; color: #166534; font-weight: bold; font-size: 16px; {Font}"">บันทึกส่งท้าย (Notes):</p>
                    <p style=""margin: 0; color: #15803d; font-size: 16px; line-height: 1.6; {Font}"">{H(notes)}</p>
                </div>"
            : "";
        object? completedAt = ticket.completed_at;
        string link = $"{_portalUrl}/?view=all&ticket={(int)ticket.id}";
        string header = Header("#059669", "#047857", "✅ แก้ไขปัญหาเสร็จสิ้น");
        string button = Button(link, "ดูประวัติ", "#047857");
        string meta = MetaFooter(reqId, "ปิดเคสเมื่อ:", FormatThaiDateTime(completedAt));
        string html = Wrap($@"{header}
            <div style=""background-color: #f8fafc; padding: 32px 24px;"">
                <p style=""color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0; {Font}"">สวัสดีคุณ {H(userName)},</p>
                <p style=""color: #334155; font-size: 16px; line-height: 1.6; {Font}"">ทีมงาน IT ได้ดำเนินการแก้ไขปัญหาของคุณเรียบร้อยแล้ว และทำการปิดเคส</p>
                <div style=""background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; margin: 24px 0; border-radius: 4px;"">
                    <p style=""margin-top: 0; color: #1e293b; font-size: 16px; font-weight: bold; {Font}"">ข้อมูลการปิดเคส:</p>
                    <table style=""width: 100%; font-size: 16px; border-collapse: collapse; line-height: 1.6; {Font}"">
                        <tr><td style=""padding: 10px 0; color: #64748b; width: 35%; border-bottom: 1px solid #f1f5f9;""><strong>หมายเลขเคส:</strong></td><td style=""padding: 10px 0; color: #0f172a; font-weight: bold; border-bottom: 1px solid #f1f5f9;"">{reqId}</td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;""><strong>ปัญหาที่แจ้ง:</strong></td><td style=""padding: 10px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9;"">{H(ticket.project_name)}</td></tr>
                        <tr><td style=""padding: 10px 0; color: #64748b;""><strong>สถานะ:</strong></td><td style=""padding: 10px 0;""><span style=""display: inline-block; background-color: #047857; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 14px;"">✅ CLOSED</span></td></tr>
                        {rootCauseRow}
                        {solutionRow}
                        <tr><td style=""padding: 10px 0; color: #64748b; border-top: 1px solid #f1f5f9;""><strong>วันที่ปิดเคส:</strong></td><td style=""padding: 10px 0; color: #0f172a; border-top: 1px solid #f1f5f9;"">{FormatThaiDateTime(completedAt)}</td></tr>
                    </table>
                </div>
                {notesBlock}
                <p style=""margin-top: 24px; color: #334155; font-size: 16px; line-height: 1.6; {Font}"">หากคุณพบปัญหาเพิ่มเติมหรือต้องการความช่วยเหลืออื่นๆ สามารถแจ้งเคสใหม่ผ่านระบบได้เสมอ</p>
                {button}
                {meta}
            </div>
            {Footer()}");
        return new EmailTemplate(subject, html);
    }
}