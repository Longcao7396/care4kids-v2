-- =====================================================================
-- Migration: Populate About-This-Campaign copy on every campaign row.
-- =====================================================================
-- Purpose:
--   The Campaign Description column was empty in the initial seed data, so
--   the public /campaigns/{id} page rendered an empty "About This Campaign"
--   block. The seed data set has been updated to populate this column via
--   a new CampaignCopy.Build(...) helper, so fresh deployments will get
--   the descriptions automatically.
--
-- Recommended way to back-fill an existing database
-- -------------------------------------------------
--   This file is kept as a no-op reference for environments where the
--   .NET toolchain is unavailable. The supported path is the small
--   one-off console runner that ships with the repo:
--
--       dotnet run --project tools/CampaignDescriptionBackfill
--
--   The runner reads every campaign row, regenerates the description via
--   the same CampaignCopy.Build helper used by SeedData, and UPDATEs
--   only rows whose description is currently NULL/empty. It is fully
--   idempotent and safe to re-run.
--
-- Fallback (SQL-only, hand-written for the original 8 seeded campaigns):
--   Run this file manually with sqlcmd / Invoke-Sqlcmd. It only touches
--   campaigns with campaign_code CMP-001 .. CMP-008 — these are the
--   codes produced by the V2 Clean Architecture seed. For any other
--   campaign codes that exist in your database, use the runner above.
--
-- Run order:
--   powershell -ExecutionPolicy Bypass -File scripts/RunSqlFile.ps1
--               -SqlFile database/CampaignDescriptions_Backfill.sql
--               -Server "(localdb)\MSSQLLocalDB"
--               -Database  GiveAIDDB
--
-- The descriptions below mirror the wording produced by the C# helper in
-- src/Infrastructure/Persistence/Seed/CampaignCopy.cs at build time. If
-- you change the helper copy, regenerate this file from a one-off
-- `dotnet run` of CampaignCopy.Build (the campaign metadata is identical
-- to what the helper sees at seed time).
-- =====================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

-- Only run against GiveAIDDB
DECLARE @DBName NVARCHAR(128) = DB_NAME();
IF @DBName <> 'GiveAIDDB'
BEGIN
    PRINT 'This migration must be run against GiveAIDDB. Current database: ' + @DBName;
    RAISERROR('Wrong database', 16, 1);
    RETURN;
END

PRINT 'Starting migration: Populate Campaign Description column';
PRINT 'Database: ' + @DBName;

BEGIN TRANSACTION;

BEGIN TRY
    -- CMP-001 — Bữa Cơm Có Thịt — 5,000 nutritious meals for Saigon children
    IF EXISTS (SELECT 1 FROM campaigns WHERE campaign_code = 'CMP-001')
        UPDATE campaigns SET description = N'Too many children grow up without the simple safety net that lets them play, learn and simply be kids. Bữa Cơm Có Thịt — 5,000 nutritious meals for Saigon children. Day-to-day safety nets — a full meal, a safe place to sleep, a caring adult — are what let children focus on simply growing up.

It covers the everyday essentials — nutritious meals, a safe place to sleep, books and uniforms, and the staff who keep the routines running — so 850 children can simply be kids while they grow.

So far VND 87.5 million of the VND 120 million target has been raised (72.9%). Each new donation moves us a step closer to keeping our commitment to every child registered in this campaign. Your gift keeps the lights, kitchens and classrooms running for children who rely on us for the everyday basics of growing up. Stand with this campaign today and help give every child in this campaign the steady support they deserve.'
        WHERE campaign_code = 'CMP-001' AND (description IS NULL OR LTRIM(RTRIM(description)) = N'');

    -- CMP-002 — Sách Vở Cho Em Đến Trường — 1,500 back-to-school kits
    IF EXISTS (SELECT 1 FROM campaigns WHERE campaign_code = 'CMP-002')
        UPDATE campaigns SET description = N'Across Vietnam, many children still do not have the books, classrooms, or daily support they need to stay in school. Sách Vở Cho Em Đến Trường — 1,500 back-to-school kits. Long commutes, missing supplies and out-of-pocket costs are still the reasons many children drop out before they finish primary school.

