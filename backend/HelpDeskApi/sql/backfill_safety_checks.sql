-- Backfill: tick all 3 safety checks on every existing ticket.
-- Requested explicitly by the IT Helpdesk owner on 2026-11-06.
--
-- NOTE: these tickets were handled before the safety checklist existed, so the
-- checks were never actually performed. safety_checked_at is deliberately left
-- NULL on backfilled rows - that NULL is the only thing distinguishing a
-- backfilled tick from a real inspection (where the API always stamps a time).
-- Do not fill it in later.
--
-- To undo: run rollback_backfill_safety_checks.sql

SET XACT_ABORT ON;
BEGIN TRANSACTION;

UPDATE dbo.ithd_tickets
SET safety_plug_ok  = 1,
    safety_cable_ok = 1,
    safety_area_ok  = 1
WHERE safety_plug_ok  IS NULL
   OR safety_cable_ok IS NULL
   OR safety_area_ok  IS NULL;

COMMIT TRANSACTION;

SELECT
    COUNT(*) AS total_tickets,
    SUM(CASE WHEN safety_plug_ok = 1 AND safety_cable_ok = 1 AND safety_area_ok = 1 THEN 1 ELSE 0 END) AS all_three_ticked,
    SUM(CASE WHEN safety_checked_at IS NULL THEN 1 ELSE 0 END) AS backfilled_no_timestamp,
    SUM(CASE WHEN safety_checked_at IS NOT NULL THEN 1 ELSE 0 END) AS really_inspected
FROM dbo.ithd_tickets;
