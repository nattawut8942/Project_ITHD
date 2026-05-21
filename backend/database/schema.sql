-- backend/database/schema.sql (UPDATED)
-- IT Service Desk Database Schema with dbo.ithd_ prefix

-- ============================================
-- TABLE 1: dbo.ithd_users (User management)
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ithd_users' AND xtype='U')
BEGIN
    CREATE TABLE dbo.ithd_users (
        empCode NVARCHAR(50) PRIMARY KEY,
        email NVARCHAR(255) NOT NULL UNIQUE,
        name NVARCHAR(255) NOT NULL,
        cost_center NVARCHAR(10),
        sect NVARCHAR(100),
        created_at DATETIME DEFAULT GETDATE()
    );
    
    CREATE INDEX idx_ithd_users_email ON dbo.ithd_users(email);
    PRINT '✅ dbo.ithd_users table created successfully';
END
ELSE
BEGIN
    PRINT 'dbo.ithd_users table already exists';
END;

-- ============================================
-- TABLE 2: dbo.ithd_tickets (Main tickets)
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ithd_tickets' AND xtype='U')
BEGIN
    CREATE TABLE dbo.ithd_tickets (
        id INT PRIMARY KEY IDENTITY(1,1),
        req_id NVARCHAR(50) UNIQUE NOT NULL,
        request_type NVARCHAR(100) NOT NULL DEFAULT 'Hardware Setup',
        project_name NVARCHAR(255) NOT NULL,
        requester_name NVARCHAR(255),
        requester_email NVARCHAR(255),
        empCode_created NVARCHAR(50) NOT NULL,
        empCode_assigned NVARCHAR(50),
        cost_center NVARCHAR(10),
        device_type NVARCHAR(100),
        device_count INT DEFAULT 1,
        location NVARCHAR(255) NOT NULL,
        status NVARCHAR(50) DEFAULT 'Pending',  -- Pending, In Progress, Completed, Rejected
        priority NVARCHAR(50) DEFAULT 'Normal', -- Normal, Medium, High, Critical
        target_date DATETIME,
        notes NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        completed_at DATETIME,
        
        -- Foreign key to dbo.ithd_users
        CONSTRAINT fk_ithd_tickets_created FOREIGN KEY (empCode_created) 
            REFERENCES dbo.ithd_users(empCode),
        CONSTRAINT fk_ithd_tickets_assigned FOREIGN KEY (empCode_assigned) 
            REFERENCES dbo.ithd_users(empCode)
    );
    
    -- Indexes for faster queries
    CREATE INDEX idx_ithd_tickets_created ON dbo.ithd_tickets(empCode_created);
    CREATE INDEX idx_ithd_tickets_assigned ON dbo.ithd_tickets(empCode_assigned);
    CREATE INDEX idx_ithd_tickets_status ON dbo.ithd_tickets(status);
    CREATE INDEX idx_ithd_tickets_priority ON dbo.ithd_tickets(priority);
    CREATE INDEX idx_ithd_tickets_created_at ON dbo.ithd_tickets(created_at DESC);
    CREATE INDEX idx_ithd_tickets_req_id ON dbo.ithd_tickets(req_id);
    
    PRINT '✅ dbo.ithd_tickets table created successfully';
END
ELSE
BEGIN
    PRINT 'dbo.ithd_tickets table already exists';
END;

-- ============================================
-- TABLE 3: dbo.ithd_email_logs (Email tracking)
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ithd_email_logs' AND xtype='U')
BEGIN
    CREATE TABLE dbo.ithd_email_logs (
        id INT PRIMARY KEY IDENTITY(1,1),
        ticket_id INT,
        recipient_email NVARCHAR(255) NOT NULL,
        action NVARCHAR(100),  -- Ticket Created, Status Updated, etc.
        email_subject NVARCHAR(255),
        status NVARCHAR(20),   -- Sent, Failed, Pending
        message_id NVARCHAR(255),
        error_message NVARCHAR(MAX),
        sent_at DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT fk_ithd_email_logs_ticket FOREIGN KEY (ticket_id)
            REFERENCES dbo.ithd_tickets(id) ON DELETE CASCADE
    );
    
    CREATE INDEX idx_ithd_email_logs_ticket ON dbo.ithd_email_logs(ticket_id);
    CREATE INDEX idx_ithd_email_logs_recipient ON dbo.ithd_email_logs(recipient_email);
    CREATE INDEX idx_ithd_email_logs_status ON dbo.ithd_email_logs(status);
    CREATE INDEX idx_ithd_email_logs_sent_at ON dbo.ithd_email_logs(sent_at DESC);
    
    PRINT '✅ dbo.ithd_email_logs table created successfully';
END
ELSE
BEGIN
    PRINT 'dbo.ithd_email_logs table already exists';
END;

-- ============================================
-- TABLE 4: dbo.ithd_comments (Ticket comments)
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ithd_comments' AND xtype='U')
BEGIN
    CREATE TABLE dbo.ithd_comments (
        id INT PRIMARY KEY IDENTITY(1,1),
        ticket_id INT NOT NULL,
        empCode NVARCHAR(50) NOT NULL,
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT fk_ithd_comments_ticket FOREIGN KEY (ticket_id)
            REFERENCES dbo.ithd_tickets(id) ON DELETE CASCADE,
        CONSTRAINT fk_ithd_comments_user FOREIGN KEY (empCode)
            REFERENCES dbo.ithd_users(empCode)
    );
    
    CREATE INDEX idx_ithd_comments_ticket ON dbo.ithd_comments(ticket_id);
    CREATE INDEX idx_ithd_comments_date ON dbo.ithd_comments(created_at DESC);
    
    PRINT '✅ dbo.ithd_comments table created successfully';
