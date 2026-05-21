// COMPLETE SETUP GUIDE - Start from Zero to Hero! 🚀

## 📋 BACKEND SETUP - STEP BY STEP

### PHASE 1: DATABASE SETUP (SQL Server)

#### Step 1.1: Run Database Schema
1. Open SQL Server Management Studio
2. Open `/database_schema.sql`
3. Select your database
4. Execute the script (F5)
5. Verify tables created:
   ```sql
   SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES;
   -- Should see: Users, Tickets, EmailLogs, TicketComments
   ```

#### Step 1.2: Insert Sample Data (Optional)
```sql
-- Users with emails
INSERT INTO dbo.Users (empCode, email, name, cost_center, sect)
VALUES 
    ('EMP001', 'natthawut.y@dci.daikin.co.jp', 'Natthawut Y.', '7510', 'IT'),
    ('EMP002', 'namnueng.y@dci.daikin.co.jp', 'Namnueng Y.', '7510', 'IT');

SELECT * FROM dbo.Users;
```

---

### PHASE 2: BACKEND NODE.JS SETUP

#### Step 2.1: Install Dependencies
```bash
cd backend
npm install nodemailer
npm install dotenv  # If not already installed
```

#### Step 2.2: Create Folder Structure
```bash
# Create new folders
mkdir -p src/services
mkdir -p src/middleware
mkdir -p src/config
mkdir -p src/utils

# If not already existing
mkdir -p database
```

#### Step 2.3: Copy Backend Files

**Copy these files to your project:**

| File | Destination | Purpose |
|------|-------------|---------|
| `backend_emailConfig.js` | `/src/config/email.js` | Email SMTP config |
| `backend_emailTemplates.js` | `/src/utils/emailTemplates.js` | HTML email designs |
| `backend_userService.js` | `/src/services/userService.js` | User lookup + cache |
| `backend_emailLogService.js` | `/src/services/emailLogService.js` | Email tracking |
| `backend_authMiddleware.js` | `/src/middleware/authMiddleware.js` | JWT verification |
| `backend_authController_FINAL.js` | `/src/controller/authController.js` | Updated login |
| `backend_ticketController_FINAL.js` | `/src/controller/ticketController.js` | Updated tickets |
| `backend_ticketRoute.js` | `/src/route/ticketRoute.js` | Ticket routes |

#### Step 2.4: Update Environment Variables
```bash
# Edit or create: backend/.env

# Database Configuration
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

#### Step 2.5: Update server.js
```javascript
// In backend/src/server.js - ADD these imports:
import ticketRoute from './route/ticketRoute.js';
import { verifyToken } from './middleware/authMiddleware.js';

// Register routes:
app.use('/api', ticketRoute);

// Optional: Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});
```

#### Step 2.6: Test Backend
```bash
# Start backend
npm start

# Test endpoints with Postman:

# 1. Test health
GET http://localhost:3000/api/health

# 2. Test login
POST http://localhost:3000/api/authen
Content-Type: application/json
{
    "username": "your-username",
    "password": "your-password"
}

# Should return: { success: true, token: "jwt...", user: {...} }
```

---

### PHASE 3: FRONTEND SETUP

#### Step 3.1: Copy Frontend Files

| File | Destination | Purpose |
|------|-------------|---------|
| `frontend_AuthContext.jsx` | `/src/context/AuthContext.jsx` | Auth state management |
| `frontend_ProtectedRoute.jsx` | `/src/components/ProtectedRoute.jsx` | Route guard |
| `frontend_apiClient.js` | `/src/utils/apiClient.js` | API with auth header |
| `frontend_LoginPage_UPDATED.jsx` | `/src/pages/LoginPage.jsx` | Updated login |
| `frontend_App_UPDATED.jsx` | `/src/App.jsx` | Updated routing |

#### Step 3.2: Update .env (Frontend)
```bash
# frontend/.env
VITE_API_BASE=http://localhost:3000/api
```

#### Step 3.3: Verify imports in App.jsx
```javascript
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ITServiceDesk from './pages/ITServiceDesk';
```

#### Step 3.4: Run Frontend
```bash
cd frontend
npm install
npm run dev

