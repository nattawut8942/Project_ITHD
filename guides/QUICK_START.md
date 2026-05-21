# IT SERVICE DESK - QUICK START GUIDE ⚡

## 📦 What You Got

```
├── ithd-backend/          # Node.js backend with email & database
├── ithd-frontend/         # React Vite frontend with auth
└── guides/                # Documentation
    ├── COMPLETE_SETUP_GUIDE.md
    ├── EMAIL_INTEGRATION_GUIDE.md
    ├── INTEGRATION_CHECKLIST.md
    └── TABLE_NAMING_REFERENCE.md
```

---

## 🚀 QUICK START (3 STEPS)

### Step 1️⃣: Database Setup (5 minutes)
```bash
# Open SQL Server Management Studio
# 1. Connect to your database
# 2. Open ithd-backend/database/schema.sql
# 3. Execute the script
# Done! ✅ Tables created: dbo.ithd_users, dbo.ithd_tickets, dbo.ithd_email_logs, dbo.ithd_comments
```

### Step 2️⃣: Backend Setup (10 minutes)
```bash
cd your-backend-project

# Copy files
cp -r ithd-backend/src/* src/

# Setup environment
cp ithd-backend/.env.example .env
# Edit .env with your SMTP credentials

# Install email library
npm install nodemailer

# Update server.js (add these lines):
# import ticketRoute from './route/ticketRoute.js';
# app.use('/api', ticketRoute);

# Start
npm start
# Backend running at http://localhost:3000 ✅
```

### Step 3️⃣: Frontend Setup (10 minutes)
```bash
cd your-frontend-project

# Copy files
cp -r ithd-frontend/src/* src/

# Setup environment
echo 'VITE_API_BASE=http://localhost:3000/api' >> .env

# Install (if needed)
npm install
npm install react-router-dom

# Start
npm run dev
# Frontend running at http://localhost:5173 ✅
```

---

## ✅ VERIFY EVERYTHING WORKS

### Test 1: Login
```
1. Go to http://localhost:5173/login
2. Enter Daikin AD username/password
3. Click Login
4. Should redirect to dashboard ✅
```

### Test 2: Create Ticket
```
1. On dashboard, fill ticket form
2. Click "Create Ticket"
3. Should appear in list ✅
4. Check your email for confirmation ✅
```

### Test 3: Database
```sql
-- Open SQL Server Management Studio
SELECT * FROM dbo.ithd_tickets;
SELECT * FROM dbo.ithd_email_logs;
-- Should see your ticket and email log ✅
```

---

## 📁 FOLDER MAPPING

### Backend Files Location

| File | Goes To |
|------|---------|
| `src/config/emailConfig.js` | `your-backend/src/config/` |
| `src/controller/authController.js` | `your-backend/src/controller/` |
| `src/controller/ticketController.js` | `your-backend/src/controller/` |
| `src/middleware/authMiddleware.js` | `your-backend/src/middleware/` |
| `src/route/ticketRoute.js` | `your-backend/src/route/` |
| `src/services/userService.js` | `your-backend/src/services/` |
| `src/services/emailLogService.js` | `your-backend/src/services/` |
| `src/utils/emailTemplates.js` | `your-backend/src/utils/` |
| `database/schema.sql` | Run in SQL Server |
| `.env.example` | Copy to `.env` and edit |

### Frontend Files Location

| File | Goes To |
|------|---------|
| `src/App.jsx` | `your-frontend/src/` |
| `src/context/AuthContext.jsx` | `your-frontend/src/context/` |
| `src/pages/LoginPage.jsx` | `your-frontend/src/pages/` |
| `src/pages/ITServiceDesk.jsx` | `your-frontend/src/pages/` |
| `src/components/ProtectedRoute.jsx` | `your-frontend/src/components/` |
| `src/utils/apiClient.js` | `your-frontend/src/utils/` |

---

## 🔧 ENVIRONMENT VARIABLES

### Backend (.env)

```env
# Database
DB_HOST=your-sql-server
DB_USER=sa
DB_PASS=your-password
DB_NAME=YourDatabase

# JWT
JWT_SECRET=your-secret-key

# Email - Choose ONE:
# Daikin SMTP (RECOMMENDED)
SMTP_HOST=smtp.dci.daikin.co.jp
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@dci.daikin.co.jp
EMAIL_PASSWORD=your-password
EMAIL_FROM="IT Service Desk <your-email@dci.daikin.co.jp>"

# Server
PORT=3000
NODE_ENV=development
```

### Frontend (.env)

```env
VITE_API_BASE=http://localhost:3000/api
```

---

## 📊 WHAT'S INCLUDED

### Backend Features ✅
- ✅ Daikin AD API integration
- ✅ JWT authentication (1hr expiry)
- ✅ Cost Center 7510 access control
- ✅ User auto-sync to database
- ✅ CRUD for tickets
- ✅ 4 email notification types
- ✅ Email logging & tracking
- ✅ In-memory user caching

### Frontend Features ✅
- ✅ Login/logout
- ✅ Protected routes
- ✅ Ticket dashboard
- ✅ Create/Edit/Delete tickets
- ✅ IT Staff-only features
- ✅ Email-style notifications
- ✅ Responsive design
- ✅ localStorage token management

### Database ✅
- ✅ dbo.ithd_users (user management)
- ✅ dbo.ithd_tickets (ticket storage)
- ✅ dbo.ithd_email_logs (email tracking)
- ✅ dbo.ithd_comments (for future use)
- ✅ Stored procedures
- ✅ Foreign keys & indexes

---

## 🎯 USER ROLES

### IT Staff (Cost Center 7510)
✅ View ALL tickets
✅ Edit any ticket
✅ Delete tickets
✅ Assign to staff
✅ Update status
✅ See statistics

### End Users (Other Cost Centers)
✅ View OWN tickets
✅ Create tickets
✅ View details
❌ Edit/Delete others' tickets

---

## 📧 EMAIL NOTIFICATIONS

Automatic emails sent for:
1. **Ticket Created** → Confirmation to requester
2. **Status Updated** → Update to requester
3. **Assigned to Staff** → Assignment notification
4. **Ticket Completed** → Completion notice

All emails:
- Have professional HTML design
- Include Daikin branding
- Are logged to database
- Sent automatically (no manual action needed)

---

## 🐛 IF SOMETHING BREAKS

| Problem | Solution |
|---------|----------|
| "Cannot connect to database" | Check DB_HOST, DB_USER in .env |
| "Email not sending" | Check SMTP credentials, run `telnet smtp.dci.daikin.co.jp 587` |
| "Login fails" | Backend running? Credentials correct? Check console |
| "Token expired" | Refresh page, login again |
| "Only CC 7510 allowed" | User not in IT department |

---

## 📚 DETAILED GUIDES

For more detailed setup, read:
- `ithd-backend/README.md` - Backend details
- `ithd-frontend/README.md` - Frontend details
- `guides/COMPLETE_SETUP_GUIDE.md` - Step-by-step
- `guides/EMAIL_INTEGRATION_GUIDE.md` - Email setup
- `guides/TABLE_NAMING_REFERENCE.md` - Database tables

---

## 🎉 YOU'RE DONE!

Everything is ready to use!

Next:
1. ✅ Run database schema
2. ✅ Setup backend
3. ✅ Setup frontend
4. ✅ Test login
5. ✅ Create ticket
6. ✅ Check email
7. 🚀 Deploy to production!

Questions? Check the detailed guides or your backend console logs.

Good luck! 🚀
