using System.Net;
using System.Net.Mail;

namespace HelpDeskApi.Services;

public record EmailResult(bool Success, string? MessageId, string? Error);

/// <summary>
/// NOTE: backend/src/config/emailConfig.js (the sendEmail implementation used by
/// ticketController.js) was not part of the uploaded files, so this is a standard
/// SMTP-based reimplementation with the same call signature and the same
/// { success, messageId, error } result shape the controllers rely on.
/// Fill in Smtp:* settings in appsettings.json (or env vars) to match whatever
/// mail relay the Node app was using (e.g. Daikin's internal SMTP relay, SendGrid, etc).
/// </summary>
public class EmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config) => _config = config;

    public async Task<EmailResult> SendEmailAsync(string? to, string? subject, string? html)
    {
        if (string.IsNullOrWhiteSpace(to))
            return new EmailResult(false, null, "Recipient email is empty");

        try
        {
            var host = _config["Smtp:Host"];
            if (string.IsNullOrWhiteSpace(host))
                return new EmailResult(false, null, "SMTP not configured");

            using var client = new SmtpClient(host, int.Parse(_config["Smtp:Port"] ?? "587"))
            {
                EnableSsl = bool.Parse(_config["Smtp:EnableSsl"] ?? "true"),
                // Default SmtpClient.Timeout is 100,000ms - far longer than the frontend's
                // axios timeout (10s). If the relay is slow/unresponsive, that mismatch is
                // exactly what causes ticket creation to appear "hung" with no response ever
                // reaching the browser, even though the ticket itself was already committed
                // to the database before this email step ran. Failing fast here means a slow
                // relay just shows up as a "Failed" row in ithd_email_logs instead.
                Timeout = 8000
            };

            var smtpUser = _config["Smtp:User"];
            if (!string.IsNullOrWhiteSpace(smtpUser))
            {
                // Only authenticate if a user is actually configured - many internal
                // relays (e.g. an on-prem Exchange relay on port 25) accept anonymous
                // sends and will reject/error if credentials are sent regardless.
                client.Credentials = new NetworkCredential(smtpUser, _config["Smtp:Password"]);
            }
            else
            {
                client.UseDefaultCredentials = false;
            }

            using var message = new MailMessage
            {
                From = new MailAddress(_config["Smtp:From"] ?? "helpdesk@dci.daikin.co.jp"),
                Subject = subject ?? "",
                Body = html ?? "",
                IsBodyHtml = true
            };
            message.To.Add(to);

            await client.SendMailAsync(message);

            var messageId = Guid.NewGuid().ToString();
            return new EmailResult(true, messageId, null);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Send email failed: {ex.Message}");
            return new EmailResult(false, null, ex.Message);
        }
    }
}
