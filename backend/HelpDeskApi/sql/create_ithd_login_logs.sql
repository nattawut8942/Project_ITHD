-- ประวัติการ login ของทุกคน (ทั้งสำเร็จและล้มเหลว)
-- ไม่เก็บรหัสผ่านเด็ดขาด เก็บเฉพาะชื่อผู้ใช้ที่พิมพ์และผลลัพธ์
-- ไม่มีงานลบอัตโนมัติ (เก็บตลอดไปตามที่ตกลงไว้)
-- รันได้ซ้ำอย่างปลอดภัย (idempotent)

IF OBJECT_ID(N'dbo.ithd_login_logs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ithd_login_logs (
        id          BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        empCode     NVARCHAR(20)  NULL,            -- ว่างได้ถ้า login ล้มเหลวก่อนรู้รหัสพนักงาน
        username    NVARCHAR(100) NOT NULL,        -- ชื่อที่พิมพ์ตอน login (ไม่มีรหัสผ่าน)
        success     BIT           NOT NULL,
        reason      NVARCHAR(200) NULL,            -- success, invalid_credentials, ad_timeout, ad_unavailable, error
        ip_address  NVARCHAR(64)  NULL,
        user_agent  NVARCHAR(400) NULL,
        logged_at   DATETIME2(0)  NOT NULL CONSTRAINT DF_ithd_login_logs_logged_at DEFAULT SYSDATETIME()
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ithd_login_logs_emp_time' AND object_id = OBJECT_ID(N'dbo.ithd_login_logs'))
    CREATE INDEX IX_ithd_login_logs_emp_time ON dbo.ithd_login_logs (empCode, logged_at DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ithd_login_logs_time' AND object_id = OBJECT_ID(N'dbo.ithd_login_logs'))
    CREATE INDEX IX_ithd_login_logs_time ON dbo.ithd_login_logs (logged_at DESC);
