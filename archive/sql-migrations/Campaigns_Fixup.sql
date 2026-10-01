-- =====================================================
-- Campaigns_Fixup.sql
--
-- ⚠️  DEVELOPMENT / TEST ONLY ⚠️
--
-- PURPOSE: Cleans up stale placeholder campaigns (IDs 1-5)
--          and inserts the "Warm Winter for Children" campaign
--          with correct Unsplash imagery.
--
-- SAFETY: This script is DESTRUCTIVE — it DELETES rows.
--         DO NOT run on a production database.
--
-- IDEMPOTENCY: This script is NOT idempotent.
--              Run it ONLY once against a fresh development DB
--              BEFORE inserting production data.
-- =====================================================
USE GiveAIDDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ═══════════════════════════════════════════════════════
-- DANGER: Deleting campaign rows cascades to Donations
-- and CampaignReports. Only run this on a clean dev DB.
-- ═══════════════════════════════════════════════════════
DELETE FROM dbo.CampaignReports WHERE campaign_id BETWEEN 1 AND 5;
DELETE FROM dbo.Donations        WHERE campaign_id BETWEEN 1 AND 5;
DELETE FROM dbo.Campaigns       WHERE campaign_id BETWEEN 1 AND 5;
GO

-- Reset identity so new inserts don't collide with old IDs
DBCC CHECKIDENT('dbo.Campaigns', RESEED, 0);
GO

-- Resolve cause IDs dynamically (safe after N1 migration)
DECLARE @SPECIAL_ID INT = (SELECT cause_id FROM dbo.Causes WHERE cause_code = 'SPECIAL');
IF @SPECIAL_ID IS NULL
    SET @SPECIAL_ID = ISNULL((SELECT TOP 1 cause_id FROM dbo.Causes), 1);

-- ═══════════════════════════════════════════════════════
-- Insert Warm Winter campaign (idempotent via campaign_code guard)
-- ═══════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM dbo.Campaigns WHERE campaign_code = 'WINTER-2026')
BEGIN
    INSERT INTO dbo.Campaigns
        (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
         start_date, end_date, image_url, beneficiaries_count, location,
         status, is_featured, display_order)
    VALUES
        (@SPECIAL_ID,
         N'Warm Winter for Children',
         'WINTER-2026',
         N'Northern Vietnam''s winters can be bitterly cold, and for children without warm clothing, the season brings real suffering. This campaign provides winter jackets, blankets, socks, hats and gloves to children in mountainous provinces. Together we can make sure no child has to choose between going to school and staying warm.',
         40000000, 7100000,
         '2026-10-15', '2027-01-31',
         'https://images.unsplash.com/photo-1545193544-312983719627?auto=format&fit=crop&w=1200&q=80',
         450, N'Northern mountainous provinces',
         'Active', 1, 7);
    PRINT 'Inserted WARM-WINTER-2026 campaign.';
END
ELSE
BEGIN
    PRINT 'WINTER-2026 campaign already exists — skipped insert.';
END
GO

-- Update featured flag on existing campaigns
UPDATE dbo.Campaigns
SET is_featured = 1
WHERE campaign_code IN ('MEALS-2026', 'SUPPLIES-2026', 'CARE-HOMES-2026');
GO

-- ═══════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════
SELECT
    campaign_id,
    campaign_name,
    cause_id,
    status,
    is_featured,
    goal_amount,
    raised_amount,
    CASE WHEN image_url IS NULL THEN 'NO IMAGE' ELSE 'OK' END AS image_status
FROM dbo.Campaigns
ORDER BY is_featured DESC, display_order;

SELECT COUNT(*) AS total_campaigns FROM dbo.Campaigns;
SELECT COUNT(*) AS total_donations FROM dbo.Donations;
GO

PRINT 'Campaigns_Fixup completed. ⚠️  Do NOT run on production.';
GO
