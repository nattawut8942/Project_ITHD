namespace HelpDeskApi.Models;

/// <summary>
/// คำที่แสดงให้ผู้ใช้เห็นเป็นภาษาไทย (ใช้ในประวัติเคส) ค่าที่เก็บในฐานข้อมูลยังเป็นภาษาอังกฤษเหมือนเดิม
/// </summary>
public static class ThaiLabels
{
    public static string Status(string? status) => status switch
    {
        "Open" or "Pending" => "รอรับเรื่อง",
        "In Progress" => "กำลังดำเนินการ",
        "On Hold" => "พักไว้",
        "Closed" or "Completed" => "ปิดแล้ว",
        "Rejected" => "ปฏิเสธ",
        "Cancelled" => "ยกเลิก",
        _ => status ?? "-"
    };

    public static string Priority(string? priority) => priority switch
    {
        "Low" => "รอได้",
        "Normal" => "ปกติ",
        "Medium" => "ปานกลาง",
        "High" => "ด่วน",
        "Critical" => "วิกฤต",
        _ => priority ?? "-"
    };
}
