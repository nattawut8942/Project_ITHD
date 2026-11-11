using Dapper;
using HelpDeskApi.Authorization;
using HelpDeskApi.Data;
using HelpDeskApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HelpDeskApi.Controllers;

/// <summary>Port of backend/src/controller/masterDataController.js</summary>
[ApiController]
[Route("api/master")]
[Authorize]
public class MasterDataController : ControllerBase
{
    private readonly DbConnectionFactory _db;

    // Same whitelist as the Node `tables` map - prevents arbitrary table names reaching SQL.
    private static readonly Dictionary<string, string> Tables = new()
    {
        ["problem_types"] = "dbo.ithd_problem_types",
        ["problem_subtypes"] = "dbo.ithd_problem_subtypes",
        ["locations"] = "dbo.ithd_locations",
        ["sub_locations"] = "dbo.ithd_sub_locations",
        ["device_types"] = "dbo.ithd_device_types",
    };

    public MasterDataController(DbConnectionFactory db) => _db = db;

    [HttpGet("problem-types")]
    public async Task<IActionResult> GetProblemTypes()
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var data = await conn.QueryAsync($"SELECT * FROM {Tables["problem_types"]} WHERE is_active=1 ORDER BY sort_order, id");
            return Ok(ApiResponse<object>.Ok(data));
        }
        catch (Exception e) { return StatusCode(500, ApiResponse.Fail(e.Message)); }
    }

    [HttpGet("problem-subtypes/{typeId?}")]
    public async Task<IActionResult> GetProblemSubtypes(int? typeId)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var sql = $"SELECT * FROM {Tables["problem_subtypes"]} WHERE is_active=1 " +
                      (typeId.HasValue ? "AND type_id=@typeId " : "") + "ORDER BY sort_order, id";
            var data = await conn.QueryAsync(sql, new { typeId = typeId ?? 0 });
            return Ok(ApiResponse<object>.Ok(data));
        }
        catch (Exception e) { return StatusCode(500, ApiResponse.Fail(e.Message)); }
    }

    [HttpGet("locations")]
    public async Task<IActionResult> GetLocations()
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var data = await conn.QueryAsync($"SELECT * FROM {Tables["locations"]} WHERE is_active=1 ORDER BY sort_order, id");
            return Ok(ApiResponse<object>.Ok(data));
        }
        catch (Exception e) { return StatusCode(500, ApiResponse.Fail(e.Message)); }
    }

    [HttpGet("sub-locations/{locationId?}")]
    public async Task<IActionResult> GetSubLocations(int? locationId)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var sql = $"SELECT * FROM {Tables["sub_locations"]} WHERE is_active=1 " +
                      (locationId.HasValue ? "AND location_id=@locationId " : "") + "ORDER BY sort_order, id";
            var data = await conn.QueryAsync(sql, new { locationId = locationId ?? 0 });
            return Ok(ApiResponse<object>.Ok(data));
        }
        catch (Exception e) { return StatusCode(500, ApiResponse.Fail(e.Message)); }
    }

    // GET /api/masterdata/it-staff - note: no filterByEmpCode requirement in the original route, verifyToken only
    [HttpGet("it-staff")]
    public async Task<IActionResult> GetItStaff()
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var data = await conn.QueryAsync(
                "SELECT empCode, name, email FROM dbo.ithd_users WHERE cost_center = '7510' ORDER BY name");
            return Ok(ApiResponse<object>.Ok(data));
        }
        catch (Exception)
        {
            return StatusCode(500, ApiResponse.Fail("Failed to fetch IT staff"));
        }
    }

    [HttpGet("device-types")]
    public async Task<IActionResult> GetDeviceTypes()
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var data = await conn.QueryAsync($"SELECT * FROM {Tables["device_types"]} WHERE is_active=1 ORDER BY sort_order, id");
            return Ok(ApiResponse<object>.Ok(data));
        }
        catch (Exception e) { return StatusCode(500, ApiResponse.Fail(e.Message)); }
    }

    // GET /api/masterdata/all - everything needed for the Open Ticket modal, in one round trip
    [HttpGet("all")]
    public async Task<IActionResult> GetAllMasterData()
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();

            // Must await each query before starting the next - QueryAsync begins executing
            // as soon as it's called (not lazily on await), and a single SqlConnection can't
            // run overlapping commands unless MARS is enabled ("MultipleActiveResultSets=true"
            // in the connection string). Awaiting sequentially avoids needing MARS at all.
            var typesResult = await conn.QueryAsync($"SELECT * FROM {Tables["problem_types"]} WHERE is_active=1 ORDER BY sort_order, id");
            var subtypesResult = await conn.QueryAsync($"SELECT * FROM {Tables["problem_subtypes"]} WHERE is_active=1 ORDER BY sort_order, id");
            var locsResult = await conn.QueryAsync($"SELECT * FROM {Tables["locations"]} WHERE is_active=1 ORDER BY sort_order, id");
            var sublocsResult = await conn.QueryAsync($"SELECT * FROM {Tables["sub_locations"]} WHERE is_active=1 ORDER BY sort_order, id");
            var devicesResult = await conn.QueryAsync($"SELECT * FROM {Tables["device_types"]} WHERE is_active=1 ORDER BY sort_order, id");

            return Ok(ApiResponse<object>.Ok(new
            {
                problemTypes = typesResult,
                problemSubtypes = subtypesResult,
                locations = locsResult,
                subLocations = sublocsResult,
                deviceTypes = devicesResult
            }));
        }
        catch (Exception e) { return StatusCode(500, ApiResponse.Fail(e.Message)); }
    }

    // ── CRUD helpers (admin only, checked via [RequirePermission("master.edit")]) ──────────────

    [HttpPost("{table}")]
    [RequirePermission("master.edit")]
    public async Task<IActionResult> CreateMasterItem(string table, [FromBody] MasterItemCreateRequest body)
    {
        if (!Tables.TryGetValue(table, out var tbl))
            return BadRequest(ApiResponse.Fail("Invalid table"));
        if (string.IsNullOrWhiteSpace(body?.Name))
            return BadRequest(ApiResponse.Fail("name is required"));

        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var name = body.Name.Trim();
            int newId;

            if (table == "problem_subtypes")
            {
                newId = await conn.ExecuteScalarAsync<int>(
                    $@"INSERT INTO {tbl} (type_id, name, sort_order)
                       VALUES (@parentId, @name, (SELECT ISNULL(MAX(sort_order),0)+1 FROM {tbl} WHERE type_id=@parentId));
                       SELECT CAST(SCOPE_IDENTITY() AS INT)",
                    new { parentId = body.ParentId, name });
            }
            else if (table == "sub_locations")
            {
                newId = await conn.ExecuteScalarAsync<int>(
                    $@"INSERT INTO {tbl} (location_id, name, sort_order)
                       VALUES (@parentId, @name, (SELECT ISNULL(MAX(sort_order),0)+1 FROM {tbl} WHERE location_id=@parentId));
                       SELECT CAST(SCOPE_IDENTITY() AS INT)",
                    new { parentId = body.ParentId, name });
            }
            else if (!string.IsNullOrEmpty(body.Icon))
            {
                newId = await conn.ExecuteScalarAsync<int>(
                    $@"INSERT INTO {tbl} (name, icon, sort_order)
                       VALUES (@name, @icon, (SELECT ISNULL(MAX(sort_order),0)+1 FROM {tbl}));
                       SELECT CAST(SCOPE_IDENTITY() AS INT)",
                    new { name, icon = body.Icon });
            }
            else
            {
                newId = await conn.ExecuteScalarAsync<int>(
                    $@"INSERT INTO {tbl} (name, sort_order)
                       VALUES (@name, (SELECT ISNULL(MAX(sort_order),0)+1 FROM {tbl}));
                       SELECT CAST(SCOPE_IDENTITY() AS INT)",
                    new { name });
            }

            return StatusCode(201, new { success = true, id = newId });
        }
        catch (Exception e) { return StatusCode(500, ApiResponse.Fail(e.Message)); }
    }

    [HttpPut("{table}/{id:int}")]
    [RequirePermission("master.edit")]
    public async Task<IActionResult> UpdateMasterItem(string table, int id, [FromBody] MasterItemUpdateRequest body)
    {
        if (!Tables.TryGetValue(table, out var tbl))
            return BadRequest(ApiResponse.Fail("Invalid table"));

        var fields = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("id", id);

        if (body.Name != null) { parameters.Add("name", body.Name); fields.Add("name=@name"); }
        if (body.Icon != null) { parameters.Add("icon", body.Icon); fields.Add("icon=@icon"); }
        if (body.IsActive.HasValue) { parameters.Add("is_active", body.IsActive.Value); fields.Add("is_active=@is_active"); }

        if (fields.Count == 0)
            return BadRequest(ApiResponse.Fail("No fields to update"));

        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            await conn.ExecuteAsync($"UPDATE {tbl} SET {string.Join(",", fields)} WHERE id=@id", parameters);
            return Ok(ApiResponse.Ok());
        }
        catch (Exception e) { return StatusCode(500, ApiResponse.Fail(e.Message)); }
    }

    [HttpDelete("{table}/{id:int}")]
    [RequirePermission("master.edit")]
    public async Task<IActionResult> DeleteMasterItem(string table, int id)
    {
        if (!Tables.TryGetValue(table, out var tbl))
            return BadRequest(ApiResponse.Fail("Invalid table"));

        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            await conn.ExecuteAsync($"UPDATE {tbl} SET is_active=0 WHERE id=@id", new { id });
            return Ok(ApiResponse.Ok());
        }
        catch (Exception e) { return StatusCode(500, ApiResponse.Fail(e.Message)); }
    }

    // PUT /api/master/{table}/{id}/move  body: { "direction": "up" | "down" }
    [HttpPut("{table}/{id:int}/move")]
    [RequirePermission("master.edit")]
    public async Task<IActionResult> MoveMasterItem(string table, int id, [FromBody] MasterItemMoveRequest body)
    {
        if (!Tables.TryGetValue(table, out var tbl))
            return BadRequest(ApiResponse.Fail("Invalid table"));
        if (body?.Direction != "up" && body?.Direction != "down")
            return BadRequest(ApiResponse.Fail("direction must be 'up' or 'down'"));

        // รายการที่มีพ่อ ให้สลับกันเฉพาะในกลุ่มเดียวกัน
        var parentCol = table switch
        {
            "problem_subtypes" => "type_id",
            "sub_locations" => "location_id",
            _ => null
        };

        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            using var tx = conn.BeginTransaction();

            var scope = parentCol == null
                ? ""
                : $"AND {parentCol} = (SELECT {parentCol} FROM {tbl} WHERE id=@id)";

            var ids = (await conn.QueryAsync<int>(
                $"SELECT id FROM {tbl} WHERE is_active=1 {scope} ORDER BY sort_order, id",
                new { id }, tx)).ToList();

            var idx = ids.IndexOf(id);
            var target = body.Direction == "up" ? idx - 1 : idx + 1;
            if (idx < 0 || target < 0 || target >= ids.Count)
                return Ok(ApiResponse.Ok());   // อยู่ขอบสุดแล้ว ไม่ต้องทำอะไร

            (ids[idx], ids[target]) = (ids[target], ids[idx]);

            // เขียน sort_order ใหม่ทั้งกลุ่ม (กันกรณีค่าซ้ำ)
            for (int i = 0; i < ids.Count; i++)
                await conn.ExecuteAsync($"UPDATE {tbl} SET sort_order=@o WHERE id=@id",
                    new { o = i + 1, id = ids[i] }, tx);

            tx.Commit();
            return Ok(ApiResponse.Ok());
        }
        catch (Exception e) { return StatusCode(500, ApiResponse.Fail(e.Message)); }
    }

    // PUT /api/master/{table}/reorder  body: { "ids": [3,1,2] }  (ลำดับใหม่ของรายการในกลุ่มเดียวกัน)
    [HttpPut("{table}/reorder")]
    [RequirePermission("master.edit")]
    public async Task<IActionResult> ReorderMasterItems(string table, [FromBody] MasterItemReorderRequest body)
    {
        if (!Tables.TryGetValue(table, out var tbl))
            return BadRequest(ApiResponse.Fail("Invalid table"));

        var ids = body?.Ids?.Distinct().ToList() ?? new List<int>();
        if (ids.Count == 0)
            return BadRequest(ApiResponse.Fail("ids is required"));

        var parentCol = table switch
        {
            "problem_subtypes" => "type_id",
            "sub_locations" => "location_id",
            _ => null
        };

        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            using var tx = conn.BeginTransaction();

            var found = await conn.ExecuteScalarAsync<int>(
                $"SELECT COUNT(*) FROM {tbl} WHERE id IN @ids", new { ids }, tx);
            if (found != ids.Count)
                return BadRequest(ApiResponse.Fail("Some ids were not found"));

            if (parentCol != null)
            {
                var groups = await conn.ExecuteScalarAsync<int>(
                    $"SELECT COUNT(DISTINCT {parentCol}) FROM {tbl} WHERE id IN @ids", new { ids }, tx);
                if (groups > 1)
                    return BadRequest(ApiResponse.Fail("Items must belong to the same parent"));
            }

            for (int i = 0; i < ids.Count; i++)
                await conn.ExecuteAsync($"UPDATE {tbl} SET sort_order=@o WHERE id=@id",
                    new { o = i + 1, id = ids[i] }, tx);

            tx.Commit();
            return Ok(ApiResponse.Ok());
        }
        catch (Exception e) { return StatusCode(500, ApiResponse.Fail(e.Message)); }
    }
}

public class MasterItemMoveRequest
{
    public string Direction { get; set; } = "";   // "up" | "down"
}

public class MasterItemReorderRequest
{
    public List<int> Ids { get; set; } = new();
}