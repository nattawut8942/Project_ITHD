-- Run this ONLY if you already created dbo.ithd_ticket_stock_items before this update.
-- Adds the price/image columns without touching existing rows.

ALTER TABLE dbo.ithd_ticket_stock_items ADD unit_price DECIMAL(18,2) NULL;
ALTER TABLE dbo.ithd_ticket_stock_items ADD image_url NVARCHAR(500) NULL;
