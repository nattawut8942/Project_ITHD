using Dapper;
using HelpDeskApi.Authorization;
using HelpDeskApi.Data;
using HelpDeskApi.Hubs;
using HelpDeskApi.Models;
using HelpDeskApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection;

namespace HelpDeskApi.Controllers;

/// <summary>Port of backend/src/controller/ticketController.js</summary>
[ApiController]
[Route("api")]
public class TicketController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly EmailService _emailService;
    private readonly EmailTemplates _templates;
    private readonly UserService _userService;
    private readonly EmailLogService _emailLogService;
    private readonly IHubContext<TicketHub> _hub;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly StockApiService _stockApi;

    public TicketController(DbConnectionFactory db, EmailService emailService, EmailTemplates templates,
        UserService userService, EmailLogService emailLogService, IHubContext<TicketHub> hub,
        IServiceScopeFactory scopeFactory, StockApiService stockApi)
    {
        _db = db;
        _emailService = emailService;
        _templates = templates;
        _userService = userService;
        _emailLogService = emailLogService;
        _hub = hub;
        _scopeFactory = scopeFactory;
        _stockApi = stockApi;
    }

    /// <summary>
    /// Sends an email and logs the result completely in the background, so the HTTP
    /// response to the user never waits on the SMTP relay. Uses its own DI scope because
    /// the controller's request-scoped services are disposed as soon as this method's
    /// caller returns a response - reusing them here would risk ObjectDisposedException.
    /// </summary>
    private void FireAndForgetEmail(int ticketId, string? to, string subject, string html, string action)
    {
        _ = Task.Run(async () =>
        {
            using var scope = _scopeFactory.CreateScope();
            var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();
            var emailLogService = scope.ServiceProvider.GetRequiredService<EmailLogService>();
            try
            {
                var result = await emailService.SendEmailAsync(to, subject, html);
                await emailLogService.LogEmailAsync(ticketId, to ?? "", action, subject,
                    result.Success ? "Sent" : "Failed", result.MessageId, result.Success ? null : result.Error);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Background email send failed ({action}, ticket {ticketId}): {ex.Message}");
            }
        });
    }

    /// <summary>Same wall-clock convention as getBangkokNow() in the Node app: "now" expressed
    /// as Bangkok local time, stored as a plain (naive) DateTime into DATETIME columns.</summary>
    private static DateTime GetBangkokNow()
    {
        var tz = TimeZoneInfo.FindSystemTimeZoneById(OperatingSystem.IsWindows() ? "SE Asia Standard Time" : "Asia/Bangkok");
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
    }

    // GET /api/tickets  (auth required, but not filtered by empCode - matches original: query has no WHERE empCode)
    // Optional ?startDate=&endDate= look further back than the 180-day default
    // (only affects Closed/Rejected/Cancelled tickets - active ones always show).
    // Optional ?search= matches project name, ticket no., location, or requester name.
    [HttpGet("tickets")]
    [Authorize]
    public Task<IActionResult> GetTickets([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null, [FromQuery] string? search = null)
        => GetTicketsInternal(startDate, endDate, search, includeStockItems: true);

    // GET /api/tv/tickets  (public, for the TV Monitor board) - always just the current
    // default window; the board only ever needs to know about active tickets anyway.
    [HttpGet("tv/tickets")]
    [AllowAnonymous]
    public Task<IActionResult> GetTicketsForTv() => GetTicketsInternal(null, null, null, includeStockItems: false);

    private async Task<IActionResult> GetTicketsInternal(DateTime? startDate, DateTime? endDate, string? search, bool includeStockItems)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();

            // Bound the query so it can't grow unbounded forever as the system
            // accumulates years of history: any ticket that's still active
            // (not Closed/Rejected/Cancelled) is always included regardless of
            // age, since those need to stay visible until resolved. Finished
            // tickets are only included within a date window - the last 180
            // days by default, or an explicit range via ?startDate=&endDate=
            // for pulling in older history on demand.
            var effectiveStart = startDate ?? GetBangkokNow().AddDays(-180);
            var effectiveEnd = endDate ?? GetBangkokNow();

            var sql = @"
                SELECT
                    t.*,
                    u.name AS assigned_name,
                    (
                      SELECT STRING_AGG(a.empCode + '|' + ISNULL(a.name,''), ',')
                      FROM dbo.ithd_ticket_assignees a
                      WHERE a.ticket_id = t.id
                    ) AS helpers_raw
                FROM dbo.ithd_tickets t
                LEFT JOIN dbo.ithd_users u ON t.empCode_assigned = u.empCode
                WHERE (
                    t.status NOT IN ('Closed', 'Rejected', 'Cancelled')
                    OR (t.created_at >= @effectiveStart AND t.created_at <= @effectiveEnd)
                )";

            if (!string.IsNullOrWhiteSpace(search))
            {
                sql += @"
                    AND (
                        t.project_name LIKE @searchPattern
                        OR t.req_id LIKE @searchPattern
                        OR t.location LIKE @searchPattern
                        OR t.requester_name LIKE @searchPattern
                    )";
            }

            sql += " ORDER BY t.created_at DESC";

            var rows = await conn.QueryAsync(sql, new
            {
                effectiveStart,
                effectiveEnd,
                searchPattern = string.IsNullOrWhiteSpace(search) ? null : $"%{search.Trim()}%"
            });

            var tickets = rows.Select(r =>
            {
                var dict = (IDictionary<string, object>)r;
                string? helpersRaw = dict.TryGetValue("helpers_raw", out var hv) ? hv as string : null;
                dict["helpers"] = string.IsNullOrEmpty(helpersRaw)
                    ? new List<object>()
                    : helpersRaw.Split(',').Select(h =>
                    {
                        var parts = h.Split('|');
                        return (object)new { empCode = parts.ElementAtOrDefault(0), name = parts.ElementAtOrDefault(1) };
                    }).ToList();
                return dict;
            }).ToList();

            if (includeStockItems && tickets.Count > 0)
            {
                var ticketIds = tickets.Select(ticket => Convert.ToInt32(ticket["id"])).ToArray();
                var stockRows = await conn.QueryAsync(@"
                    SELECT s.*, u.name AS withdrawn_by_name
                    FROM dbo.ithd_ticket_stock_items s
                    LEFT JOIN dbo.ithd_users u ON s.withdrawn_by_empcode = u.empCode
                    WHERE s.ticket_id IN @ticketIds
                    ORDER BY s.withdrawn_at ASC",
                    new { ticketIds });
                var stockItemsByTicket = stockRows
                    .GroupBy(item => Convert.ToInt32(((IDictionary<string, object>)item)["ticket_id"]))
                    .ToDictionary(group => group.Key, group => group.Select(item => (object)item).ToList());

                foreach (var ticket in tickets)
                {
                    var ticketId = Convert.ToInt32(ticket["id"]);
                    ticket["stockItems"] = stockItemsByTicket.TryGetValue(ticketId, out var items)
                        ? items
                        : new List<object>();
                }
            }

            return Ok(ApiResponse<object>.Ok(tickets));
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Get tickets error: {ex}");
            return StatusCode(500, ApiResponse.Fail("Failed to fetch tickets"));
        }
    }

    // GET /api/it-staff  (kept here too since it was duplicated in the Node controller)
    [HttpGet("it-staff")]
    [Authorize]
    public async Task<IActionResult> GetItStaff()
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var data = await conn.QueryAsync(
                "SELECT empCode, name, email FROM dbo.ithd_users WHERE cost_center = '7510' ORDER BY name");
            return Ok(ApiResponse<object>.Ok(data));
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Get IT staff error: {ex}");
            return StatusCode(500, ApiResponse.Fail("Failed to fetch IT staff"));
        }
    }

    // GET /api/stock/products  (proxy to the Stock system, for the "attach stock item" picker on Close Ticket)
    [HttpGet("stock/products")]
    [Authorize]
    public async Task<IActionResult> GetStockProducts([FromQuery] string? search = null, [FromQuery] string? deviceType = null)
    {
        try
        {
            var products = await _stockApi.GetProductsAsync();

            if (!string.IsNullOrWhiteSpace(deviceType))
            {
                products = products.Where(p =>
                    string.Equals(p.DeviceType, deviceType, StringComparison.OrdinalIgnoreCase)
                ).ToList();
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var q = search.Trim();
                products = products.Where(p =>
                    !string.IsNullOrEmpty(p.ProductName) &&
                    p.ProductName.Contains(q, StringComparison.OrdinalIgnoreCase)
                ).ToList();
            }

            return Ok(ApiResponse<object>.Ok(products));
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Get stock products error: {ex}");
            return StatusCode(500, ApiResponse.Fail($"Failed to fetch stock products: {ex.Message}"));
        }
    }

    // GET /api/stock/device-types  (proxy to the Stock system, step 1 of the "attach stock item" picker)
    [HttpGet("stock/device-types")]
    [Authorize]
    public async Task<IActionResult> GetStockDeviceTypes()
    {
        try
        {
            var types = await _stockApi.GetDeviceTypesAsync();
            return Ok(ApiResponse<object>.Ok(types));
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Get stock device types error: {ex}");
            return StatusCode(500, ApiResponse.Fail($"Failed to fetch stock device types: {ex.Message}"));
        }
    }

    // GET /api/tickets/stats  (registered as a literal segment so it's matched before {ticketId:int})
    [HttpGet("tickets/stats")]
    [Authorize]
    public async Task<IActionResult> GetTicketStats()
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var stats = await conn.QueryFirstAsync(@"
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as completed
                FROM dbo.ithd_tickets");
            return Ok(ApiResponse<object>.Ok(stats));
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Get stats error: {ex}");
            return StatusCode(500, ApiResponse.Fail("Failed to fetch stats"));
        }
    }

    // GET /api/tickets/{ticketId}
    [HttpGet("tickets/{ticketId:int}")]
    [Authorize]
    public async Task<IActionResult> GetTicketById(int ticketId)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();

            var ticket = await conn.QueryFirstOrDefaultAsync(@"
                SELECT
                    t.*,
                    ru.sect AS requester_sect,
                    u.name AS assigned_name,
                    u.email AS assigned_email,
                    u.cost_center AS assigned_cost_center,
                    u.sect AS assigned_sect
                FROM dbo.ithd_tickets t
                LEFT JOIN dbo.ithd_users ru ON t.empCode_created = ru.empCode
                LEFT JOIN dbo.ithd_users u ON t.empCode_assigned = u.empCode
                WHERE t.id = @ticketId", new { ticketId });

            if (ticket == null)
                return NotFound(ApiResponse.Fail("Ticket not found"));

            var comments = await conn.QueryAsync(@"
    SELECT 
        c.id, 
        c.ticket_id, 
        c.empCode, 
        c.comment, 
        c.created_at,
        u.name AS commenter_name
    FROM dbo.ithd_comments c
    LEFT JOIN dbo.ithd_users u ON c.empCode = u.empCode
    WHERE c.ticket_id = @ticketId 
    ORDER BY c.created_at DESC",
     new { ticketId });

            var helpers = await conn.QueryAsync(
                "SELECT * FROM dbo.ithd_ticket_assignees WHERE ticket_id = @ticketId ORDER BY assigned_at ASC",
                new { ticketId });

            var stockItems = await conn.QueryAsync(
                "SELECT * FROM dbo.ithd_ticket_stock_items WHERE ticket_id = @ticketId ORDER BY withdrawn_at ASC",
                new { ticketId });

            var dict = (IDictionary<string, object>)ticket;
            dict["comments"] = comments;
            dict["helpers"] = helpers;
            dict["stockItems"] = stockItems;

            return Ok(ApiResponse<object>.Ok(dict));
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Get ticket error: {ex}");
            return StatusCode(500, ApiResponse.Fail("Failed to fetch ticket"));
        }
    }

    // GET /api/tickets/{ticketId}/history
    [HttpGet("tickets/{ticketId:int}/history")]
    [Authorize]
    public async Task<IActionResult> GetTicketHistory(int ticketId)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var data = await conn.QueryAsync(
                "SELECT * FROM dbo.ithd_ticket_history WHERE ticket_id = @ticketId ORDER BY created_at ASC",
                new { ticketId });
            return Ok(ApiResponse<object>.Ok(data));
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Get history error: {ex}");
            return StatusCode(500, ApiResponse.Fail("Failed to fetch ticket history"));
        }
    }

    // POST /api/tickets
    [HttpPost("tickets")]
    [Authorize]
    public async Task<IActionResult> CreateTicket([FromBody] CreateTicketRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.ProjectName) || string.IsNullOrWhiteSpace(body.Location))
            return BadRequest(ApiResponse.Fail("project_name and location are required"));

        var empCode = User.GetEmpCode();
        var costCenter = User.GetCostCenter();
        var userName = User.GetName();
        var userEmail = User.GetEmail();
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            // Same fallback convention as AuthController.Login - avoids "Recipient email is
            // empty" failures when a stale token or an AD account with no Email reaches here.
            var fallbackUsername = User.GetUsername();
            userEmail = !string.IsNullOrWhiteSpace(fallbackUsername)
                ? $"{fallbackUsername}@dci.daikin.co.jp"
                : $"{empCode}@dci.daikin.co.jp";
        }
        var userSect = User.GetSect();

        using var conn = await _db.GetOpenConnectionAsync();
        using var transaction = conn.BeginTransaction();
        int ticketId;
        string reqId;

        try
        {
            var now = GetBangkokNow();

            // ── Duplicate-submit guard ────────────────────────────
            // Covers double-click, slow-network retries, and a stale tab
            // resubmitting after the user reloads: if the same requester
            // opened a ticket with the same project name + location in the
            // last few seconds, treat this call as the same request and
            // return that ticket instead of inserting a second row.
            // WITH (UPDLOCK, HOLDLOCK) makes this check-then-decide atomic
            // with the insert below (same pattern used for req_id already),
            // so two near-simultaneous requests can't both pass the check.
            var duplicateWindowStart = now.AddSeconds(-15);
            var existing = await conn.QueryFirstOrDefaultAsync(@"
                SELECT TOP 1 id, req_id
                FROM dbo.ithd_tickets WITH (UPDLOCK, HOLDLOCK)
                WHERE empCode_created = @empCode
                  AND project_name = @projectName
                  AND location = @location
                  AND created_at >= @duplicateWindowStart
                ORDER BY created_at DESC",
                new { empCode, projectName = body.ProjectName, location = body.Location, duplicateWindowStart },
                transaction);

            if (existing != null)
            {
                var existingDict = (IDictionary<string, object>)existing;
                ticketId = (int)existingDict["id"];
                reqId = (string)existingDict["req_id"];
                transaction.Commit();

                return StatusCode(201, new
                {
                    success = true,
                    message = "Ticket created successfully",
                    emailSent = false, // no new email is sent for a de-duplicated resubmit
                    data = new { id = ticketId, req_id = reqId }
                });
            }

            var prefix = $"TICKET-{now:ddMMyy}";

            // Same UPDLOCK/HOLDLOCK approach as the Node version to avoid duplicate req_id under concurrency.
            var maxSeq = await conn.QueryFirstOrDefaultAsync<int?>(
                "SELECT MAX(CAST(RIGHT(req_id, 3) AS INT)) AS maxSeq FROM dbo.ithd_tickets WITH (UPDLOCK, HOLDLOCK) WHERE req_id LIKE @prefix + '%'",
                new { prefix }, transaction);

            var nextSeq = (maxSeq ?? 0) + 1;
            reqId = $"{prefix}{nextSeq:D3}";

            ticketId = await conn.ExecuteScalarAsync<int>(@"
                INSERT INTO dbo.ithd_tickets (
                    req_id, request_type, project_name, requester_name, requester_email,
                    empCode_created, cost_center, device_type, device_count,
                    location, status, priority, target_date, notes,
                    phone_internal, phone_personal, emp_pic_url, attachments, problem_type_id,
                    problem_subtype_id, problem_type_name, problem_subtype_name,
                    created_at, updated_at
                ) VALUES (
                    @reqId, @requestType, @projectName, @requesterName, @requesterEmail,
                    @empCode, @costCenter, @deviceType, @deviceCount,
                    @location, @status, @priority, @targetDate, @notes,
                    @phoneInternal, @phonePersonal, @empPicUrl, @attachments, @problemTypeId,
                    @problemSubtypeId, @problemTypeName, @problemSubtypeName,
                    @createdAt, @updatedAt
                );
                SELECT CAST(SCOPE_IDENTITY() AS INT);",
                new
                {
                    reqId,
                    requestType = body.RequestType ?? "Hardware Setup",
                    projectName = body.ProjectName,
                    requesterName = userName,
                    requesterEmail = userEmail,
                    empCode,
                    costCenter,
                    deviceType = body.DeviceType ?? "Not Specified",
                    deviceCount = body.DeviceCount ?? 1,
                    location = body.Location,
                    status = "Open",
                    priority = body.Priority ?? "Normal",
                    targetDate = body.TargetDate ?? now,
                    notes = body.Notes ?? "",
                    phoneInternal = body.PhoneInternal ?? "",
                    phonePersonal = body.PhonePersonal ?? "",
                    empPicUrl = body.EmpPicUrl ?? "",
                    attachments = body.Attachments != null ? System.Text.Json.JsonSerializer.Serialize(body.Attachments) : null,
                    problemTypeId = body.ProblemTypeId,
                    problemSubtypeId = body.ProblemSubtypeId,
                    problemTypeName = body.ProblemTypeName ?? "",
                    problemSubtypeName = body.ProblemSubtypeName ?? "",
                    createdAt = now,
                    updatedAt = now
                }, transaction);

            transaction.Commit();
        }
        catch (Exception ex)
        {
            try { transaction.Rollback(); } catch { /* ignore */ }
            Console.Error.WriteLine($"Create ticket error: {ex}");
            return StatusCode(500, ApiResponse.Fail("Failed to create ticket"));
        }

        // ✅ Sync requester to dbo.ithd_users (outside the transaction, mirrors the Node code)
        try
        {
            await _userService.SyncUserFromDaikinAdAsync(empCode, userName, userEmail, costCenter, userSect);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Sync user error: {ex.Message}");
        }

        try
        {
            var historyNow = GetBangkokNow();
            await conn.ExecuteAsync(@"
                INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at)
                VALUES (@ticketId, 'Created', @empCode, @userName, 'เปิดเคสโดยผู้แจ้ง', @createdAt)",
                new { ticketId, empCode, userName, createdAt = historyNow });

            var ticket = await conn.QueryFirstAsync("SELECT * FROM dbo.ithd_tickets WHERE id = @ticketId", new { ticketId });

            var emailTemplate = _templates.TicketCreated(ticket, userName);
            FireAndForgetEmail(ticketId, userEmail, emailTemplate.Subject, emailTemplate.Html, "Ticket Created");

            await _hub.NotifyTicketsUpdatedAsync();

            return StatusCode(201, new
            {
                success = true,
                message = "Ticket created successfully",
                emailSent = true, // queued in the background; check ithd_email_logs for actual delivery status
                data = new { id = ticketId, req_id = reqId }
            });
        }
        catch (Exception ex)
        {
            // Ticket row itself is already committed at this point - matches the Node behaviour
            // where post-commit steps (history/email) failing did not roll back the ticket.
            Console.Error.WriteLine($"Post-create step error: {ex}");
            return StatusCode(201, new
            {
                success = true,
                message = "Ticket created successfully",
                emailSent = false,
                data = new { id = ticketId, req_id = reqId }
            });
        }
    }

    // PUT /api/tickets/{ticketId}
    [HttpPut("tickets/{ticketId:int}")]
    [Authorize]
    public async Task<IActionResult> UpdateTicket(int ticketId, [FromBody] UpdateTicketRequest body)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();

            var ticket = await conn.QueryFirstOrDefaultAsync("SELECT * FROM dbo.ithd_tickets WHERE id = @ticketId", new { ticketId });
            if (ticket == null)
                return NotFound(ApiResponse.Fail("Ticket not found"));

            var ticketDict = (IDictionary<string, object>)ticket;
            string ticketStatus = ticketDict["status"] as string ?? "";
            string ticketPriority = ticketDict["priority"] as string ?? "";
            string ticketEmpCreated = ticketDict["empCode_created"] as string ?? "";
            string? ticketEmpAssigned = ticketDict.TryGetValue("empCode_assigned", out var ea) ? ea as string : null;
            string ticketRequesterName = ticketDict["requester_name"] as string ?? "";
            string ticketRequesterEmail = ticketDict["requester_email"] as string ?? "";
            DateTime? ticketAcceptedAt = ticketDict.TryGetValue("accepted_at", out var aa) ? aa as DateTime? : null;

            var empCode = User.GetEmpCode();
            var isItStaff = User.IsItStaff();
            var userName = User.GetName();
            // A ticket already In Progress can only be reassigned by whoever currently owns it -
            // prevents any IT staff from silently taking a colleague's active ticket away from them.
            if (isItStaff && !string.IsNullOrEmpty(body.EmpCodeAssigned) && ticketStatus == "In Progress"
                && !string.Equals(empCode.Trim(), ticketEmpAssigned?.Trim() ?? "", StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(403, ApiResponse.Fail("Only the current owner can reassign an in-progress ticket"));
            }

            // Permission check
            var isCommentOnly = !string.IsNullOrEmpty(body.Comment) && body.Status == null && body.EmpCodeAssigned == null && body.Notes == null;
            if (!isItStaff && !isCommentOnly)
            {
                var isCancelOwn = body.Status == "Cancelled" &&
                    AccessRules.CanCancelOwn(empCode, ticketEmpCreated, ticketStatus);
                if (!isCancelOwn)
                    return StatusCode(403, ApiResponse.Fail("Only IT Staff can update tickets"));
            }

            var isOwner = string.Equals(empCode.Trim(), ticketEmpCreated.Trim(), StringComparison.OrdinalIgnoreCase);
            if (isCommentOnly && !isItStaff && !isOwner)
                return StatusCode(403, ApiResponse.Fail("Only the ticket owner or IT Staff can add comments"));

            if (body.Status == "Rejected" && string.IsNullOrWhiteSpace(body.Comment))
                return BadRequest(ApiResponse.Fail("A comment reason is required to reject a ticket"));

            if (body.Status == "Closed")
            {
                if (ticketEmpAssigned != empCode)
                    return StatusCode(403, ApiResponse.Fail("เฉพาะผู้ที่รับเคสเท่านั้นที่ปิดเคสได้"));
                if (string.IsNullOrWhiteSpace(body.RootCause) || string.IsNullOrWhiteSpace(body.Solution))
                    return BadRequest(ApiResponse.Fail("กรุณาระบุสาเหตุของปัญหาและวิธีแก้ก่อนปิดเคส"));

                // ── Safety checklist: all 3 items must be confirmed before closing ──
                // The frontend disables the button until they are ticked, but the
                // check is enforced here too so the API can't be closed without it.
                var missingSafety = new List<string>();
                if (body.SafetyPlugOk != true) missingSafety.Add("ปลั๊กไฟ");
                if (body.SafetyCableOk != true) missingSafety.Add("สายไฟ");
                if (body.SafetyAreaOk != true) missingSafety.Add("พื้นที่ปฏิบัติงาน");
                if (missingSafety.Count > 0)
                    return BadRequest(ApiResponse.Fail(
                        $"กรุณาตรวจสอบความปลอดภัยให้ครบก่อนปิดเคส (ยังไม่ได้ยืนยัน: {string.Join(", ", missingSafety)})"));

                // ── Withdraw any attached stock items BEFORE closing the ticket ──────
                if (body.StockItems is { Count: > 0 })
                {
                    var reqId = ticketDict["req_id"]?.ToString() ?? $"#{ticketId}";

                    // Stock has no "get one product" endpoint, so fetch the full list once and
                    // look up price/image/name from it - this is the source of truth, not
                    // whatever the frontend happened to send (which could be stale or spoofed).
                    var stockProducts = await _stockApi.GetProductsAsync();

                    foreach (var item in body.StockItems)
                    {
                        var stockProduct = stockProducts.FirstOrDefault(p => p.ProductID == item.ProductId);

                        var realProductName = stockProduct?.ProductName ?? item.ProductName;
                        var unitPrice = stockProduct?.LastPrice;
                        var imageUrl = stockProduct?.ImageURL;

                        var withdrawResult = await _stockApi.WithdrawAsync(new StockWithdrawRequest
                        {
                            ProductID = item.ProductId,
                            Qty = item.Qty,
                            UserID = User.GetUsername(),          // who performed the withdrawal action (IT staff)
                            RefInfo = $"IT Repair - Ticket {reqId}",
                            EmployeeCode = ticketEmpCreated,       // who the equipment is issued to (ticket requester)
                            EmployeeName = ticketRequesterName,
                            CostCenter = ticketDict["cost_center"]?.ToString(),
                            SerialNumber = item.SerialNumber,
                            FixedAssetCode = item.FixedAssetCode
                        });

                        if (!withdrawResult.Success)
                        {
                            return BadRequest(ApiResponse.Fail(
                                $"เบิก {realProductName ?? $"#{item.ProductId}"} ไม่สำเร็จ: {withdrawResult.Error} — เคสยังไม่ถูกปิด กรุณาแก้ไขรายการแล้วลองใหม่"));
                        }

                        // Record on the Helpdesk side right away, so a successful withdrawal
                        // is never lost even if a later item in the same batch fails.
                        await conn.ExecuteAsync(@"
                            INSERT INTO dbo.ithd_ticket_stock_items
                                (ticket_id, product_id, product_name, qty, device_type, serial_number, fixed_asset_code, unit_price, image_url, withdrawn_by_empcode, withdrawn_at)
                            VALUES
                                (@ticketId, @productId, @productName, @qty, @deviceType, @serialNumber, @fixedAssetCode, @unitPrice, @imageUrl, @empCode, @withdrawnAt)",
                            new
                            {
                                ticketId,
                                productId = item.ProductId,
                                productName = realProductName,
                                qty = item.Qty,
                                deviceType = item.DeviceType,
                                serialNumber = item.SerialNumber,
                                fixedAssetCode = item.FixedAssetCode,
                                unitPrice,
                                imageUrl,
                                empCode,
                                withdrawnAt = GetBangkokNow()
                            });
                    }
                }
            }

            // ── Build UPDATE ──────────────────────────────────────
            var now = GetBangkokNow();
            var updateFields = new List<string> { "updated_at = @updatedAt" };
            var parameters = new DynamicParameters();
            parameters.Add("ticketId", ticketId);
            parameters.Add("updatedAt", now);

            if (body.Status != null) { parameters.Add("status", body.Status); updateFields.Add("status = @status"); }

            if (body.Status == "On Hold")
            {
                parameters.Add("holdReason", body.HoldReason ?? "");
                parameters.Add("holdAt", GetBangkokNow());
                parameters.Add("expectedAt", body.ExpectedAt);
                updateFields.Add("hold_reason = @holdReason");
                updateFields.Add("hold_at = @holdAt");
                updateFields.Add("expected_at = @expectedAt");
            }

            if (body.Status == "In Progress" && ticketStatus == "On Hold")
            {
                parameters.Add("resumedAt", GetBangkokNow());
                updateFields.Add("resumed_at = @resumedAt");
            }

            if (!string.IsNullOrEmpty(body.EmpCodeAssigned))
            {
                parameters.Add("empCodeAssigned", body.EmpCodeAssigned);
                updateFields.Add("empCode_assigned = @empCodeAssigned");
            }

            if (!string.IsNullOrEmpty(body.Notes))
            {
                parameters.Add("notes", body.Notes);
                updateFields.Add("notes = @notes");
            }

            if (!string.IsNullOrEmpty(body.Comment))
            {
                await conn.ExecuteAsync(
                    "INSERT INTO dbo.ithd_comments (ticket_id, empCode, comment, created_at) VALUES (@ticketId, @empCode, @comment, @createdAt)",
                    new { ticketId, empCode, comment = body.Comment, createdAt = GetBangkokNow() });
            }

            if (body.Status == "In Progress")
            {
                var acceptedAt = ticketAcceptedAt ?? GetBangkokNow();
                parameters.Add("acceptedAt", acceptedAt);
                updateFields.Add("accepted_at = @acceptedAt");
            }

            if (body.Status == "Closed")
            {
                parameters.Add("rootCause", body.RootCause);
                parameters.Add("solution", body.Solution);
                updateFields.Add("root_cause = @rootCause");
                updateFields.Add("solution = @solution");
                parameters.Add("completedAt", GetBangkokNow());
                updateFields.Add("completed_at = @completedAt");

                // Safety checklist - validated above, so all three are true here.
                parameters.Add("safetyPlugOk", true);
                parameters.Add("safetyCableOk", true);
                parameters.Add("safetyAreaOk", true);
                parameters.Add("safetyCheckedAt", now);
                updateFields.Add("safety_plug_ok = @safetyPlugOk");
                updateFields.Add("safety_cable_ok = @safetyCableOk");
                updateFields.Add("safety_area_ok = @safetyAreaOk");
                updateFields.Add("safety_checked_at = @safetyCheckedAt");
                if (ticketAcceptedAt == null)
                {
                    parameters.Add("acceptedAt2", GetBangkokNow());
                    updateFields.Add("accepted_at = @acceptedAt2");
                }
            }

            await conn.ExecuteAsync($"UPDATE dbo.ithd_tickets SET {string.Join(", ", updateFields)} WHERE id = @ticketId", parameters);

            // ── LOG History ───────────────────────────────────────
            if (body.Status != null && body.Status != ticketStatus)
            {
                var details = body.Status switch
                {
                    "Closed" => $"ปิดเคสโดย {userName}\nสาเหตุ: {body.RootCause}\nวิธีแก้: {body.Solution}\nตรวจความปลอดภัย: ปลั๊กไฟ OK, สายไฟ OK, พื้นที่ปฏิบัติงาน OK",
                    "Rejected" => $"ปฏิเสธโดย {userName}" + (!string.IsNullOrEmpty(body.Comment) ? $": {body.Comment}" : ""),
                    "Cancelled" => $"ยกเลิกโดย {userName}",
                    "On Hold" => $"พักไว้โดย {userName}: {body.HoldReason ?? ""}",
                    "In Progress" when ticketStatus == "On Hold" => $"กลับมาดำเนินการโดย {userName}",
                    "In Progress" => $"รับเคสโดย {userName}",
                    _ => $"เปลี่ยนสถานะจาก {ThaiLabels.Status(ticketStatus)} เป็น {ThaiLabels.Status(body.Status)}"
                };

                await conn.ExecuteAsync(
                    "INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at) VALUES (@ticketId, @actionType, @empCode, @userName, @details, @createdAt)",
                    new { ticketId, actionType = body.Status, empCode, userName, details, createdAt = now });
            }

            if (!string.IsNullOrEmpty(body.Priority) && body.Priority != ticketPriority)
            {
                await conn.ExecuteAsync(
                    "INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at) VALUES (@ticketId, 'Priority Changed', @empCode, @userName, @details, @createdAt)",
                    new { ticketId, empCode, userName, details = $"เปลี่ยนความเร่งด่วนจาก {ThaiLabels.Priority(ticketPriority)} เป็น {ThaiLabels.Priority(body.Priority)}", createdAt = now });
            }

            // Self-accept (the "Accept Ticket" button) sends status: "In Progress"
            // and empCode_assigned: <self> in the very same request. That's
            // already fully described by the "รับเคสโดย" status-change entry
            // logged above, so logging a second "Assigned" entry here would
            // duplicate the same moment in the timeline. Only log "Assigned"
            // as its own entry when someone is assigning a ticket to a
            // *different* person than themselves (e.g. the "reassign" action
            // the permission check above guards) rather than accepting it
            // themselves.
            bool isSelfAcceptFlow = body.EmpCodeAssigned == empCode && body.Status == "In Progress";
            if (!string.IsNullOrEmpty(body.EmpCodeAssigned) && body.EmpCodeAssigned != ticketEmpAssigned && !isSelfAcceptFlow)
            {
                var staffName = await _userService.GetNameByEmpCodeAsync(body.EmpCodeAssigned);
                await conn.ExecuteAsync(
                    "INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at) VALUES (@ticketId, 'Assigned', @empCode, @userName, @details, @createdAt)",
                    new { ticketId, empCode, userName, details = $"มอบหมายให้ {staffName}", createdAt = now });
            }

            // ── GET updated ticket for emails ─────────────────────
            var updatedTicket = await conn.QueryFirstAsync("SELECT * FROM dbo.ithd_tickets WHERE id = @ticketId", new { ticketId });

            // EMAIL #1: Status update to requester
            if (body.Status != null || !string.IsNullOrEmpty(body.Notes))
            {
                var changeDetails = new List<string>();
                if (body.Status != null && body.Status != ticketStatus) changeDetails.Add($"Status: {ticketStatus} → {body.Status}");
                if (!string.IsNullOrEmpty(body.Notes)) changeDetails.Add("Notes updated");

                var emailTemplate = _templates.TicketUpdated(updatedTicket, ticketRequesterName, string.Join(", ", changeDetails));
                FireAndForgetEmail(ticketId, ticketRequesterEmail, emailTemplate.Subject, emailTemplate.Html, "Status Updated");
            }

            // EMAIL #2: Comment notification (IT staff only)
            if (!string.IsNullOrEmpty(body.Comment) && isItStaff)
            {
                var emailTemplate = _templates.TicketComment(updatedTicket, string.IsNullOrEmpty(userName) ? "IT Staff" : userName, body.Comment);
                FireAndForgetEmail(ticketId, ticketRequesterEmail, emailTemplate.Subject, emailTemplate.Html, "Comment Added");
            }

            // EMAIL #3: Assignment notification
            if (!string.IsNullOrEmpty(body.EmpCodeAssigned) && body.EmpCodeAssigned != ticketEmpAssigned
    && body.EmpCodeAssigned != empCode)
            {
                var staffEmail = await _userService.GetEmailByEmpCodeAsync(body.EmpCodeAssigned);
                var staffName = await _userService.GetNameByEmpCodeAsync(body.EmpCodeAssigned);
                if (!string.IsNullOrEmpty(staffEmail))
                {
                    var emailTemplate = _templates.TicketAssigned(updatedTicket, staffName);
                    FireAndForgetEmail(ticketId, staffEmail, emailTemplate.Subject, emailTemplate.Html, "Ticket Assigned");
                }
            }

            // EMAIL #4: Completion notification
            if (body.Status == "Closed" && ticketStatus != "Closed")
            {
                var emailTemplate = _templates.TicketCompleted(updatedTicket, ticketRequesterName);
                FireAndForgetEmail(ticketId, ticketRequesterEmail, emailTemplate.Subject, emailTemplate.Html, "Ticket Completed");
            }

            await _hub.NotifyTicketsUpdatedAsync();
            return Ok(new { success = true, message = "Ticket updated and notifications sent" });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Update ticket error: {ex}");
            return StatusCode(500, ApiResponse.Fail($"Failed to update ticket: {ex.Message}"));
        }
    }

    // DELETE /api/tickets/{ticketId}
    [HttpDelete("tickets/{ticketId:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteTicket(int ticketId)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();

            var ticket = await conn.QueryFirstOrDefaultAsync("SELECT * FROM dbo.ithd_tickets WHERE id = @ticketId", new { ticketId });
            if (ticket == null)
                return NotFound(ApiResponse.Fail("Ticket not found"));

            var ticketDict = (IDictionary<string, object>)ticket;
            string ticketEmpCreated = ticketDict["empCode_created"] as string ?? "";
            string reqId = ticketDict["req_id"] as string ?? "";
            string projectName = ticketDict["project_name"] as string ?? "";
            string requesterName = ticketDict["requester_name"] as string ?? "";
            string requesterEmail = ticketDict["requester_email"] as string ?? "";

            var empCode = User.GetEmpCode();
            var isOwner = string.Equals(empCode.Trim(), ticketEmpCreated.Trim(), StringComparison.OrdinalIgnoreCase);
            if (!User.IsItStaff() && !isOwner)
                return StatusCode(403, ApiResponse.Fail("Only the ticket owner or IT Staff can delete tickets"));

            await conn.ExecuteAsync("DELETE FROM dbo.ithd_ticket_assignees WHERE ticket_id = @ticketId", new { ticketId });
            await conn.ExecuteAsync("DELETE FROM dbo.ithd_ticket_stock_items WHERE ticket_id = @ticketId", new { ticketId });
            await conn.ExecuteAsync("DELETE FROM dbo.ithd_email_logs WHERE ticket_id = @ticketId", new { ticketId });
            await conn.ExecuteAsync("DELETE FROM dbo.ithd_comments WHERE ticket_id = @ticketId", new { ticketId });
            await conn.ExecuteAsync("DELETE FROM dbo.ithd_ticket_history WHERE ticket_id = @ticketId", new { ticketId });
            await conn.ExecuteAsync("DELETE FROM dbo.ithd_tickets WHERE id = @ticketId", new { ticketId });

            // NOTE: FireAndForgetEmail's log step will find no matching ticket row here (it was
            // just deleted above) and silently skip logging - same as the original Node behaviour,
            // which checked "ticket exists" before writing to ithd_email_logs too.
            FireAndForgetEmail(ticketId, requesterEmail, $"[{reqId}] Ticket Cancelled",
                $@"<div style=""font-family: Arial, sans-serif; max-width: 600px;"">
                    <p>Hi {requesterName},</p>
                    <p>Your ticket <strong>{reqId}</strong> ({projectName}) has been cancelled by the IT team.</p>
                    <p>If you have any questions, please contact IT Support.</p>
                    <p style=""color: #999; font-size: 12px;"">© 2026 IT Service Desk</p>
                </div>", "Ticket Deleted");

            await _hub.NotifyTicketsUpdatedAsync();
            return Ok(new { success = true, message = "Ticket deleted successfully" });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Delete ticket error: {ex}");
            return StatusCode(500, ApiResponse.Fail("Failed to delete ticket"));
        }
    }

    // POST /api/tickets/{ticketId}/comments
    [HttpPost("tickets/{ticketId:int}/comments")]
    [Authorize]
    public async Task<IActionResult> AddTicketComment(int ticketId, [FromBody] AddCommentRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Comment))
            return BadRequest(ApiResponse.Fail("Comment text is required"));

        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var empCode = User.GetEmpCode();
            var isItStaff = User.IsItStaff();

            var checkSql = "SELECT id FROM dbo.ithd_tickets WHERE id = @ticketId" + (isItStaff ? "" : " AND empCode_created = @empCode");
            var found = await conn.QueryFirstOrDefaultAsync<int?>(checkSql, new { ticketId, empCode });
            if (found == null)
                return NotFound(ApiResponse.Fail("Ticket not found or access denied"));

            await conn.ExecuteAsync(
                "INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at) VALUES (@ticketId, 'Comment', @empCode, @userName, @details, @createdAt)",
                new { ticketId, empCode, userName = User.GetName(), details = body.Comment, createdAt = GetBangkokNow() });

            await _hub.NotifyTicketsUpdatedAsync();
            return StatusCode(201, new { success = true, message = "Comment added successfully" });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Add comment error: {ex}");
            return StatusCode(500, ApiResponse.Fail("Failed to add comment"));
        }
    }

    // POST /api/tickets/{ticketId}/assignees
    [HttpPost("tickets/{ticketId:int}/assignees")]
    [Authorize]
    public async Task<IActionResult> AddHelper(int ticketId, [FromBody] AddHelperRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.EmpCode))
            return BadRequest(ApiResponse.Fail("empCode required"));

        try
        {
            using var conn = await _db.GetOpenConnectionAsync();

            var exists = await conn.QueryFirstOrDefaultAsync<int?>(
                "SELECT id FROM dbo.ithd_ticket_assignees WHERE ticket_id = @ticketId AND empCode = @empCode",
                new { ticketId, empCode = body.EmpCode });
            if (exists != null)
                return BadRequest(ApiResponse.Fail("Already added"));

            var name = await _userService.GetNameByEmpCodeAsync(body.EmpCode) ?? body.EmpCode;

            await conn.ExecuteAsync(
                "INSERT INTO dbo.ithd_ticket_assignees (ticket_id, empCode, name, role, assigned_at) VALUES (@ticketId, @empCode, @name, 'helper', @assignedAt)",
                new { ticketId, empCode = body.EmpCode, name, assignedAt = GetBangkokNow() });

            await conn.ExecuteAsync(
                "INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at) VALUES (@ticketId, 'Helper Added', @actorEmpCode, @actorName, @details, @createdAt)",
                new { ticketId, actorEmpCode = User.GetEmpCode(), actorName = User.GetName(), details = $"เพิ่ม Helper: {name}", createdAt = GetBangkokNow() });

            await _hub.NotifyTicketsUpdatedAsync();
            return Ok(new { success = true, message = $"เพิ่ม {name} เป็น Helper แล้ว" });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Add helper error: {ex}");
            return StatusCode(500, ApiResponse.Fail("Failed to add helper"));
        }
    }

    // DELETE /api/tickets/{ticketId}/assignees/{empCode}
    [HttpDelete("tickets/{ticketId:int}/assignees/{empCode}")]
    [Authorize]
    public async Task<IActionResult> RemoveHelper(int ticketId, string empCode)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var name = await _userService.GetNameByEmpCodeAsync(empCode) ?? empCode;

            await conn.ExecuteAsync(
                "DELETE FROM dbo.ithd_ticket_assignees WHERE ticket_id = @ticketId AND empCode = @empCode",
                new { ticketId, empCode });

            await conn.ExecuteAsync(
                "INSERT INTO dbo.ithd_ticket_history (ticket_id, action_type, actor_empCode, actor_name, details, created_at) VALUES (@ticketId, 'Helper Removed', @actorEmpCode, @actorName, @details, @createdAt)",
                new { ticketId, actorEmpCode = User.GetEmpCode(), actorName = User.GetName(), details = $"ลบ Helper: {name}", createdAt = GetBangkokNow() });

            await _hub.NotifyTicketsUpdatedAsync();
            return Ok(new { success = true, message = $"ลบ {name} ออกแล้ว" });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Remove helper error: {ex}");
            return StatusCode(500, ApiResponse.Fail("Failed to remove helper"));
        }
    }
}