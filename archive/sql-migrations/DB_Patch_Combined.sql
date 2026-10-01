-- =====================================================
-- DB_Patch_Combined.sql
--
-- Master patch: applies ALL structural DB fixes in correct order.
-- Safe to run multiple times (all guards are idempotent).
-- Run against GiveAIDDB.
--
-- Fixes applied (in order):
--   1. Invitations PascalCase → snake_case column rename
--   2. Gallery FK: drop FK constraint + make programme_id nullable
--   3. Donations: add DEFAULT GETDATE() on donation_date
-- =====================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF DB_NAME() <> N'GiveAIDDB'
    THROW 50000, 'Run this patch against GiveAIDDB only.', 1;
GO

PRINT '═══════════════════════════════════════════════════';
PRINT '  GiveAID DB Combined Patch — All Fixes';
PRINT '═══════════════════════════════════════════════════';

BEGIN TRY
    BEGIN TRANSACTION;

    -- ══════════════════════════════════════════════════════
    -- FIX 1: Invitations snake_case column rename
    -- Needed if the old migration created PascalCase columns.
    -- ══════════════════════════════════════════════════════
    IF OBJECT_ID('dbo.Invitations', 'U') IS NOT NULL
    BEGIN
        PRINT '';
        PRINT 'FIX 1: Checking Invitations column names...';

        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'InvitationId')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.InvitationId',    'invitation_id',     'COLUMN';
            PRINT '  ✓ Renamed InvitationId -> invitation_id';
        END

        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'InviterUserId')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.InviterUserId',  'inviter_user_id',   'COLUMN';
            PRINT '  ✓ Renamed InviterUserId -> inviter_user_id';
        END

        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'InviteeName')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.InviteeName',    'invitee_name',       'COLUMN';
            PRINT '  ✓ Renamed InviteeName -> invitee_name';
        END

        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'InviteeEmail')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.InviteeEmail',   'invitee_email',      'COLUMN';
            PRINT '  ✓ Renamed InviteeEmail -> invitee_email';
        END

        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'PersonalMessage')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.PersonalMessage', 'personal_message',  'COLUMN';
            PRINT '  ✓ Renamed PersonalMessage -> personal_message';
        END

        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'InvitationToken')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.InvitationToken','invitation_token', 'COLUMN';
            PRINT '  ✓ Renamed InvitationToken -> invitation_token';
        END

        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'SentAt')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.SentAt',        'sent_at',           'COLUMN';
            PRINT '  ✓ Renamed SentAt -> sent_at';
        END

        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'RegisteredAt')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.RegisteredAt',  'registered_at',     'COLUMN';
            PRINT '  ✓ Renamed RegisteredAt -> registered_at';
        END

        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'FailureReason')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.FailureReason',  'failure_reason',    'COLUMN';
            PRINT '  ✓ Renamed FailureReason -> failure_reason';
        END

        -- Drop and recreate indexes with correct column names
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_InviterUserId' AND object_id = OBJECT_ID('dbo.Invitations'))
        BEGIN
            DROP INDEX IX_Invitations_InviterUserId ON dbo.Invitations;
            CREATE NONCLUSTERED INDEX IX_Invitations_InviterUserId ON dbo.Invitations(inviter_user_id);
            PRINT '  ✓ Rebuilt IX_Invitations_InviterUserId';
        END

        IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_InviteeEmail' AND object_id = OBJECT_ID('dbo.Invitations'))
        BEGIN
            DROP INDEX IX_Invitations_InviteeEmail ON dbo.Invitations;
            CREATE NONCLUSTERED INDEX IX_Invitations_InviteeEmail ON dbo.Invitations(invitee_email);
            PRINT '  ✓ Rebuilt IX_Invitations_InviteeEmail';
        END

        IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_Status' AND object_id = OBJECT_ID('dbo.Invitations'))
        BEGIN
            DROP INDEX IX_Invitations_Status ON dbo.Invitations;
            CREATE NONCLUSTERED INDEX IX_Invitations_Status ON dbo.Invitations(status);
            PRINT '  ✓ Rebuilt IX_Invitations_Status';
        END

        IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_Token' AND object_id = OBJECT_ID('dbo.Invitations'))
        BEGIN
            DROP INDEX IX_Invitations_Token ON dbo.Invitations;
            CREATE NONCLUSTERED INDEX IX_Invitations_Token ON dbo.Invitations(invitation_token);
            PRINT '  ✓ Rebuilt IX_Invitations_Token';
        END
    END
    ELSE
    BEGIN
        PRINT '  SKIP: Invitations table does not exist yet.';
    END

    -- ══════════════════════════════════════════════════════
    -- FIX 2: Gallery — drop programme_id FK + make nullable
    --
    -- Risk: Gallery rows with programme_id value will become
    -- orphaned if the referenced Programme is ever deleted (CASCADE
    -- was removed). This is the correct behavior — gallery items
    -- should survive their Programme being archived/deleted.
    -- ══════════════════════════════════════════════════════
    PRINT '';
    PRINT 'FIX 2: Making Gallery.programme_id nullable + removing FK...';

    -- Find and drop the FK constraint if it exists
    DECLARE @fkGalleryProg NVARCHAR(128);
    SELECT @fkGalleryProg = fk.name
    FROM sys.foreign_keys fk
    INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    INNER JOIN sys.columns c ON fkc.parent_column_id = c.column_id AND fkc.parent_object_id = c.object_id
    WHERE fk.parent_object_id = OBJECT_ID('dbo.Gallery')
      AND c.name = 'programme_id';

    IF @fkGalleryProg IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE dbo.Gallery DROP CONSTRAINT ' + @fkGalleryProg);
        PRINT '  ✓ Dropped FK: ' + @fkGalleryProg;
    END
    ELSE
    BEGIN
        PRINT '  SKIP: No FK found on Gallery.programme_id';
    END

    -- Make programme_id nullable (already nullable by default in SQL, but be explicit)
    IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.Gallery')
          AND name = 'programme_id'
          AND is_nullable = 0
    )
    BEGIN
        ALTER TABLE dbo.Gallery ALTER COLUMN programme_id INT NULL;
        PRINT '  ✓ Set Gallery.programme_id to nullable';
    END
    ELSE
    BEGIN
        PRINT '  SKIP: Gallery.programme_id is already nullable';
    END

    -- ══════════════════════════════════════════════════════
    -- FIX 3: Donations — add DEFAULT GETDATE() on donation_date
    --
    -- If EF saves a donation without explicitly setting DonationDate,
    -- the DB column receives C# DateTime default (0001-01-01).
    -- Adding a DEFAULT constraint fixes that.
    -- Also fixes any existing bad donation_date rows.
    -- ══════════════════════════════════════════════════════
    PRINT '';
    PRINT 'FIX 3: Adding DEFAULT GETDATE() on Donations.donation_date...';

    -- Fix broken rows first
    UPDATE dbo.Donations
    SET donation_date = created_at
    WHERE donation_date < '2000-01-01';
    PRINT '  ✓ Fixed broken donation_date rows (if any)';

    -- Add DEFAULT constraint if missing
    IF NOT EXISTS (
        SELECT 1 FROM sys.default_constraints
        WHERE parent_object_id = OBJECT_ID('dbo.Donations')
          AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('dbo.Donations'), 'donation_date', 'ColumnId')
    )
    BEGIN
        ALTER TABLE dbo.Donations
            ADD CONSTRAINT DF_Donations_donation_date DEFAULT GETDATE() FOR donation_date;
        PRINT '  ✓ Added DEFAULT GETDATE() on Donations.donation_date';
    END
    ELSE
    BEGIN
        PRINT '  SKIP: Donations.donation_date already has DEFAULT';
    END

    COMMIT TRANSACTION;

    PRINT '';
    PRINT '═══════════════════════════════════════════════════';
    PRINT '  All patches applied successfully.';
    PRINT '═══════════════════════════════════════════════════';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DECLARE @msg NVARCHAR(MAX) = ERROR_MESSAGE();
    RAISERROR(@msg, 16, 1);
END CATCH;
GO
