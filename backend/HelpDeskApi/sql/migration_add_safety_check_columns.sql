-- Safety checklist confirmed by IT staff before a ticket can be closed.
-- 3 mandatory checks: power plug OK / power cable OK / work area OK.
-- Safe to run more than once: each column is only added if it is missing.
-- Existing closed tickets keep NULL (checklist did not exist back then).

IF COL_LENGTH('dbo.ithd_tickets', 'safety_plug_ok') IS NULL
    ALTER TABLE dbo.ithd_tickets ADD safety_plug_ok BIT NULL;
GO

IF COL_LENGTH('dbo.ithd_tickets', 'safety_cable_ok') IS NULL
    ALTER TABLE dbo.ithd_tickets ADD safety_cable_ok BIT NULL;
GO

IF COL_LENGTH('dbo.ithd_tickets', 'safety_area_ok') IS NULL
    ALTER TABLE dbo.ithd_tickets ADD safety_area_ok BIT NULL;
GO

IF COL_LENGTH('dbo.ithd_tickets', 'safety_checked_at') IS NULL
    ALTER TABLE dbo.ithd_tickets ADD safety_checked_at DATETIME NULL;
GO
