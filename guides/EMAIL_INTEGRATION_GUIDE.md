// EMAIL INTEGRATION GUIDE - IT Service Desk

## 📧 EMAIL FEATURE OVERVIEW

### Actions that send emails:

1. **✅ CREATE Ticket**
   - Send to: Requester (user)
   - Template: Ticket created confirmation
   - Contains: Full ticket details + reference ID

2. **✅ UPDATE Ticket Status**
   - Send to: Requester (user)
   - Template: Status update notification
   - Contains: Old status → New status, notes from IT team

3. **✅ ASSIGN Ticket to Staff**
   - Send to: IT Staff member
   - Template: New ticket assigned
   - Contains: Full ticket details + requester info

4. **✅ COMPLETE Ticket**
   - Send to: Requester (user)
   - Template: Ticket completed notification
   - Contains: Completion details + final notes

5. **✅ DELETE Ticket**
   - Send to: Requester (user)
   - Template: Cancellation notice
   - Contains: Ticket ID + cancellation reason

---

## 🔧 SETUP INSTRUCTIONS

### Step 1: Install Nodemailer
```bash
npm install nodemailer
```

### Step 2: Configure Email Provider

Choose ONE of these options:

#### Option A: Daikin Internal SMTP (RECOMMENDED)
```javascript
// .env
SMTP_HOST=smtp.dci.daikin.co.jp
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@dci.daikin.co.jp
EMAIL_PASSWORD=your-password
EMAIL_FROM="IT Service Desk <your-email@dci.daikin.co.jp>"
```

#### Option B: Gmail
1. Enable 2FA in Google Account
2. Generate App Password (16 characters)
3. Add to .env:
```javascript
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM="IT Service Desk <your-email@gmail.com>"
```

#### Option C: Office 365
```javascript
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
EMAIL_FROM="IT Service Desk <your-email@outlook.com>"
```

### Step 3: File Structure

Create these files:
```
backend/src/
├── config/
│   └── email.js          (NEW) - Email transporter config
├── controller/
│   └── ticketController.js  (UPDATE) - Add email sending
├── utils/
│   └── emailTemplates.js    (NEW) - HTML email templates
└── .env                      (UPDATE) - Add email vars
```

### Step 4: Update Database (Optional)

Store user emails for faster lookups:
```sql
ALTER TABLE dbo.Tickets
ADD requester_email NVARCHAR(255);

CREATE TABLE dbo.Users (
    empCode NVARCHAR(50) PRIMARY KEY,
    email NVARCHAR(255),
    name NVARCHAR(255)
);
```

---

## 📝 FILE MAPPING

1. **backend_emailConfig.js**
   → Save as: `/backend/src/config/email.js`
   - Handles SMTP connection
   - `sendEmail()` function

2. **backend_emailTemplates.js**
   → Save as: `/backend/src/utils/emailTemplates.js`
   - HTML email designs
   - Different templates for each action
   - Color-coded status indicators

3. **backend_ticketController_WithEmail.js**
   → Replace: `/backend/src/controller/ticketController.js`
   - Calls `sendEmail()` after each action
   - Integrates with templates
   - Handles errors gracefully

4. **backend_env_example.txt**
   → Copy to: `/backend/.env`
   - Fill in your SMTP credentials
   - Choose email provider

---

## 🚀 USAGE EXAMPLES

### Sending email in controller:
```javascript
import { sendEmail } from '../config/email.js';
import { ticketCreatedTemplate } from '../utils/emailTemplates.js';

// In createTicket controller:
const emailTemplate = ticketCreatedTemplate(ticket, userName);
const result = await sendEmail(
    userEmail,
    emailTemplate.subject,
    emailTemplate.html
);

if (result.success) {
    console.log('📧 Email sent:', result.messageId);
} else {
    console.error('❌ Email failed:', result.error);
    // Don't fail the ticket creation if email fails
}
```

---

## 🧪 TESTING EMAIL

