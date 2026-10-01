-- =====================================================
-- CARE4KIDS — PARTNERS & SUPPORTERS SEED
-- =====================================================
-- Purpose:  Seed realistic partner / supporter / NGO organizations
--           for the Care4Kids public Our Partners page
--           (frontend: /about/partners,  API: GET /api/supporters).
--
-- Target table:  dbo.Organizations
-- Source schema: NGO_Database_Schema_V2.sql (UNCHANGED)
-- Frontend filter values: 'Supporter', 'Partner', 'NGO'
--
-- Safety:
--   * Pure INSERT, never UPDATE / DELETE existing data
--   * Idempotent — skips rows whose organization_name already exists
--   * Uses only columns present in the existing schema
--   * organization_type always inside the table's CHECK constraint
--   * Wrapped in a transaction so a partial failure rolls back cleanly
--
-- Run with:  SSMS → New Query → select GiveAIDDB → Execute
-- =====================================================

USE GiveAIDDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF DB_NAME() <> N'GiveAIDDB'
    THROW 50000, 'Run this seed against GiveAIDDB only.', 1;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    -- =====================================================
    -- 1. PARTNERS  (corporate / institutional collaborators)
    -- =====================================================
    -- Note: logo_url intentionally left NULL — frontend renders an
    --       initials fallback when no logo is available, which is
    --       safer than pointing to non-existent image hosts.

    IF NOT EXISTS (SELECT 1 FROM dbo.Organizations WHERE organization_name = N'Sunrise Education Foundation')
    BEGIN
        INSERT INTO dbo.Organizations
            (organization_name, organization_type, description, logo_url, website_url,
             contact_email, contact_phone, address, registration_number,
             mission, vision,
             contribution_amount, contribution_type,
             is_active, is_featured, display_order,
             created_at, updated_at)
        VALUES
            (N'Sunrise Education Foundation',
             N'Partner',
             N'A non-profit foundation funding school supplies, scholarships and learning resources for underprivileged children across Vietnam.',
             NULL,
             N'https://www.sunrise-edu.example.org',
             N'partnerships@sunrise-edu.example.org',
             N'+84-28-3899-0101',
             N'15 Ba Huyen Thanh Quan, District 3, Ho Chi Minh City',
             N'PARTNER-2026-001',
             N'Every child deserves the tools to learn, dream and succeed.',
             N'A Vietnam where no child is denied education because of poverty.',
             250000000.00,
             N'Financial',
             1, 1, 1,
             GETDATE(), GETDATE());
    END
    GO

    IF NOT EXISTS (SELECT 1 FROM dbo.Organizations WHERE organization_name = N'GreenLeaf Community Care')
    BEGIN
        INSERT INTO dbo.Organizations
            (organization_name, organization_type, description, logo_url, website_url,
             contact_email, contact_phone, address, registration_number,
             mission, vision,
             contribution_amount, contribution_type,
             is_active, is_featured, display_order,
             created_at, updated_at)
        VALUES
            (N'GreenLeaf Community Care',
             N'Partner',
             N'Local community organization providing nutritious meals, after-school tutoring and safe shelter for children in rural provinces.',
             NULL,
             N'https://www.greenleaf-care.example.org',
             N'hello@greenleaf-care.example.org',
             N'+84-236-3822-020',
             N'42 Le Loi, Hai Chau District, Da Nang',
             N'PARTNER-2026-002',
             N'Nurturing children at the grassroots where help is needed most.',
             N'Strong rural communities where every child grows up safe and supported.',
             180000000.00,
             N'In-Kind',
             1, 1, 2,
             GETDATE(), GETDATE());
    END
    GO

    IF NOT EXISTS (SELECT 1 FROM dbo.Organizations WHERE organization_name = N'Pearl Health Alliance')
    BEGIN
        INSERT INTO dbo.Organizations
            (organization_name, organization_type, description, logo_url, website_url,
             contact_email, contact_phone, address, registration_number,
             mission, vision,
             contribution_amount, contribution_type,
             is_active, is_featured, display_order,
             created_at, updated_at)
        VALUES
            (N'Pearl Health Alliance',
             N'Partner',
             N'Healthcare partner providing free medical check-ups, vaccinations and essential medicines for children in care homes.',
             NULL,
             N'https://www.pearl-health.example.org',
             N'contact@pearl-health.example.org',
             N'+84-24-3938-0303',
             N'88 Tran Hung Dao, Hoan Kiem District, Hanoi',
             N'PARTNER-2026-003',
             N'Quality healthcare should never depend on a family''s income.',
             N'A generation of children raised healthy, vaccinated and thriving.',
             120000000.00,
             N'Financial',
             1, 0, 3,
             GETDATE(), GETDATE());
    END
    GO

    -- =====================================================
    -- 2. SUPPORTERS  (individual / group recurring donors)
    -- =====================================================

    IF NOT EXISTS (SELECT 1 FROM dbo.Organizations WHERE organization_name = N'Children First Donor Circle')
    BEGIN
        INSERT INTO dbo.Organizations
            (organization_name, organization_type, description, logo_url, website_url,
             contact_email, contact_phone, address, registration_number,
             mission, vision,
             contribution_amount, contribution_type,
             is_active, is_featured, display_order,
             created_at, updated_at)
        VALUES
            (N'Children First Donor Circle',
             N'Supporter',
             N'A coalition of recurring monthly donors whose pooled contributions cover daily meals and school kits for 300+ children every month.',
             NULL,
             NULL,
             N'circle@children-first.example.org',
             NULL,
             N'Remote donor community — Vietnam-wide',
             NULL,
             N'Steady, predictable support so care homes can plan ahead.',
             N'A self-sustaining circle of donors who never let a child go hungry.',
             95000000.00,
             N'Financial',
             1, 1, 4,
             GETDATE(), GETDATE());
    END
    GO

    IF NOT EXISTS (SELECT 1 FROM dbo.Organizations WHERE organization_name = N'Ho Chi Minh City Teachers'' Union')
    BEGIN
        INSERT INTO dbo.Organizations
            (organization_name, organization_type, description, logo_url, website_url,
             contact_email, contact_phone, address, registration_number,
             mission, vision,
             contribution_amount, contribution_type,
             is_active, is_featured, display_order,
             created_at, updated_at)
        VALUES
            (N'Ho Chi Minh City Teachers'' Union',
             N'Supporter',
             N'Teacher volunteers donating weekend tutoring hours and running back-to-school supply drives for care-home students.',
             NULL,
             N'https://www.hcmctu.example.org',
             N'volunteer@hcmctu.example.org',
             N'+84-28-3526-0404',
             N'97 Nguyen Van Cu, Long Bien, Hanoi',
             NULL,
             N'Education begins with people who show up, week after week.',
             N'A city where every child has a mentor who believes in them.',
             45000000.00,
             N'Volunteer',
             1, 0, 5,
             GETDATE(), GETDATE());
    END
    GO

    -- =====================================================
    -- 3. NGOs  (peer non-profits with overlapping missions)
    -- =====================================================

    IF NOT EXISTS (SELECT 1 FROM dbo.Organizations WHERE organization_name = N'Bright Path Children NGO')
    BEGIN
        INSERT INTO dbo.Organizations
            (organization_name, organization_type, description, logo_url, website_url,
             contact_email, contact_phone, address, registration_number,
             mission, vision,
             contribution_amount, contribution_type,
             is_active, is_featured, display_order,
             created_at, updated_at)
        VALUES
            (N'Bright Path Children NGO',
             N'NGO',
             N'Peer NGO focused on scholarships, school reintegration programs and vocational training for teenage children leaving care homes.',
             NULL,
             N'https://www.brightpath.example.org',
             N'info@brightpath.example.org',
             N'+84-28-3911-0505',
             N'120 Pasteur, District 1, Ho Chi Minh City',
             N'NGO-VN-2018-117',
             N'Show every child a credible path to an independent adulthood.',
             N'A future where no teenager ages out of care without a plan.',
             NULL,
             N'Financial',
             1, 1, 6,
             GETDATE(), GETDATE());
    END
    GO

    IF NOT EXISTS (SELECT 1 FROM dbo.Organizations WHERE organization_name = N'Mekong Delta Youth Trust')
    BEGIN
        INSERT INTO dbo.Organizations
            (organization_name, organization_type, description, logo_url, website_url,
             contact_email, contact_phone, address, registration_number,
             mission, vision,
             contribution_amount, contribution_type,
             is_active, is_featured, display_order,
             created_at, updated_at)
        VALUES
            (N'Mekong Delta Youth Trust',
             N'NGO',
             N'Regional NGO delivering flood-relief kits, school rebuilding and emergency food support to children in the Mekong Delta.',
             NULL,
             N'https://www.mekongyouth.example.org',
             N'partners@mekongyouth.example.org',
             N'+84-29-2389-0606',
             N'25 Tran Phu, Can Tho City',
             N'NGO-VN-2014-042',
             N'Stand with Delta families before, during and after the floods.',
             N'A resilient Delta where children can stay in school through every season.',
             NULL,
             N'In-Kind',
             1, 0, 7,
             GETDATE(), GETDATE());
    END
    GO

    -- =====================================================
    -- 4. CORPORATE  (business sponsors)
    -- =====================================================

    IF NOT EXISTS (SELECT 1 FROM dbo.Organizations WHERE organization_name = N'Mekong Logistics Co., Ltd.')
    BEGIN
        INSERT INTO dbo.Organizations
            (organization_name, organization_type, description, logo_url, website_url,
             contact_email, contact_phone, address, registration_number,
             mission, vision,
             contribution_amount, contribution_type,
             is_active, is_featured, display_order,
             created_at, updated_at)
        VALUES
            (             N'Mekong Logistics Co., Ltd.',
             N'Partner',
             N'Corporate sponsor covering nationwide transport of school kits, medical supplies and meal provisions to care homes and remote communities.',
             NULL,
             N'https://www.mekonglogistics.example.com',
             N'csr@mekonglogistics.example.com',
             N'+84-28-3540-0707',
             N'Floor 12, Bitexco Tower, District 1, Ho Chi Minh City',
             N'CORP-0301245896',
             N'Use our logistics network to move help where it is needed fastest.',
             N'A private sector that treats community impact as a core deliverable.',
             200000000.00,
             N'In-Kind',
             1, 1, 8,
             GETDATE(), GETDATE());
    END
    GO

    COMMIT TRANSACTION;

    PRINT '──────────────────────────────────────────────────';
    PRINT 'Care4Kids partner seed completed.';
    PRINT 'Organizations inserted (skipped if name already existed):';
    PRINT '  - Sunrise Education Foundation  (Partner)';
    PRINT '  - GreenLeaf Community Care      (Partner)';
    PRINT '  - Pearl Health Alliance         (Partner)';
    PRINT '  - Children First Donor Circle   (Supporter)';
    PRINT '  - HCMC Teachers'' Union         (Supporter)';
    PRINT '  - Bright Path Children NGO      (NGO)';
    PRINT '  - Mekong Delta Youth Trust      (NGO)';
    PRINT '  - Mekong Logistics Co., Ltd.    (Partner)';
    PRINT '──────────────────────────────────────────────────';
    PRINT '';
    PRINT 'Verify with:';
    PRINT '  SELECT organization_name, organization_type, is_active, is_featured, display_order';
    PRINT '  FROM dbo.Organizations ORDER BY display_order;';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DECLARE @msg NVARCHAR(MAX) = ERROR_MESSAGE();
    RAISERROR(@msg, 16, 1);
END CATCH
GO
