-- เพิ่มข้อมูลสรุปการเข้าสู่ระบบในตารางผู้ใช้ ithd_users
-- รายละเอียดทุกครั้งยังอยู่ใน dbo.ithd_login_logs
-- รันซ้ำได้ปลอดภัย (idempotent)

IF COL_LENGTH('dbo.ithd_users', 'LastLoginAt') IS NULL
    ALTER TABLE dbo.ithd_users ADD LastLoginAt DATETIME2(0) NULL;

IF COL_LENGTH('dbo.ithd_users', 'LoginCount') IS NULL
    ALTER TABLE dbo.ithd_users ADD LoginCount INT NOT NULL
        CONSTRAINT DF_ithd_users_LoginCount DEFAULT 0;

IF COL_LENGTH('dbo.ithd_users', 'LastLoginIp') IS NULL
    ALTER TABLE dbo.ithd_users ADD LastLoginIp NVARCHAR(64) NULL;

IF COL_LENGTH('dbo.ithd_users', 'LastUserAgent') IS NULL
    ALTER TABLE dbo.ithd_users ADD LastUserAgent NVARCHAR(400) NULL;

IF COL_LENGTH('dbo.ithd_users', 'Position') IS NULL
    ALTER TABLE dbo.ithd_users ADD Position NVARCHAR(100) NULL;

IF COL_LENGTH('dbo.ithd_users', 'IsActive') IS NULL
    ALTER TABLE dbo.ithd_users ADD IsActive BIT NOT NULL
        CONSTRAINT DF_ithd_users_IsActive DEFAULT 1;
