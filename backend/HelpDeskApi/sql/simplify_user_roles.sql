-- ทำให้ระบบบทบาทเรียบง่าย: เก็บบทบาทเป็นคอลัมน์เดียวใน ithd_users
--   admin    : ทำได้ทุกอย่าง (แก้ master, จัดการสิทธิ์, ดู log)
--   it_staff : cost_center = '7510' รับและจัดการเคส
--   user     : ผู้ใช้ทั่วไป
-- สิทธิ์ของแต่ละบทบาทกำหนดในโค้ด ไม่ต้องใช้ตารางสิทธิ์แล้ว
-- รันซ้ำได้ปลอดภัย (idempotent)

IF COL_LENGTH('dbo.ithd_users', 'Role') IS NULL
    ALTER TABLE dbo.ithd_users ADD Role NVARCHAR(20) NULL;

-- ตั้งค่าเริ่มต้นจากข้อมูลเดิม (EXEC เพื่อให้คอลัมน์ใหม่ถูกรู้จักตอนรัน)
EXEC(N'
UPDATE u
SET u.Role = CASE
    WHEN LTRIM(RTRIM(u.empCode)) = ''41329''
         OR EXISTS (SELECT 1 FROM dbo.Stock_UserRole s WHERE LTRIM(RTRIM(s.EmpCode)) = LTRIM(RTRIM(u.empCode)))
        THEN ''admin''
    WHEN LTRIM(RTRIM(u.cost_center)) = ''7510'' THEN ''it_staff''
    ELSE ''user''
END
FROM dbo.ithd_users u;');

-- ลบตารางบทบาท/สิทธิ์ชุดเดิม (มีเฉพาะข้อมูลตั้งต้นที่สร้างจากสคริปต์ create_ithd_roles.sql)
IF OBJECT_ID(N'dbo.ithd_user_roles', N'U') IS NOT NULL DROP TABLE dbo.ithd_user_roles;
IF OBJECT_ID(N'dbo.ithd_role_permissions', N'U') IS NOT NULL DROP TABLE dbo.ithd_role_permissions;
IF OBJECT_ID(N'dbo.ithd_permissions', N'U') IS NOT NULL DROP TABLE dbo.ithd_permissions;
IF OBJECT_ID(N'dbo.ithd_roles', N'U') IS NOT NULL DROP TABLE dbo.ithd_roles;
