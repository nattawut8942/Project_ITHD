using System.Text.Json.Serialization;

namespace HelpDeskApi.Models;

/// <summary>POST /api/tickets body - matches createTicket destructuring.</summary>
public class CreateTicketRequest
{
    [JsonPropertyName("request_type")] public string? RequestType { get; set; }
    [JsonPropertyName("project_name")] public string? ProjectName { get; set; }
    [JsonPropertyName("device_type")] public string? DeviceType { get; set; }
    [JsonPropertyName("device_count")] public int? DeviceCount { get; set; }
    [JsonPropertyName("location")] public string? Location { get; set; }
    [JsonPropertyName("priority")] public string? Priority { get; set; }
    [JsonPropertyName("target_date")] public DateTime? TargetDate { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("phone_internal")] public string? PhoneInternal { get; set; }
    [JsonPropertyName("phone_personal")] public string? PhonePersonal { get; set; }
    [JsonPropertyName("emp_pic_url")] public string? EmpPicUrl { get; set; }
    [JsonPropertyName("attachments")] public object? Attachments { get; set; }
    [JsonPropertyName("problem_type_id")] public int? ProblemTypeId { get; set; }
    [JsonPropertyName("problem_subtype_id")] public int? ProblemSubtypeId { get; set; }
    [JsonPropertyName("problem_type_name")] public string? ProblemTypeName { get; set; }
    [JsonPropertyName("problem_subtype_name")] public string? ProblemSubtypeName { get; set; }
}

/// <summary>PUT /api/tickets/:ticketId body - matches updateTicket destructuring.</summary>
public class UpdateTicketRequest
{
    [JsonPropertyName("status")] public string? Status { get; set; }
    [JsonPropertyName("empCode_assigned")] public string? EmpCodeAssigned { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("comment")] public string? Comment { get; set; }
    [JsonPropertyName("root_cause")] public string? RootCause { get; set; }
    [JsonPropertyName("solution")] public string? Solution { get; set; }
    [JsonPropertyName("hold_reason")] public string? HoldReason { get; set; }
    [JsonPropertyName("expected_at")] public DateTime? ExpectedAt { get; set; }
    [JsonPropertyName("priority")] public string? Priority { get; set; }

    /// <summary>Stock items to withdraw and attach to this ticket, only used when Status == "Closed".</summary>
    [JsonPropertyName("stock_items")] public List<TicketStockItemRequest>? StockItems { get; set; }

    // ── Safety checklist (required when Status == "Closed") ──────────────
    /// <summary>ปลั๊กไฟ OK - power plug checked and safe.</summary>
    [JsonPropertyName("safety_plug_ok")] public bool? SafetyPlugOk { get; set; }
    /// <summary>สายไฟ OK - power cable checked and safe.</summary>
    [JsonPropertyName("safety_cable_ok")] public bool? SafetyCableOk { get; set; }
    /// <summary>พื้นที่ปฏิบัติงาน OK - work area left clean and safe.</summary>
    [JsonPropertyName("safety_area_ok")] public bool? SafetyAreaOk { get; set; }
}

public class AddCommentRequest
{
    [JsonPropertyName("comment")] public string? Comment { get; set; }
}

public class AddHelperRequest
{
    [JsonPropertyName("empCode")] public string? EmpCode { get; set; }
}

/// <summary>Small typed shape used only to read the fields ticket-update logic needs
/// out of the dynamic "SELECT *" row, without hand-typing the whole ithd_tickets table.</summary>
public class TicketRow
{
    public int Id { get; set; }
    public string? Req_Id { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? EmpCode_Created { get; set; }
    public string? EmpCode_Assigned { get; set; }
    public string? Requester_Name { get; set; }
    public string? Requester_Email { get; set; }
    public string? Project_Name { get; set; }
    public DateTime? Accepted_At { get; set; }
}
