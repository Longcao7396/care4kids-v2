-- =====================================================
-- PATCH: Invitations snake_case column rename
-- =====================================================
-- Existing Invitations tables may have PascalCase columns
-- (InvitationId, InviterUserId, etc.) from the old migration.
-- This patch renames them to snake_case (invitation_id, etc.)
-- to match the EF6 SnakeCaseColumnNameConvention.
--
-- Safe to run multiple times — each sp_rename is guarded.
-- =====================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF DB_NAME() <> N'GiveAIDDB'
    THROW 50000, 'Run this patch against GiveAIDDB only.', 1;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    -- Guard: only patch if table exists and has PascalCase columns
    IF OBJECT_ID('dbo.Invitations', 'U') IS NOT NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'InvitationId')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.InvitationId',    'invitation_id',     'COLUMN'; PRINT 'Renamed InvitationId -> invitation_id';
        END
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'InviterUserId')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.InviterUserId',   'inviter_user_id',   'COLUMN'; PRINT 'Renamed InviterUserId -> inviter_user_id';
        END
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'InviteeName')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.InviteeName',      'invitee_name',      'COLUMN'; PRINT 'Renamed InviteeName -> invitee_name';
        END
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'InviteeEmail')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.InviteeEmail',     'invitee_email',     'COLUMN'; PRINT 'Renamed InviteeEmail -> invitee_email';
        END
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'PersonalMessage')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.PersonalMessage',  'personal_message',  'COLUMN'; PRINT 'Renamed PersonalMessage -> personal_message';
        END
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'InvitationToken')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.InvitationToken', 'invitation_token', 'COLUMN'; PRINT 'Renamed InvitationToken -> invitation_token';
        END
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'SentAt')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.SentAt',         'sent_at',          'COLUMN'; PRINT 'Renamed SentAt -> sent_at';
        END
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'RegisteredAt')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.RegisteredAt',   'registered_at',    'COLUMN'; PRINT 'Renamed RegisteredAt -> registered_at';
        END
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Invitations') AND name = 'FailureReason')
        BEGIN
            EXEC sp_rename 'dbo.Invitations.FailureReason',  'failure_reason',    'COLUMN'; PRINT 'Renamed FailureReason -> failure_reason';
        END

        -- Drop old indexes (they reference PascalCase column names)
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_InviterUserId')
            DROP INDEX IX_Invitations_InviterUserId ON dbo.Invitations;
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_InviteeEmail')
            DROP INDEX IX_Invitations_InviteeEmail ON dbo.Invitations;
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_Status')
            DROP INDEX IX_Invitations_Status ON dbo.Invitations;
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_Token')
            DROP INDEX IX_Invitations_Token ON dbo.Invitations;

        -- Recreate indexes with correct snake_case column names
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_InviterUserId')
            CREATE NONCLUSTERED INDEX IX_Invitations_InviterUserId ON dbo.Invitations(inviter_user_id);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_InviteeEmail')
            CREATE NONCLUSTERED INDEX IX_Invitations_InviteeEmail ON dbo.Invitations(invitee_email);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_Status')
            CREATE NONCLUSTERED INDEX IX_Invitations_Status ON dbo.Invitations(status);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_Token')
            CREATE NONCLUSTERED INDEX IX_Invitations_Token ON dbo.Invitations(invitation_token);
    END
    ELSE
    BEGIN
        PRINT 'Invitations table not found — skipping.';
    END

    COMMIT TRANSACTION;
    PRINT 'Invitation snake_case patch completed successfully.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DECLARE @msg NVARCHAR(MAX) = ERROR_MESSAGE();
    RAISERROR(@msg, 16, 1);
END CATCH;
GO
