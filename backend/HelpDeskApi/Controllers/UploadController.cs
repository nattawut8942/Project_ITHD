using HelpDeskApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HelpDeskApi.Controllers;

/// <summary>Port of backend/src/route/uploadRoute.js (multer -> built-in IFormFile model binding)</summary>
[ApiController]
[Route("api/upload")]
[Authorize]
public class UploadController : ControllerBase
{
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".pdf", ".svg" };
    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10MB, same as multer limits
    private readonly IWebHostEnvironment _env;

    public UploadController(IWebHostEnvironment env) => _env = env;

    [HttpPost("ticket-attachment")]
    [RequestSizeLimit(60 * 1024 * 1024)] // headroom for up to 5 files at 10MB each
    public async Task<IActionResult> UploadTicketAttachment(List<IFormFile> files)
    {
        if (files == null || files.Count == 0)
            return BadRequest(ApiResponse.Fail("No files uploaded"));

        if (files.Count > 5)
            return BadRequest(ApiResponse.Fail("Maximum 5 files allowed"));

        var uploadDir = Path.Combine(_env.ContentRootPath, "uploads", "tickets");
        Directory.CreateDirectory(uploadDir);

        var results = new List<object>();

        foreach (var file in files)
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return BadRequest(ApiResponse.Fail("File type not allowed"));

            if (file.Length > MaxFileSizeBytes)
                return BadRequest(ApiResponse.Fail("ไฟล์ใหญ่เกินไป (สูงสุด 10MB)"));

            var fileName = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Random.Shared.Next(100000000, 999999999)}{ext}";
            var filePath = Path.Combine(uploadDir, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
                await file.CopyToAsync(stream);

            results.Add(new
            {
                filename = fileName,
                originalname = file.FileName,
                url = $"/uploads/tickets/{fileName}",
                size = file.Length
            });
        }

        return Ok(new { success = true, files = results });
    }
}