END
ELSE
BEGIN
    PRINT 'dbo.ithd_comments table already exists';
END;

-- ============================================
-- SAMPLE DATA (For testing)
-- ============================================

-- Insert sample users
IF NOT EXISTS (SELECT 1 FROM dbo.ithd_users WHERE empCode = 'EMP001')
BEGIN
    INSERT INTO dbo.ithd_users (empCode, email, name, cost_center, sect)
    VALUES 
        ('EMP001', 'natthawut.y@dci.daikin.co.jp', 'Natthawut Y.', '7510', 'IT'),
        ('EMP002', 'namnueng.y@dci.daikin.co.jp', 'Namnueng Y.', '7510', 'IT'),
        ('EMP003', 'somdet.s@dci.daikin.co.jp', 'Somdet S.', '8200', 'Design'),
        ('EMP004', 'wichai.t@dci.daikin.co.jp', 'Wichai T.', '7100', 'HR');
    
    PRINT '✅ Sample users inserted into dbo.ithd_users';
END;

-- ============================================
-- STORED PROCEDURES (Optional - for common queries)
-- ============================================

-- Get user email and name by empCode
CREATE OR ALTER PROCEDURE sp_ithd_GetUserByEmpCode
    @empCode NVARCHAR(50)
AS
BEGIN
    SELECT empCode, email, name, cost_center
    FROM dbo.ithd_users
    WHERE empCode = @empCode;
END;

-- Get ticket with user details
CREATE OR ALTER PROCEDURE sp_ithd_GetTicketWithDetails
    @ticketId INT
AS
BEGIN
    SELECT 
        t.id,
        t.req_id,
        t.request_type,
        t.project_name,
        t.requester_name,
        t.requester_email,
        t.empCode_created,
        t.empCode_assigned,
        t.cost_center,
        t.device_type,
        t.device_count,
        t.location,
        t.status,
        t.priority,
        t.target_date,
        t.notes,
        t.created_at,
        t.updated_at,
        u_created.name as created_by_name,
        u_created.email as created_by_email,
        u_assigned.name as assigned_to_name,
        u_assigned.email as assigned_to_email
    FROM dbo.ithd_tickets t
    LEFT JOIN dbo.ithd_users u_created ON t.empCode_created = u_created.empCode
    LEFT JOIN dbo.ithd_users u_assigned ON t.empCode_assigned = u_assigned.empCode
    WHERE t.id = @ticketId;
END;

-- Get all tickets with user details (paginated)
CREATE OR ALTER PROCEDURE sp_ithd_GetTicketsWithDetails
    @empCode NVARCHAR(50) = NULL,
    @isITStaff BIT = 0,
    @pageSize INT = 20,
    @pageNumber INT = 1
AS
BEGIN
    DECLARE @offset INT = (@pageNumber - 1) * @pageSize;
    
    SELECT 
        t.id,
        t.req_id,
        t.request_type,
        t.project_name,
        t.requester_name,
        t.requester_email,
        t.empCode_created,
        t.cost_center,
        t.device_type,
        t.device_count,
        t.location,
        t.status,
        t.priority,
        t.target_date,
        t.created_at,
        t.updated_at,
        u.name as created_by_name,
        u.email as created_by_email
    FROM dbo.ithd_tickets t
    LEFT JOIN dbo.ithd_users u ON t.empCode_created = u.empCode
    WHERE 
        CASE 
            WHEN @isITStaff = 1 THEN 1 = 1  -- IT Staff sees all
            ELSE t.empCode_created = @empCode  -- User sees only own
        END
    ORDER BY t.created_at DESC
    OFFSET @offset ROWS
    FETCH NEXT @pageSize ROWS ONLY;
END;

-- Get email statistics
CREATE OR ALTER PROCEDURE sp_ithd_GetEmailStats
AS
BEGIN
    SELECT 
        COUNT(*) as total_emails,
        SUM(CASE WHEN status = 'Sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        COUNT(DISTINCT recipient_email) as unique_recipients,
        COUNT(DISTINCT ticket_id) as tickets_with_emails
    FROM dbo.ithd_email_logs;
END;

-- Get ticket statistics
CREATE OR ALTER PROCEDURE sp_ithd_GetTicketStats
    @empCode NVARCHAR(50) = NULL,
    @isITStaff BIT = 0
AS
BEGIN
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
    FROM dbo.ithd_tickets
    WHERE 
        CASE 
            WHEN @isITStaff = 1 THEN 1 = 1
            ELSE empCode_created = @empCode
        END;
END;

PRINT '✅ ALL DATABASE OBJECTS CREATED SUCCESSFULLY!';
PRINT '📋 Tables: dbo.ithd_users, dbo.ithd_tickets, dbo.ithd_email_logs, dbo.ithd_comments';
PRINT '🔧 Procedures: sp_ithd_GetUserByEmpCode, sp_ithd_GetTicketWithDetails, sp_ithd_GetTicketsWithDetails, sp_ithd_GetEmailStats, sp_ithd_GetTicketStats';
