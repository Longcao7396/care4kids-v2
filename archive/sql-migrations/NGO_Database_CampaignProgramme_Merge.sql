-- =====================================================
-- NGO_Database_CampaignProgramme_Merge.sql
--
-- Purpose
-- -------
-- Merge the Programme concept into the Campaigns table so the application
-- only needs ONE donation/event entity going forward.
--
-- Strategy (additive, non-destructive)
-- ------------------------------------
-- 1. Add new columns to Campaigns (programme_type, registration_required,
--    max_participants, target_beneficiaries, expected_budget,
--    actual_budget, organization_id).
-- 2. Backfill those columns from Programmes (so existing programme rows are
--    visible inside Campaigns too).
-- 3. Create a new CampaignRegistrations table (replacing ProgrammeRegistrations
--    for new registrations; legacy table is kept untouched).
-- 4. Add FK + indexes.
--
-- Safe to run multiple times.
-- =====================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- (DB_NAME check removed — this migration is intended only for GiveAIDDB
--  and the operator should ensure they are targeting the right DB.)
GO

-- =====================================================
-- 0. DDL section (runs OUTSIDE the data transaction —
--    DDL in SQL Server auto-commits and is fast/atomic
--    so a separate batch is cleaner than nested batches)
-- =====================================================

-- ─── 1. Extend Campaigns with Programme fields ────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Campaigns') AND name = N'programme_type')
BEGIN
    ALTER TABLE Campaigns ADD programme_type NVARCHAR(50) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Campaigns') AND name = N'registration_required')
BEGIN
    ALTER TABLE Campaigns ADD registration_required BIT NOT NULL
        CONSTRAINT DF_Campaigns_RegistrationRequired DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Campaigns') AND name = N'max_participants')
BEGIN
    ALTER TABLE Campaigns ADD max_participants INT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Campaigns') AND name = N'target_beneficiaries')
BEGIN
    ALTER TABLE Campaigns ADD target_beneficiaries INT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Campaigns') AND name = N'expected_budget')
BEGIN
    ALTER TABLE Campaigns ADD expected_budget DECIMAL(18,2) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Campaigns') AND name = N'actual_budget')
BEGIN
    ALTER TABLE Campaigns ADD actual_budget DECIMAL(18,2) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Campaigns') AND name = N'organization_id')
BEGIN
    ALTER TABLE Campaigns ADD organization_id INT NULL;
END
GO

-- Allow status values that match both Campaign and Programme lifecycles
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CHK_CampaignStatus')
BEGIN
    ALTER TABLE Campaigns DROP CONSTRAINT CHK_CampaignStatus;
END
GO

ALTER TABLE Campaigns WITH CHECK
    ADD CONSTRAINT CHK_CampaignStatus CHECK (
        status IN ('Active', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled', 'Paused')
    );
GO

-- Allow goal_amount = 0 for non-donation campaigns (events only)
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CHK_CampaignAmounts')
BEGIN
    ALTER TABLE Campaigns DROP CONSTRAINT CHK_CampaignAmounts;
END
GO

ALTER TABLE Campaigns WITH CHECK
    ADD CONSTRAINT CHK_CampaignAmounts CHECK (
        goal_amount >= 0 AND raised_amount >= 0
    );

-- ─── 1b. Guard: ensure Campaigns.cause_id is never orphan
-- If the backfill somehow creates a campaign with a cause_id that no longer
-- exists (e.g., N1 migration ran before this merge), the CHECK prevents
-- the orphan from being committed.  Run this AFTER backfill.
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CHK_Campaigns_CauseExists'
)
BEGIN
    -- Only add the CHECK if all existing rows satisfy it (no orphan causes).
    DECLARE @orphanCount INT;
    SELECT @orphanCount = COUNT(*)
    FROM dbo.Campaigns c
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Causes ca WHERE ca.cause_id = c.cause_id);

    IF @orphanCount = 0
    BEGIN
        -- Note: SQL Server CHECK constraints cannot contain subqueries
        -- (Msg 1046). We rely on the FK FK_Campaigns_Cause to enforce
        -- existence; adding a redundant CHECK here would be invalid T-SQL.
        PRINT 'CHK_Campaigns_CauseExists skipped (rely on FK constraint).';
    END
    ELSE
    BEGIN
        PRINT 'WARNING: ' + CAST(@orphanCount AS VARCHAR(10)) +
              ' orphan cause_id rows found. CHECK not added. Run FixOrphanCauseIds.sql first.';
    END
