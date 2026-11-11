-- Undo backfill_safety_checks.sql.
-- Clears the safety ticks ONLY on rows that have no safety_checked_at,
-- i.e. the backfilled ones. Tickets genuinely closed through the new
-- checklist (which always stamps safety_checked_at) are left untouched.

SET XACT_ABORT ON;
BEGIN TRANSACTION;

UPDATE dbo.ithd_tickets
SET safety_plug_ok  = NULL,
    safety_cable_ok = NULL,
    safety_area_ok  = NULL
WHERE safety_checked_at IS NULL;

COMMIT TRANSACTION;

SELECT COUNT(*) AS rows_with_ticks_left
FROM dbo.ithd_tickets
WHERE safety_plug_ok = 1 OR safety_cable_ok = 1 OR safety_area_ok = 1;