It funds the materials, transport and learning support that keep 1,500 children in class — from school bags and supplies to bicycles and after-school mentoring that make the difference between attending and dropping out.

So far VND 612 million of the VND 900 million goal has been raised (68.0%). Each new donation moves us a step closer to keeping our commitment to every child registered in this campaign. Your donation covers the supplies, transport and mentorship that keep a child in school this term — and the next, and the one after that. Stand with this campaign today and help give every child in this campaign the steady support they deserve.'
        WHERE campaign_code = 'CMP-002' AND (description IS NULL OR LTRIM(RTRIM(description)) = N'');

    -- CMP-003 — Khám Sức Khỏe Miễn Phí — 30 mobile clinics
    IF EXISTS (SELECT 1 FROM campaigns WHERE campaign_code = 'CMP-003')
        UPDATE campaigns SET description = N'For children in remote communities, even basic healthcare can feel out of reach — a long trip, a missing specialist, or a cost a family cannot cover. Khám Sức Khỏe Miễn Phí — 30 mobile clinics. Routine check-ups, treatment for common illnesses and basic health education change a child''s whole trajectory.

It pays for routine check-ups, treatment for common childhood illnesses and health-education sessions for both children and their caregivers.

With VND 387.5 million raised towards a VND 450 million goal (86.1%), we are close to fully funding this programme and can expand it to the next group of children once we cross the line. From a single check-up to a full course of treatment, your gift keeps a child healthy enough to learn, play and grow. Stand with this campaign today and help give every child in this campaign the steady support they deserve.'
        WHERE campaign_code = 'CMP-003' AND (description IS NULL OR LTRIM(RTRIM(description)) = N'');

    -- CMP-004 — Mái Ấm Tình Thương — Three new care homes
    IF EXISTS (SELECT 1 FROM campaigns WHERE campaign_code = 'CMP-004')
        UPDATE campaigns SET description = N'Too many children grow up without the simple safety net that lets them play, learn and simply be kids. Mái Ấm Tình Thương — Three new care homes. Day-to-day safety nets — a full meal, a safe place to sleep, a caring adult — are what let children focus on simply growing up.

It covers the everyday essentials — nutritious meals, a safe place to sleep, books and uniforms, and the staff who keep the routines running — so 150 children can simply be kids while they grow.

So far VND 1.8 billion of the VND 2.5 billion target has been raised (70.0%). Each new donation moves us a step closer to keeping our commitment to every child registered in this campaign. Your gift keeps the lights, kitchens and classrooms running for children who rely on us for the everyday basics of growing up. Stand with this campaign today and help give every child in this campaign the steady support they deserve.'
        WHERE campaign_code = 'CMP-004' AND (description IS NULL OR LTRIM(RTRIM(description)) = N'');

    -- CMP-005 — Cứu Trợ Lũ Lụt Miền Trung — Flood Relief 2026
    IF EXISTS (SELECT 1 FROM campaigns WHERE campaign_code = 'CMP-005')
        UPDATE campaigns SET description = N'When a flood, storm or other emergency hits, children are always the most vulnerable members of any community. Cứu Trợ Lũ Lụt Miền Trung — Flood Relief 2026. When a flood, storm or other crisis hits, the first hours and days decide whether a family recovers quickly or loses everything.

It delivers food, clean water, medicine and cash grants in the first hours and days after a crisis, working side-by-side with local responders so 10,000 affected households get help quickly.

With VND 2.4 billion raised towards a VND 3 billion goal (79.3%), we are close to fully funding this programme and can expand it to the next group of children once we cross the line. In an emergency, even a small contribution reaches a family in need within hours — please give what you can as soon as you can. Stand with this campaign today and help give every child in this campaign the steady support they deserve.'
        WHERE campaign_code = 'CMP-005' AND (description IS NULL OR LTRIM(RTRIM(description)) = N'');

    -- CMP-006 — Lớp Học Hy Vọng — Free English Classes
    IF EXISTS (SELECT 1 FROM campaigns WHERE campaign_code = 'CMP-006')
        UPDATE campaigns SET description = N'Across Vietnam, many children still do not have the books, classrooms, or daily support they need to stay in school. Lớp Học Hy Vọng — Free English Classes. Long commutes, missing supplies and out-of-pocket costs are still the reasons many children drop out before they finish primary school.