END
GO

-- ─── 2. Foreign key Campaign.organization_id -> Organizations ─────────────

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_Campaigns_Organizations_OrganizationId'
)
BEGIN
    ALTER TABLE Campaigns WITH CHECK
        ADD CONSTRAINT FK_Campaigns_Organizations_OrganizationId
        FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id);
END
GO

-- ─── 3. Create CampaignRegistrations table ────────────────────────────────

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = N'CampaignRegistrations'
)
BEGIN
    CREATE TABLE CampaignRegistrations (
        registration_id INT PRIMARY KEY IDENTITY(1,1),
        campaign_id INT NOT NULL,
        user_id INT NOT NULL,
        registration_date DATETIME DEFAULT GETDATE(),
        status NVARCHAR(20) DEFAULT 'Registered',
        notes NVARCHAR(500),
        attendance_confirmed BIT DEFAULT 0,

        CONSTRAINT FK_CampaignRegistrations_Campaigns
            FOREIGN KEY (campaign_id) REFERENCES Campaigns(campaign_id) ON DELETE CASCADE,
        CONSTRAINT FK_CampaignRegistrations_Users
            FOREIGN KEY (user_id) REFERENCES Users(user_id),

        CONSTRAINT CHK_CampaignRegistrationStatus CHECK (
            status IN ('Registered', 'Confirmed', 'Attended', 'Cancelled')
        ),
        CONSTRAINT UQ_CampaignRegistration_User UNIQUE (campaign_id, user_id)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = N'idx_campaign_registrations_user_campaign'
)
BEGIN
    CREATE INDEX idx_campaign_registrations_user_campaign
        ON CampaignRegistrations(user_id, campaign_id);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = N'idx_campaign_registrations_campaign_status'
)
BEGIN
    CREATE INDEX idx_campaign_registrations_campaign_status
        ON CampaignRegistrations(campaign_id, status);
END
GO

-- ─── 4. Backfill: copy Programme rows into Campaigns ───────────────────────
--
-- Existing Programmes are imported as NEW Campaigns. We mark them with
-- programme_type so the API can still distinguish them. Each imported row
-- gets a derived campaign_code and a zero goal_amount (since Programmes do
-- not have one).
--
-- Re-running this block is safe — we skip rows whose campaign_code we
-- already created.

BEGIN TRANSACTION;
GO

DECLARE @imported INT = 0;

INSERT INTO Campaigns (
    cause_id,
    organization_id,
    campaign_name,
    campaign_code,
    programme_type,
    registration_required,
    max_participants,
    target_beneficiaries,
    expected_budget,
    actual_budget,
    description,
    goal_amount,
    raised_amount,
    start_date,
    end_date,
    image_url,
    location,
    status,
    is_featured,
    created_at,
    updated_at
)
SELECT
    -- Programme has no cause; pick the first active Cause as default for FK safety.
    COALESCE(
        (SELECT TOP 1 cause_id FROM Causes WHERE is_active = 1 ORDER BY display_order),
        (SELECT TOP 1 cause_id FROM Causes ORDER BY cause_id)
    ),
    p.organization_id,
    p.title,
    'PRG-' + CAST(p.programme_id AS VARCHAR(20)),
    p.programme_type,
    p.registration_required,
    p.max_participants,
    p.target_beneficiaries,
    p.expected_budget,
    p.actual_budget,
    p.description,
    0,                                -- Programmes have no goal_amount
    0,                                -- ...nor raised_amount
    COALESCE(p.start_date, GETDATE()),
    p.end_date,
    p.image_url,
    p.location,
    CASE p.status
        WHEN 'Upcoming'  THEN 'Upcoming'
        WHEN 'Ongoing'   THEN 'Active'
        WHEN 'Completed' THEN 'Completed'
        WHEN 'Cancelled' THEN 'Cancelled'
        ELSE 'Active'
    END,
    ISNULL(p.is_featured, 0),
    p.created_at,
    p.updated_at
FROM Programmes p
WHERE NOT EXISTS (
    SELECT 1 FROM Campaigns c
    WHERE c.campaign_code = 'PRG-' + CAST(p.programme_id AS VARCHAR(20))
);

SET @imported = @@ROWCOUNT;

PRINT 'Imported ' + CAST(@imported AS VARCHAR(10)) + ' Programmes into Campaigns.';

IF @@TRANCOUNT > 0 COMMIT TRANSACTION;

PRINT 'CampaignProgramme merge migration completed.';
GO
