-- บันทึกว่าใครเป็นคนเปลี่ยนบทบาทของผู้ใช้ และเมื่อไหร่
-- รันซ้ำได้ปลอดภัย (idempotent)

IF COL_LENGTH('dbo.ithd_users', 'RoleUpdatedBy') IS NULL
    ALTER TABLE dbo.ithd_users ADD RoleUpdatedBy NVARCHAR(20) NULL;

IF COL_LENGTH('dbo.ithd_users', 'RoleUpdatedAt') IS NULL
    ALTER TABLE dbo.ithd_users ADD RoleUpdatedAt DATETIME2(0) NULL;
