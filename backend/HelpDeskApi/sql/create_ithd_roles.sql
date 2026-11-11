-- ระบบบทบาท (role) และสิทธิ์ (permission) ของ ITHD
-- รันซ้ำได้ปลอดภัย (idempotent)
-- ค่าเริ่มต้น:
--   * admin    : ได้ทุกสิทธิ์ และจัดการสิทธิ์ของคนอื่นได้
--   * it_staff : คนที่ cost_center = '7510' (พฤติกรรมเดิมไม่เปลี่ยน)
--   * user     : ไม่มีสิทธิ์พิเศษ
--   * ผู้ที่อยู่ใน dbo.Stock_UserRole ได้บทบาท admin ด้วย (ไม่ให้สิทธิ์ที่มีอยู่หายไป)
--   * รหัส 41329 เป็น admin คนแรก

SET NOCOUNT ON;

-- 1) ตาราง
IF OBJECT_ID(N'dbo.ithd_roles', N'U') IS NULL
    CREATE TABLE dbo.ithd_roles (
        id    INT IDENTITY(1,1) PRIMARY KEY,
        code  NVARCHAR(50)  NOT NULL CONSTRAINT UQ_ithd_roles_code UNIQUE,
        name  NVARCHAR(100) NOT NULL
    );

IF OBJECT_ID(N'dbo.ithd_permissions', N'U') IS NULL
    CREATE TABLE dbo.ithd_permissions (
        code         NVARCHAR(100) NOT NULL PRIMARY KEY,
        description  NVARCHAR(200) NULL
    );

IF OBJECT_ID(N'dbo.ithd_role_permissions', N'U') IS NULL
    CREATE TABLE dbo.ithd_role_permissions (
        role_id     INT           NOT NULL REFERENCES dbo.ithd_roles(id),
        perm_code   NVARCHAR(100) NOT NULL REFERENCES dbo.ithd_permissions(code),
        PRIMARY KEY (role_id, perm_code)
    );

IF OBJECT_ID(N'dbo.ithd_user_roles', N'U') IS NULL
    CREATE TABLE dbo.ithd_user_roles (
        empCode     NVARCHAR(20) NOT NULL,
        role_id     INT          NOT NULL REFERENCES dbo.ithd_roles(id),
        granted_by  NVARCHAR(20) NULL,
        granted_at  DATETIME2(0) NOT NULL CONSTRAINT DF_ithd_user_roles_granted_at DEFAULT SYSDATETIME(),
        PRIMARY KEY (empCode, role_id)
    );

-- 2) ข้อมูลตั้งต้น: บทบาท
IF NOT EXISTS (SELECT 1 FROM dbo.ithd_roles WHERE code = 'admin')
    INSERT INTO dbo.ithd_roles (code, name) VALUES ('admin', N'ผู้ดูแลระบบ');
IF NOT EXISTS (SELECT 1 FROM dbo.ithd_roles WHERE code = 'it_staff')
    INSERT INTO dbo.ithd_roles (code, name) VALUES ('it_staff', N'เจ้าหน้าที่ IT');
IF NOT EXISTS (SELECT 1 FROM dbo.ithd_roles WHERE code = 'user')
    INSERT INTO dbo.ithd_roles (code, name) VALUES ('user', N'ผู้ใช้ทั่วไป');

-- 3) ข้อมูลตั้งต้น: สิทธิ์
IF NOT EXISTS (SELECT 1 FROM dbo.ithd_permissions WHERE code = 'master.edit')
    INSERT INTO dbo.ithd_permissions (code, description) VALUES ('master.edit', N'แก้ไขข้อมูลหลัก (master data)');
IF NOT EXISTS (SELECT 1 FROM dbo.ithd_permissions WHERE code = 'users.manage')
    INSERT INTO dbo.ithd_permissions (code, description) VALUES ('users.manage', N'จัดการบทบาทและสิทธิ์ของผู้ใช้');
IF NOT EXISTS (SELECT 1 FROM dbo.ithd_permissions WHERE code = 'logs.view')
    INSERT INTO dbo.ithd_permissions (code, description) VALUES ('logs.view', N'ดูประวัติการเข้าสู่ระบบ');
IF NOT EXISTS (SELECT 1 FROM dbo.ithd_permissions WHERE code = 'tickets.manage')
    INSERT INTO dbo.ithd_permissions (code, description) VALUES ('tickets.manage', N'รับเคส มอบหมาย และปิดเคส');

-- 4) บทบาท -> สิทธิ์
-- admin: ทุกสิทธิ์
INSERT INTO dbo.ithd_role_permissions (role_id, perm_code)
SELECT r.id, p.code FROM dbo.ithd_roles r CROSS JOIN dbo.ithd_permissions p
WHERE r.code = 'admin'
  AND NOT EXISTS (SELECT 1 FROM dbo.ithd_role_permissions x WHERE x.role_id = r.id AND x.perm_code = p.code);
-- it_staff: งานเทคนิค
INSERT INTO dbo.ithd_role_permissions (role_id, perm_code)
SELECT r.id, 'tickets.manage' FROM dbo.ithd_roles r
WHERE r.code = 'it_staff'
  AND NOT EXISTS (SELECT 1 FROM dbo.ithd_role_permissions x WHERE x.role_id = r.id AND x.perm_code = 'tickets.manage');

-- 5) ผู้ใช้ -> บทบาท
-- รหัส 41329 เป็น admin คนแรก
INSERT INTO dbo.ithd_user_roles (empCode, role_id, granted_by)
SELECT '41329', r.id, 'SYSTEM' FROM dbo.ithd_roles r
WHERE r.code = 'admin'
  AND NOT EXISTS (SELECT 1 FROM dbo.ithd_user_roles u WHERE u.empCode = '41329' AND u.role_id = r.id);

-- คนที่ cost_center = 7510 ได้บทบาท it_staff
INSERT INTO dbo.ithd_user_roles (empCode, role_id, granted_by)
SELECT LTRIM(RTRIM(usr.empCode)), r.id, 'SYSTEM'
FROM dbo.ithd_users usr CROSS JOIN dbo.ithd_roles r
WHERE r.code = 'it_staff' AND LTRIM(RTRIM(usr.cost_center)) = '7510'
  AND NOT EXISTS (SELECT 1 FROM dbo.ithd_user_roles u WHERE u.empCode = LTRIM(RTRIM(usr.empCode)) AND u.role_id = r.id);

-- คนใน Stock_UserRole ได้บทบาท admin (เฉพาะกรณีตารางนี้มีอยู่)
IF OBJECT_ID(N'dbo.Stock_UserRole', N'U') IS NOT NULL
    INSERT INTO dbo.ithd_user_roles (empCode, role_id, granted_by)
    SELECT DISTINCT LTRIM(RTRIM(s.EmpCode)), r.id, 'SYSTEM'
    FROM dbo.Stock_UserRole s CROSS JOIN dbo.ithd_roles r
    WHERE r.code = 'admin' AND s.EmpCode IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM dbo.ithd_user_roles u WHERE u.empCode = LTRIM(RTRIM(s.EmpCode)) AND u.role_id = r.id);
