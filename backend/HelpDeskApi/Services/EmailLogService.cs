using Dapper;
using HelpDeskApi.Data;

namespace HelpDeskApi.Services;

/// <summary>Port of backend/src/services/emailLogService.js</summary>
public class EmailLogService
{
    private readonly DbConnectionFactory _db;

    public EmailLogService(DbConnectionFactory db) => _db = db;

    /// <summary>logEmail - checks the ticket exists first, same as the JS version.</summary>
    public async Task LogEmailAsync(int ticketId, string? email, string type, string? subject,
        string status, string? messageId, string? error)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();

            var exists = await conn.QueryFirstOrDefaultAsync<int?>(
                "SELECT id FROM dbo.ithd_tickets WHERE id = @id", new { id = ticketId });

            if (exists == null)
            {
                Console.WriteLine($"logEmail skipped: ticket {ticketId} not found");
                return;
            }

            await conn.ExecuteAsync(
                @"INSERT INTO dbo.ithd_email_logs
                    (ticket_id, recipient_email, action, email_subject, status, message_id, error_message, sent_at)
                  VALUES
                    (@ticketId, @email, @type, @subject, @status, @messageId, @error, @sentAt)",
                new { ticketId, email, type, subject, status, messageId, error, sentAt = DateTime.Now });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to log email: {ex.Message}");
        }
    }

    /// <summary>getTicketEmailLogs</summary>
    public async Task<IEnumerable<dynamic>> GetTicketEmailLogsAsync(int ticketId)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            return await conn.QueryAsync(
                @"SELECT id, ticket_id, recipient_email, action, email_subject, status, message_id, error_message, sent_at
                  FROM dbo.ithd_email_logs WHERE ticket_id = @ticketId ORDER BY sent_at DESC",
                new { ticketId });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to get email logs: {ex.Message}");
            return Enumerable.Empty<dynamic>();
        }
    }

    /// <summary>getRecipientEmailLogs</summary>
    public async Task<IEnumerable<dynamic>> GetRecipientEmailLogsAsync(string recipientEmail, int limit = 50)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            return await conn.QueryAsync(
                @"SELECT TOP (@limit) id, ticket_id, recipient_email, action, email_subject, status, message_id, error_message, sent_at
                  FROM dbo.ithd_email_logs WHERE recipient_email = @recipientEmail ORDER BY sent_at DESC",
                new { limit, recipientEmail });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to get recipient email logs: {ex.Message}");
            return Enumerable.Empty<dynamic>();
        }
    }

    /// <summary>getEmailStats</summary>
    public async Task<dynamic?> GetEmailStatsAsync()
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            return await conn.QueryFirstOrDefaultAsync(
                @"SELECT
                    COUNT(*) as total_emails,
                    SUM(CASE WHEN status = 'Sent' THEN 1 ELSE 0 END) as sent,
                    SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as pending,
                    COUNT(DISTINCT recipient_email) as unique_recipients,
                    COUNT(DISTINCT ticket_id) as tickets_with_emails
                  FROM dbo.ithd_email_logs");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to get email stats: {ex.Message}");
            return null;
        }
    }

    /// <summary>getFailedEmails</summary>
    public async Task<IEnumerable<dynamic>> GetFailedEmailsAsync(int limit = 20)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            return await conn.QueryAsync(
                @"SELECT TOP (@limit) id, ticket_id, recipient_email, action, email_subject, error_message, sent_at
                  FROM dbo.ithd_email_logs WHERE status = 'Failed' ORDER BY sent_at DESC",
                new { limit });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to get failed emails: {ex.Message}");
            return Enumerable.Empty<dynamic>();
        }
    }

    /// <summary>markEmailAsResent</summary>
    public async Task<(bool Success, string? Error)> MarkEmailAsResentAsync(int emailLogId, string? newMessageId = null)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            await conn.ExecuteAsync(
                @"UPDATE dbo.ithd_email_logs
                  SET status = 'Sent', message_id = @messageId, sent_at = GETDATE()
                  WHERE id = @id",
                new { id = emailLogId, messageId = newMessageId ?? "" });
            return (true, null);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to mark email as resent: {ex.Message}");
            return (false, ex.Message);
        }
    }

    /// <summary>cleanOldEmailLogs</summary>
    public async Task<(bool Success, int DeletedRows, string? Error)> CleanOldEmailLogsAsync(int daysToKeep = 90)
    {
        try
        {
            using var conn = await _db.GetOpenConnectionAsync();
            var deleted = await conn.ExecuteAsync(
                "DELETE FROM dbo.ithd_email_logs WHERE sent_at < DATEADD(DAY, -@daysToKeep, GETDATE())",
                new { daysToKeep });
            return (true, deleted, null);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to clean email logs: {ex.Message}");
            return (false, 0, ex.Message);
        }
    }
}
