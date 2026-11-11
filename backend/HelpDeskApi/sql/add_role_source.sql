-- แยกที่มาของบทบาท:
--   manual : ตั้งจากหน้าจัดการสิทธิ์ (คงค่าไว้ตอน login)
--   auto   : คำนวณจาก cost center ทุกครั้งที่ login (ย้ายแผนกแล้วบทบาทเปลี่ยนตาม)
-- รันซ้ำได้ปลอดภัย (idempotent)

IF COL_LENGTH('dbo.ithd_users', 'RoleSource') IS NULL
    ALTER TABLE dbo.ithd_users ADD RoleSource NVARCHAR(10) NOT NULL
        CONSTRAINT DF_ithd_users_RoleSource DEFAULT 'auto';

-- บทบาท admin ที่มีอยู่แล้วถือเป็นการตั้งเอง จึงคงไว้ไม่ให้ login แล้วถูกเขียนทับ
EXEC(N'UPDATE dbo.ithd_users SET RoleSource = ''manual'' WHERE Role = ''admin'';');