# Should be at http://localhost:5173
```

---

## 🧪 TESTING GUIDE

### Test 1: Login Flow
```
1. Go to http://localhost:5173/login
2. Enter username/password
3. Should sync user to database
4. Get JWT token
5. Redirect to dashboard
6. Check token in localStorage
```

### Test 2: Create Ticket
```
1. Create new ticket from dashboard
2. Should save to database
3. Should send confirmation email
4. Check email logs in database:
   SELECT * FROM dbo.EmailLogs WHERE action = 'Ticket Created';
```

### Test 3: Update Ticket (IT Staff)
```
1. As IT Staff, open a ticket
2. Update status to "In Progress"
3. Should send email to requester
4. Check EmailLogs table
```

### Test 4: Email Verification
```sql
-- Check all sent emails
SELECT * FROM dbo.EmailLogs ORDER BY sent_at DESC;

-- Check failed emails (for retry)
SELECT * FROM dbo.EmailLogs WHERE status = 'Failed';

-- Get email stats
EXEC sp_GetEmailStats;
```

---

## 🐛 TROUBLESHOOTING

### Issue: Email not sending
**Cause:** SMTP credentials invalid
**Fix:**
1. Check .env credentials
2. Test SMTP connection:
   ```bash
   telnet smtp.dci.daikin.co.jp 587
   ```
3. Enable "Less secure apps" (Gmail)
4. Use App Password (Gmail, Office365)

### Issue: User not syncing
**Cause:** Database connection error
**Fix:**
1. Verify DB_HOST, DB_USER in .env
2. Check SQL Server is running
3. Test connection in SSMS

### Issue: Token expired
**Cause:** Token set to 1h expiry
**Fix:**
1. Clear localStorage
2. Login again
3. Or increase JWT expiry in authController (dev only)

### Issue: "Only CC 7510 allowed"
**Cause:** User's cost center is not 7510
**Fix:**
1. Check user's cost_center in Daikin AD
2. Only IT Staff (CC 7510) can access
3. Update `costCenter !== '7510'` check if needed

---

## 📊 DATABASE QUERIES (Useful)

```sql
-- Get all users
SELECT * FROM dbo.Users;

-- Get all tickets
SELECT * FROM dbo.Tickets ORDER BY created_at DESC;

-- Get IT staff users
SELECT * FROM dbo.Users WHERE cost_center = '7510';

-- Get a user's tickets
SELECT * FROM dbo.Tickets WHERE empCode_created = 'EMP001';

-- Get pending tickets
SELECT * FROM dbo.Tickets WHERE status = 'Pending';

-- Get email statistics
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'Sent' THEN 1 ELSE 0 END) as sent,
    SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failed
FROM dbo.EmailLogs;

-- Clear cache (manual refresh)
-- No direct command, just restart backend

-- Delete old email logs (keep 90 days)
DELETE FROM dbo.EmailLogs WHERE sent_at < DATEADD(DAY, -90, GETDATE());
```

---

## ✅ FINAL CHECKLIST

- [ ] Database schema created
- [ ] Sample users inserted
- [ ] .env configured with SMTP credentials
- [ ] Backend files copied and organized
- [ ] Frontend files copied and updated
- [ ] All imports verified
- [ ] Backend server starts: `npm start`
- [ ] Frontend dev server starts: `npm run dev`
- [ ] Login test successful
- [ ] Email test successful (check inbox)
- [ ] Ticket creation saves to database
- [ ] Ticket update sends email
- [ ] Email logs table populated

---

## 🚀 NEXT STEPS (After working setup)

1. Deploy to production
2. Configure real domain/email
3. Setup automated email retry (for failed emails)
4. Add email statistics dashboard
5. Implement comment system
6. Add attachment uploads
7. Create IT Staff admin panel
8. Setup email templates customization
9. Add SMS notifications (optional)
10. Create API documentation

---

## 📞 SUPPORT

If something breaks:
1. Check console errors (browser + terminal)
2. Check email logs: `SELECT * FROM dbo.EmailLogs;`
3. Check database: Tables exist + data populated?
4. Check .env: All credentials correct?
5. Restart backend + frontend
6. Clear browser cache + localStorage
7. Check network tab (Postman/DevTools)

Good luck! 🎉
