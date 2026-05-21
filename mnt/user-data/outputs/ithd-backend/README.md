# IT Service Desk - BACKEND

## 📁 Folder Structure

```
ithd-backend/
├── src/
│   ├── config/
│   │   └── emailConfig.js          # Email SMTP configuration
│   ├── controller/
│   │   ├── authController.js       # Login & authentication
│   │   └── ticketController.js     # Ticket CRUD operations
│   ├── middleware/
│   │   └── authMiddleware.js       # JWT verification & auth guards
│   ├── services/
│   │   ├── userService.js          # User lookup & caching
│   │   └── emailLogService.js      # Email tracking & logging
│   ├── route/
│   │   └── ticketRoute.js          # API routes
│   └── utils/
│       └── emailTemplates.js       # HTML email templates
├── database/
│   └── schema.sql                  # Database schema (dbo.ithd_*)
├── .env.example                    # Environment variables template
└── server.js                       # (Your existing file - add routes here)
```

## 🚀 Setup Instructions

### Step 1: Install Dependencies
```bash
npm install nodemailer
```

### Step 2: Copy Files to Your Project

```bash
# From ithd-backend/src/* to your project's src/
cp -r src/* /your/backend/project/src/

# Copy .env template
cp .env.example /your/backend/project/.env
```

### Step 3: Setup Database

Open SQL Server Management Studio:
1. Select your database
2. Open `database/schema.sql`
3. Execute the script
4. Verify tables created:
   ```sql
   SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
   WHERE TABLE_NAME LIKE 'ithd_%';
   ```

### Step 4: Configure Environment Variables

Edit `.env`:
```env
# Database
DB_HOST=your-sql-server
DB_USER=sa
DB_PASS=your-password
DB_NAME=YourDatabase

# JWT
JWT_SECRET=your-very-secure-key-change-in-production

# Email - Choose ONE option:

# Option A: Daikin SMTP (RECOMMENDED)
SMTP_HOST=smtp.dci.daikin.co.jp
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@dci.daikin.co.jp
EMAIL_PASSWORD=your-password
EMAIL_FROM="IT Service Desk <your-email@dci.daikin.co.jp>"

# Option B: Gmail
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx  # 16-char app password
# EMAIL_FROM="IT Service Desk <your-email@gmail.com>"

# Server
PORT=3000
NODE_ENV=development
```

### Step 5: Update Your server.js

Add these lines to your existing `server.js`:

```javascript
import ticketRoute from './route/ticketRoute.js';

// Register the ticket routes
app.use('/api', ticketRoute);

// Optional: Add health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});
```

### Step 6: Test

```bash
npm start

# Test endpoints:
# GET http://localhost:3000/api/health
# POST http://localhost:3000/api/authen (login)
# GET http://localhost:3000/api/tickets (get tickets)
```

## 📋 File Descriptions

### authController.js
- Handles login with Daikin AD API
- Syncs user to `dbo.ithd_users` automatically
- Generates JWT token with cost_center
- Only CC 7510 (IT Staff) allowed

### authMiddleware.js
- Verifies JWT token from Authorization header
- Checks Cost Center 7510 for IT Staff
- Sets `req.user`, `req.empCode`, `req.isITStaff`

### ticketController.js
- Create, Read, Update, Delete tickets
- Sends email notifications for all actions
- Logs emails to `dbo.ithd_email_logs`
- Access control: IT Staff sees all, Users see own

### ticketRoute.js
- API routes for tickets
- Requires JWT verification on all routes

### emailConfig.js
- SMTP configuration (Nodemailer)
- Supports Daikin, Gmail, Office365
- `sendEmail(to, subject, html)` function

### emailTemplates.js
- HTML email designs for:
  - Ticket Created
  - Status Updated
  - Assigned to Staff
  - Completed

### userService.js
- Get user email/name by empCode
- Sync users from Daikin AD to database
- In-memory cache (1 hour)

### emailLogService.js
- Log all email sending
- Track failed emails for retry
- Get email statistics
- Clean old logs

## 🔄 Email Notifications Sent

| Action | Email To | Template |
|--------|----------|----------|
| Ticket Created | Requester | ticketCreatedTemplate |
| Status Updated | Requester | ticketUpdatedTemplate |
| Assigned to Staff | Staff Member | ticketAssignedTemplate |
| Completed | Requester | ticketCompletedTemplate |
| Deleted | Requester | Custom HTML |

## 📊 Database Tables

```sql
-- Users
dbo.ithd_users
- empCode (PK)
- email
- name
- cost_center
- sect

-- Tickets
dbo.ithd_tickets
- id (PK)
- req_id (UNIQUE)
- request_type
- project_name
- requester_name
- requester_email
- empCode_created (FK)
- empCode_assigned (FK)
- cost_center
- status (Pending, In Progress, Completed)
- priority (Normal, Medium, High, Critical)
- created_at, updated_at, completed_at

-- Email Logs
dbo.ithd_email_logs
- id (PK)
- ticket_id (FK)
- recipient_email
- action
- email_subject
- status (Sent, Failed, Pending)
- message_id
- error_message
- sent_at

-- Comments (Optional)
dbo.ithd_comments
- id (PK)
- ticket_id (FK)
- empCode (FK)
- comment
- created_at
```

## ✅ Checklist

- [ ] Database schema created
- [ ] Sample users inserted
- [ ] .env configured with SMTP
- [ ] Backend files copied
- [ ] server.js updated with routes
- [ ] `npm install nodemailer` executed
- [ ] Backend starts: `npm start`
- [ ] Login test successful
- [ ] Email test successful (check inbox)
- [ ] Ticket creation works
- [ ] Email logs in database

## 🐛 Troubleshooting

**Email not sending:**
- Check .env SMTP credentials
- Test SMTP: `telnet smtp.dci.daikin.co.jp 587`
- Check email logs: `SELECT * FROM dbo.ithd_email_logs`

**User not syncing:**
- Check database connection
- Verify `dbo.ithd_users` table exists
- Check console for sync errors

**"Only CC 7510 allowed":**
- User's cost_center is not 7510
- Only IT Staff can access this system

**Token expired:**
- JWT set to 1hr expiry
- Frontend redirects to login on 401
- User needs to login again

## 📚 API Endpoints

```
POST /api/authen
Body: { username, password }
Response: { success, token, user }

GET /api/tickets
Headers: Authorization: Bearer TOKEN
Query: (none = all for IT Staff, own for users)

GET /api/tickets/:id
Headers: Authorization: Bearer TOKEN

POST /api/tickets
Headers: Authorization: Bearer TOKEN
Body: { project_name, location, priority, ... }

PUT /api/tickets/:id
Headers: Authorization: Bearer TOKEN
Body: { status, empCode_assigned, notes }
IT Staff only

DELETE /api/tickets/:id
Headers: Authorization: Bearer TOKEN
IT Staff only

GET /api/tickets/stats
Headers: Authorization: Bearer TOKEN
```

Good luck! 🎉
