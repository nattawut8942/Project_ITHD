using System.Text.Json.Serialization;

namespace HelpDeskApi.Models;

/// <summary>
/// One line item the frontend sends when closing a ticket with stock items attached.
/// Field names mirror what the Stock system's /products/withdraw expects, minus the
/// fields (EmployeeCode/EmployeeName/CostCenter/UserID) that the Helpdesk backend fills
/// in itself from the logged-in IT staff member's JWT claims.
/// </summary>
/// <summary>Matches Stock's GET /device-types response (TypeId, Label).</summary>
public class FlexibleStringConverter : System.Text.Json.Serialization.JsonConverter<string>
{
    public override string? Read(ref System.Text.Json.Utf8JsonReader reader, Type typeToConvert, System.Text.Json.JsonSerializerOptions options)
    {
        return reader.TokenType switch
        {
            System.Text.Json.JsonTokenType.String => reader.GetString(),
            System.Text.Json.JsonTokenType.Number => reader.TryGetInt64(out var l) ? l.ToString() : reader.GetDouble().ToString(),
            System.Text.Json.JsonTokenType.Null => null,
            _ => null
        };
    }

    public override void Write(System.Text.Json.Utf8JsonWriter writer, string value, System.Text.Json.JsonSerializerOptions options)
        => writer.WriteStringValue(value);
}

/// <summary>Matches Stock's GET /types response (TypeId, Label).</summary>
public class StockDeviceTypeDto
{
    [JsonPropertyName("TypeId"), System.Text.Json.Serialization.JsonConverter(typeof(FlexibleStringConverter))]
    public string TypeId { get; set; } = "";

    [JsonPropertyName("Label")] public string? Label { get; set; }
}

/// <summary>Matches the exact columns Stock's GET /products returns (see productController.js's getProducts).</summary>
public class StockProductDto
{
    [JsonPropertyName("ProductID")] public int ProductID { get; set; }
    [JsonPropertyName("ProductName")] public string? ProductName { get; set; }
    [JsonPropertyName("DeviceType")] public string? DeviceType { get; set; }
    [JsonPropertyName("MinStock")] public int? MinStock { get; set; }
    [JsonPropertyName("MaxStock")] public int? MaxStock { get; set; }
    [JsonPropertyName("CurrentStock")] public int CurrentStock { get; set; }
    [JsonPropertyName("LastPrice")] public decimal? LastPrice { get; set; }
    [JsonPropertyName("UnitOfMeasure")] public string? UnitOfMeasure { get; set; }
    [JsonPropertyName("IsActive")] public bool IsActive { get; set; }
    [JsonPropertyName("ImageURL")] public string? ImageURL { get; set; }
    [JsonPropertyName("Location")] public string? Location { get; set; }
    [JsonPropertyName("BarcodeID")] public string? BarcodeID { get; set; }
}

public class TicketStockItemRequest
{
    [JsonPropertyName("productId")] public int ProductId { get; set; }
    [JsonPropertyName("productName")] public string? ProductName { get; set; } // for display/logging only
    [JsonPropertyName("qty")] public int Qty { get; set; }
    [JsonPropertyName("deviceType")] public string? DeviceType { get; set; }
    [JsonPropertyName("serialNumber")] public string? SerialNumber { get; set; }
    [JsonPropertyName("fixedAssetCode")] public string? FixedAssetCode { get; set; }
}

/// <summary>Body sent to the Stock system's POST /products/withdraw - field names/casing
/// must match exactly what productController.js's withdrawProduct destructures.</summary>
public class StockWithdrawRequest
{
    [JsonPropertyName("ProductID")] public int ProductID { get; set; }
    [JsonPropertyName("Qty")] public int Qty { get; set; }
    [JsonPropertyName("UserID")] public string UserID { get; set; } = "";
    [JsonPropertyName("RefInfo")] public string RefInfo { get; set; } = "";
    [JsonPropertyName("EmployeeCode")] public string? EmployeeCode { get; set; }
    [JsonPropertyName("EmployeeName")] public string? EmployeeName { get; set; }
    [JsonPropertyName("CostCenter")] public string? CostCenter { get; set; }
    [JsonPropertyName("SerialNumber")] public string? SerialNumber { get; set; }
    [JsonPropertyName("FixedAssetCode")] public string? FixedAssetCode { get; set; }
}

public record StockWithdrawResult(bool Success, string? Error);
