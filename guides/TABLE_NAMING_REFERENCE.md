// TABLE NAMING CONVENTION - QUICK REFERENCE
// ============================================

## 📋 ALL TABLE NAMES WITH dbo.ithd_ PREFIX

### Main Tables:
```
OLD NAME                  →  NEW NAME
========================================
dbo.Users                →  dbo.ithd_users
dbo.Tickets              →  dbo.ithd_tickets
dbo.EmailLogs            →  dbo.ithd_email_logs
dbo.TicketComments       →  dbo.ithd_comments
dbo.Stock_UserRole       →  (unchanged - existing)
```

### Stored Procedures:
```
OLD NAME                           →  NEW NAME
================================================
sp_GetUserByEmpCode               →  sp_ithd_GetUserByEmpCode
sp_GetTicketWithDetails           →  sp_ithd_GetTicketWithDetails
sp_GetTicketsWithDetails          →  sp_ithd_GetTicketsWithDetails
sp_GetEmailStats                  →  sp_ithd_GetEmailStats
sp_GetTicketStats                 →  sp_ithd_GetTicketStats
```

---

## 🔄 FILE REPLACEMENTS

Replace these files in your backend with the UPDATED versions:

| File to Replace | New File | Change |
|-----------------|----------|--------|
| `/src/database/schema.sql` | `database_schema_UPDATED.sql` | All table names |
| `/src/services/userService.js` | `backend_userService_UPDATED.js` | dbo.ithd_users |
| `/src/services/emailLogService.js` | `backend_emailLogService_UPDATED.js` | dbo.ithd_email_logs |
| `/src/controller/ticketController.js` | `backend_ticketController_UPDATED.js` | dbo.ithd_tickets |

---

## 📝 SQL QUERIES WITH NEW TABLE NAMES

```sql
-- Get all users
SELECT * FROM dbo.ithd_users;

-- Get all tickets
SELECT * FROM dbo.ithd_tickets ORDER BY created_at DESC;

-- Get all email logs
SELECT * FROM dbo.ithd_email_logs ORDER BY sent_at DESC;

-- Get a user's tickets
SELECT * FROM dbo.ithd_tickets WHERE empCode_created = 'EMP001';

-- Get pending tickets
SELECT * FROM dbo.ithd_tickets WHERE status = 'Pending';

-- Get email statistics
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'Sent' THEN 1 ELSE 0 END) as sent,
    SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failed
FROM dbo.ithd_email_logs;

-- Get ticket statistics
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
FROM dbo.ithd_tickets;

-- Get ticket with user details
EXEC sp_ithd_GetTicketWithDetails @ticketId = 1;

-- Get user by empCode
EXEC sp_ithd_GetUserByEmpCode @empCode = 'EMP001';
```

---

## ✅ MIGRATION CHECKLIST

- [ ] Run `database_schema_UPDATED.sql` to create tables with new names
- [ ] Replace `userService.js` with `backend_userService_UPDATED.js`
- [ ] Replace `emailLogService.js` with `backend_emailLogService_UPDATED.js`
- [ ] Replace `ticketController.js` with `backend_ticketController_UPDATED.js`
- [ ] Update any other references to old table names
- [ ] Test database queries
- [ ] Test API endpoints
- [ ] Verify email logs are saved

---

## 🔍 VERIFY CHANGES

After migration, check:

```sql
-- List all tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME LIKE 'ithd_%'
ORDER BY TABLE_NAME;

-- Should see:
-- ithd_comments
-- ithd_email_logs
-- ithd_tickets
-- ithd_users

-- Count rows in each table
SELECT 'ithd_users' as table_name, COUNT(*) as row_count FROM dbo.ithd_users
UNION ALL
SELECT 'ithd_tickets', COUNT(*) FROM dbo.ithd_tickets
UNION ALL
SELECT 'ithd_email_logs', COUNT(*) FROM dbo.ithd_email_logs
UNION ALL
SELECT 'ithd_comments', COUNT(*) FROM dbo.ithd_comments;
```

---

## ⚠️ IMPORTANT NOTES

1. **Old tables can be kept or deleted** - The new tables are independent
2. **Foreign keys are updated** - All relationships point to dbo.ithd_* tables
3. **Indexes are renamed** - All indexes now follow dbo.ithd_* naming
4. **Procedures are updated** - All stored procedures reference new table names
5. **No data migration needed** - This is a fresh setup (sample data included in schema)

---

## 🚀 NEXT STEPS

1. Run the schema script
2. Replace the 4 service/controller files
3. Restart backend server
4. Test login → ticket creation → email sending
5. Verify data in dbo.ithd_* tables

Good to go! ✅
