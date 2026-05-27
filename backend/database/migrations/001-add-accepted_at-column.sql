-- Migration: Add accepted_at column to dbo.ithd_tickets
-- Purpose: Track when a ticket was first accepted/assigned to IT staff
-- Run this if ithd_tickets table already exists without accepted_at column

IF COL_LENGTH('dbo.ithd_tickets', 'accepted_at') IS NULL
BEGIN
    ALTER TABLE dbo.ithd_tickets
    ADD accepted_at DATETIME NULL;
    
    PRINT '✅ Added accepted_at column to dbo.ithd_tickets';
END
ELSE
BEGIN
    PRINT 'ℹ️ accepted_at column already exists in dbo.ithd_tickets';
END;

-- Optional: Update existing records where status is 'In Progress' or 'Completed'
-- but accepted_at is NULL (set it to created_at as fallback)
UPDATE dbo.ithd_tickets
SET accepted_at = created_at
WHERE (status IN ('In Progress', 'Completed') OR completed_at IS NOT NULL)
  AND accepted_at IS NULL;

PRINT '✅ Migration completed successfully';