It funds the materials, transport and learning support that keep 600 children in class — from school bags and supplies to bicycles and after-school mentoring that make the difference between attending and dropping out.

So far VND 312 million of the VND 600 million target has been raised (52.0%). Each new donation moves us a step closer to keeping our commitment to every child registered in this campaign. Your donation covers the supplies, transport and mentorship that keep a child in school this term — and the next, and the one after that. Stand with this campaign today and help give every child in this campaign the steady support they deserve.'
        WHERE campaign_code = 'CMP-006' AND (description IS NULL OR LTRIM(RTRIM(description)) = N'');

    -- CMP-007 — Mổ Tim Miễn Phí Cho Trẻ Em — 50 heart surgeries
    IF EXISTS (SELECT 1 FROM campaigns WHERE campaign_code = 'CMP-007')
        UPDATE campaigns SET description = N'For children in remote communities, even basic healthcare can feel out of reach — a long trip, a missing specialist, or a cost a family cannot cover. Mổ Tim Miễn Phí Cho Trẻ Em — 50 heart surgeries. Routine check-ups, treatment for common illnesses and basic health education change a child''s whole trajectory.

It pays for routine check-ups, treatment for common childhood illnesses and health-education sessions for both children and their caregivers.

With VND 4.2 billion raised towards a VND 5 billion goal (83.0%), we are close to fully funding this programme and can expand it to the next group of children once we cross the line. From a single check-up to a full course of treatment, your gift keeps a child healthy enough to learn, play and grow. Stand with this campaign today and help give every child in this campaign the steady support they deserve.'
        WHERE campaign_code = 'CMP-007' AND (description IS NULL OR LTRIM(RTRIM(description)) = N'');

    -- CMP-008 — Sân Chơi Cho Trẻ Em Nông Thôn — 25 rural playgrounds
    IF EXISTS (SELECT 1 FROM campaigns WHERE campaign_code = 'CMP-008')
        UPDATE campaigns SET description = N'Too many children grow up without the simple safety net that lets them play, learn and simply be kids. Sân Chơi Cho Trẻ Em Nông Thôn — 25 rural playgrounds. Day-to-day safety nets — a full meal, a safe place to sleep, a caring adult — are what let children focus on simply growing up.

It covers the everyday essentials — nutritious meals, a safe place to sleep, books and uniforms, and the staff who keep the routines running — so 5,000 children can simply be kids while they grow.

So far VND 510 million of the VND 850 million target has been raised (60.0%). Each new donation moves us a step closer to keeping our commitment to every child registered in this campaign. Your gift keeps the lights, kitchens and classrooms running for children who rely on us for the everyday basics of growing up. Stand with this campaign today and help give every child in this campaign the steady support they deserve.'
        WHERE campaign_code = 'CMP-008' AND (description IS NULL OR LTRIM(RTRIM(description)) = N'');

    DECLARE @UpdatedCount INT = @@ROWCOUNT;
    PRINT 'Updated ' + CAST(@UpdatedCount AS VARCHAR(10)) + ' campaign descriptions (NULL or empty).';

    COMMIT TRANSACTION;

    PRINT '';
    PRINT 'Migration completed successfully!';
    PRINT 'Summary:';
    PRINT '  - About-This-Campaign copy is now populated for all 8 base campaigns.';
    PRINT '  - The script is idempotent: it only fills NULL/empty descriptions.';
    PRINT '  - Fresh deployments will get the same copy via the updated seed.';
    PRINT '';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT 'Migration failed with error:';
    PRINT ERROR_MESSAGE();
    PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS VARCHAR(10));
    PRINT 'Error Line: ' + CAST(ERROR_LINE() AS VARCHAR(10));

    RAISERROR('Migration failed', 16, 1);
END CATCH
GO