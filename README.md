# IT Service Desk - Complete Package

## 📁 Folder Structure

```
.
├── backend/              # Backend Node.js files
│   ├── authController.js
│   ├── authMiddleware.js
│   ├── emailConfig.js
│   ├── emailLogService.js
│   ├── emailTemplates.js
│   ├── ticketController.js
│   ├── ticketRoute.js
│   ├── userService.js
│   └── .env.example
│
├── frontend/             # Frontend React Vite files
│   ├── App.jsx
│   ├── AuthContext.jsx
│   ├── LoginPage.jsx
│   ├── ProtectedRoute.jsx
│   ├── apiClient.js
│   └── ITServiceDesk.jsx
│
├── database/             # Database schema
│   └── schema.sql
│
└── guides/               # Documentation & guides
    ├── COMPLETE_SETUP_GUIDE.md
    ├── INTEGRATION_CHECKLIST.md
    ├── EMAIL_INTEGRATION_GUIDE.md
    └── TABLE_NAMING_REFERENCE.md
```

## 🚀 Quick Start

### 1. Database Setup
```bash
# Open SQL Server Management Studio
# Execute: database/schema.sql
```

### 2. Backend Setup
```bash
cd your-backend-project

# Copy files
cp -r /path/to/backend/src/ .
cp backend/.env.example .env

# Install dependencies
npm install nodemailer

# Edit .env with your SMTP credentials
# Then start
npm start
```

### 3. Frontend Setup
```bash
cd your-frontend-project

# Copy files
cp -r /path/to/frontend/src/ .

# Install & run
npm install
npm run dev
```

## 📖 Documentation

- **COMPLETE_SETUP_GUIDE.md** - Step-by-step setup instructions
- **INTEGRATION_CHECKLIST.md** - Integration tasks checklist
- **EMAIL_INTEGRATION_GUIDE.md** - Email setup & configuration
- **TABLE_NAMING_REFERENCE.md** - Database table naming convention

## ✨ Features

✅ Authentication with Daikin AD API
✅ JWT token management
✅ Email notifications for all actions
✅ Cost Center 7510 (IT Staff) access control
✅ Beautiful HTML email templates
✅ Email logging & tracking
✅ User auto-sync to database
✅ Responsive UI with Tailwind CSS

## 📋 Tables Used

- `dbo.ithd_users` - User management
- `dbo.ithd_tickets` - Ticket management
- `dbo.ithd_email_logs` - Email tracking
- `dbo.ithd_comments` - Comments (optional)

Happy coding! 🎉
