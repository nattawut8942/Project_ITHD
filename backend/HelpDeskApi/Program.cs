using System.Text;
using HelpDeskApi.Data;
using HelpDeskApi.Hubs;
using HelpDeskApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ── Services ────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();          // equivalent of `new Server(httpServer)` (socket.io)
builder.Services.AddHttpClient();       // equivalent of axios usage in authController.js
builder.Services.AddMemoryCache();      // equivalent of the in-memory Map cache in userService.js

builder.Services.AddSingleton<DbConnectionFactory>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<EmailLogService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<EmailTemplates>();
builder.Services.AddScoped<StockApiService>();

// ── JWT auth (replaces authMiddleware.js's verifyToken) ────────────────
var jwtSecret = builder.Configuration["Jwt:SecretKey"] ?? "your-secret-key-change-this-in-env";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        // Allow SignalR clients to send the JWT via query string (?access_token=...)
        // since browsers can't set custom headers on the WebSocket handshake.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ── CORS (replaces the Node app's cors() middleware config) ────────────
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // required for SignalR
    });
});

var app = builder.Build();

// ── Middleware pipeline ─────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

// Serve /uploads/tickets/* the same way the Node app served its uploads folder as static files.
var uploadsDir = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsDir);
app.UseStaticFiles(new Microsoft.AspNetCore.Builder.StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsDir),
    RequestPath = "/uploads"
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<TicketHub>("/hubs/tickets"); // equivalent of io.on('connection', ...) wiring

app.Run();
