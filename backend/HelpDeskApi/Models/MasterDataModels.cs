using System.Text.Json.Serialization;

namespace HelpDeskApi.Models;

public class MasterItemCreateRequest
{
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("icon")] public string? Icon { get; set; }
    [JsonPropertyName("parent_id")] public int? ParentId { get; set; }
}

public class MasterItemUpdateRequest
{
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("icon")] public string? Icon { get; set; }
    [JsonPropertyName("is_active")] public bool? IsActive { get; set; }
}
