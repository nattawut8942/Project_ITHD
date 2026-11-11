# HelpDesk API — Node.js → C# (.NET 8 / ASP.NET Core) port

This is a 1:1 port of the uploaded Node/Express backend. All routes, JSON response
shapes, JWT claim names, and business logic were kept identical so the existing
React/Vue frontend needs **minimal** changes (see "Frontend changes" below).

## File mapping

| Node file | C# file |
|---|---|
| `config/db.js` | `Data/DbConnectionFactory.cs` |
| `controllers/authController.js` | `Controllers/AuthController.cs` |
| `controller/masterDataController.js` | `Controllers/MasterDataController.cs` |
| `controller/ticketController.js` | `Controllers/TicketController.cs` |
| `route/uploadRoute.js` | `Controllers/UploadController.cs` |
| `middleware/authMiddleware.js` | `Authorization/ClaimsPrincipalExtensions.cs` + `Authorization/RequireCc7510Attribute.cs` + built-in JWT auth in `Program.cs` |
| `services/userService.js` | `Services/UserService.cs` |
| `services/emailLogService.js` | `Services/EmailLogService.cs` |
| `utils/emailTemplates.js` | `Services/EmailTemplates.cs` |
| `config/emailConfig.js` (not uploaded) | `Services/EmailService.cs` — **reimplemented from scratch as plain SMTP**, since the original file wasn't provided. Fill in `Smtp:*` in `appsettings.json`. |
| `route/*.js` (Express routers) | Not separate files — routing lives on each controller action via `[HttpGet]`/`[HttpPost]` attributes, same effect as Express `router.get(...)` |
| socket.io (`req.app.get('io').emit(...)`) | `Hubs/TicketHub.cs` (SignalR), mapped at `/hubs/tickets` |

## What you must fill in / verify

1. **`appsettings.json`**
   - `ConnectionStrings:Default` — your SQL Server connection string
   - `Jwt:SecretKey` — keep the *same* value as `JWT_SECRET` in the old `.env` if you want existing tokens to stay valid; otherwise everyone re-logs in after deploy, which is simplest.
   - `Daikin:AuthApiUrl` — already pre-filled from the Node code
   - `Smtp:*` — your mail relay's host/port/credentials (the original `emailConfig.js` was not in the files you sent, so I had to write a standard SMTP sender; if the original used a different provider — e.g. SendGrid, Nodemailer with OAuth2, etc — tell me and I'll swap it in)
   - `Cors:AllowedOrigins` — your frontend's URL(s)

2. **Database schema** — the code assumes the same tables/columns already visible in
   your Node code (`dbo.ithd_tickets`, `dbo.ithd_users`, `dbo.ithd_ticket_history`,
   `dbo.ithd_ticket_assignees`, `dbo.ithd_comments`, `dbo.ithd_email_logs`,
   `dbo.Stock_UserRole`, `dbo.ithd_problem_types`, etc). No schema changes needed —
   this port reads/writes the exact same tables and columns.

3. **A bug I found & fixed while porting**: in `ticketRoute.js`, `/tickets/stats` was
   registered *after* `/tickets/:ticketId`, so in Express a request to
   `/tickets/stats` would actually get captured by the `:ticketId` route (with
   `ticketId = "stats"`) and likely 500. In ASP.NET Core's routing this is
   naturally resolved correctly (literal segments win over route parameters
   regardless of declaration order, and `{ticketId:int}` only matches numbers
   anyway), so `/api/tickets/stats` now works as originally intended.

## Running it

```bash
cd HelpDeskApi
dotnet restore
dotnet run
```

Swagger UI is available at `/swagger` in development for quick manual testing of
every endpoint before wiring up the frontend.

## Frontend changes needed

If you keep the same base URL and port, **almost nothing** changes:

- ✅ All REST endpoints, request bodies, and response JSON shapes are unchanged
  (`{ success, message, data }`, login's `{ success, token, user }`, etc.)
- ✅ `Authorization: Bearer <token>` header usage is unchanged
- ✅ JWT payload field names are unchanged (`empcode`, `cost_center`, `role`, `Position`, etc.)
- ⚠️ **Real-time updates**: swap `socket.io-client` for `@microsoft/signalr`, since
  ASP.NET Core uses SignalR instead of socket.io. Example:

  ```js
  // before (socket.io-client)
  import { io } from 'socket.io-client';
  const socket = io(API_BASE_URL);
  socket.on('tickets_updated', refreshTickets);

  // after (@microsoft/signalr)
  import * as signalR from '@microsoft/signalr';
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/hubs/tickets`, { accessTokenFactory: () => token })
    .build();
  connection.on('TicketsUpdated', refreshTickets);
  await connection.start();
  ```

- ⚠️ File upload field name stays `files` (multipart/form-data), same as before —
  no change needed there.

## Not yet ported

- `config/emailConfig.js` — not in your uploaded files, so `EmailService.cs` is a
  fresh SMTP implementation with the same `{ success, messageId, error }` return
  shape. Send me that file if you want an exact behavioral match (e.g. if it used
  a transactional email API instead of raw SMTP).