### Test 1: Check SMTP Connection
```javascript
// backend/src/routes/debugRoute.js
router.get('/test-email', async (req, res) => {
    const result = await sendEmail(
        'test@example.com',
        'Test Email',
        '<p>This is a test email</p>'
    );
    res.json(result);
});
```

### Test 2: Send Test to Yourself
Use Postman to POST /tickets with test data:
```json
{
    "request_type": "Hardware Setup",
    "project_name": "Test Ticket",
    "location": "Test Location",
    "priority": "Normal"
}
```
Check your inbox for confirmation email

### Test 3: Check Email Logs
```bash
# Enable debug logging
NODE_DEBUG=nodemailer:* npm start
```

---

## 📋 EMAIL CONTENT CHECKLIST

Each email template includes:

✅ Professional header with logo/colors
✅ Clear subject line with ticket ID
✅ Personalized greeting (Hi [Name])
✅ Main action description
✅ Ticket details table with:
   - Ticket ID
   - Request type
   - Project name
   - Location
   - Priority (color-coded)
   - Status (color-coded)
   - Target date
✅ Notes from IT team (if applicable)
✅ Footer with timestamp and reference
✅ Call-to-action or next steps
✅ Branding (Daikin Thailand)

---

## 🔒 SECURITY NOTES

1. **Never commit .env file** - use .env.example
2. **Use App Passwords** - not your actual email password
3. **SMTP_SECURE=false** - only for internal SMTP (port 587)
   - Use SMTP_SECURE=true for port 465 (Gmail, Office 365)
4. **Rate limiting** - Don't spam emails
5. **Error handling** - Email failure shouldn't break ticket creation

---

## 📊 EMAIL STATISTICS

Track email sending success in database (optional):
```sql
CREATE TABLE dbo.EmailLogs (
    id INT PRIMARY KEY IDENTITY(1,1),
    ticket_id INT,
    recipient_email NVARCHAR(255),
    action NVARCHAR(50),
    status NVARCHAR(20),
    message_id NVARCHAR(255),
    sent_at DATETIME DEFAULT GETDATE()
);
```

Update controller to log:
```javascript
const pool = getPool();
await pool.request()
    .input('ticket_id', sql.Int, ticketId)
    .input('email', sql.NVarChar, recipientEmail)
    .input('action', sql.NVarChar, 'Ticket Created')
    .input('status', sql.NVarChar, result.success ? 'Sent' : 'Failed')
    .input('message_id', sql.NVarChar, result.messageId || '')
    .query(`INSERT INTO dbo.EmailLogs (ticket_id, recipient_email, action, status, message_id)
            VALUES (@ticket_id, @email, @action, @status, @message_id)`);
```

---

## 🐛 COMMON ISSUES & FIXES

### Issue: "SMTP connection refused"
**Fix**: Check SMTP_HOST and SMTP_PORT in .env
```bash
# Test SMTP connection
telnet smtp.dci.daikin.co.jp 587
```

### Issue: "Authentication failed"
**Fix**: Verify EMAIL_USER and EMAIL_PASSWORD
```bash
# For Gmail: Use 16-character App Password, not your account password
# For Office365: Enable less secure apps or use App Password
```

### Issue: "Email sent but never received"
**Fix**: Check spam folder, verify recipient email format

### Issue: "Can't get email address by empCode"
**Fix**: Update the `getEmailByEmpCode()` function:
```javascript
// If you don't have Users table, fallback to:
const getEmailByEmpCode = async (empCode) => {
    // Query Daikin API to get email?
    // Or construct from empCode format
    return `${empCode.toLowerCase()}@dci.daikin.co.jp`;
};
```

---

## ✅ NEXT STEPS

- [ ] Copy email config files
- [ ] Install nodemailer: `npm install nodemailer`
- [ ] Update .env with SMTP credentials
- [ ] Test email sending
- [ ] Deploy to production
- [ ] Monitor email delivery
- [ ] Add email statistics tracking
