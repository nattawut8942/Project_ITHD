-- Run this once against the Helpdesk database (same SQL Server as Stock, but this
-- table lives on the Helpdesk side - it just records *which* stock items were used
-- on *which* ticket; the actual stock deduction happens in Stock's own
-- dbo.Stock_Products / dbo.Stock_Transactions tables via its existing API.

CREATE TABLE dbo.ithd_ticket_stock_items (
    id                   INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id            INT NOT NULL,
    product_id           INT NOT NULL,          -- Stock_Products.ProductID
    product_name         NVARCHAR(255) NULL,     -- denormalized for display, in case the product is later renamed/deactivated
    qty                  INT NOT NULL,
    device_type          VARCHAR(50) NULL,
    serial_number        NVARCHAR(100) NULL,     -- only set for DeviceType = 'Asset'
    fixed_asset_code     NVARCHAR(50) NULL,      -- only set for DeviceType = 'Asset'
    unit_price           DECIMAL(18,2) NULL,     -- Stock_Products.LastPrice at the time it was withdrawn
    image_url            NVARCHAR(500) NULL,     -- Stock_Products.ImageURL at the time it was withdrawn
    withdrawn_by_empcode VARCHAR(50) NOT NULL,
    withdrawn_at         DATETIME NOT NULL,
    CONSTRAINT FK_ithd_ticket_stock_items_ticket
        FOREIGN KEY (ticket_id) REFERENCES dbo.ithd_tickets(id)
);

CREATE INDEX IX_ithd_ticket_stock_items_ticket_id ON dbo.ithd_ticket_stock_items(ticket_id);
