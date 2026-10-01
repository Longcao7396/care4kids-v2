-- ===========================================================
-- Migration: Invitations table for Invite Friends feature
-- Task 8 — User Communication Features
-- Idempotent — safe to re-run.
-- Uses snake_case column names (matches EF6 SnakeCaseColumnNameConvention).
-- ===========================================================

IF OBJECT_ID('dbo.Invitations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Invitations (
        invitation_id      INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        inviter_user_id    INT NULL,
        invitee_name      NVARCHAR(150) NOT NULL,
        invitee_email     NVARCHAR(150) NOT NULL,
        personal_message   NVARCHAR(500) NULL,
        status            NVARCHAR(20)  NOT NULL DEFAULT 'Pending',
        invitation_token NVARCHAR(64)  NULL,
        sent_at           DATETIME NULL,
        registered_at     DATETIME NULL,
        failure_reason    NVARCHAR(MAX) NULL,
        created_at        DATETIME NOT NULL DEFAULT (GETDATE()),
        CONSTRAINT FK_Invitations_Users FOREIGN KEY (inviter_user_id)
            REFERENCES dbo.Users(user_id)
    );
    PRINT 'Created Invitations table.';
END
ELSE
BEGIN
    PRINT 'Invitations table already exists — skipping CREATE.';
END
GO

-- Helpful indices (index names kept PascalCase for consistency with existing naming style)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_InviterUserId' AND object_id = OBJECT_ID('dbo.Invitations'))
    CREATE NONCLUSTERED INDEX IX_Invitations_InviterUserId ON dbo.Invitations(inviter_user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_InviteeEmail' AND object_id = OBJECT_ID('dbo.Invitations'))
    CREATE NONCLUSTERED INDEX IX_Invitations_InviteeEmail ON dbo.Invitations(invitee_email);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_Status' AND object_id = OBJECT_ID('dbo.Invitations'))
    CREATE NONCLUSTERED INDEX IX_Invitations_Status ON dbo.Invitations(status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invitations_Token' AND object_id = OBJECT_ID('dbo.Invitations'))
    CREATE NONCLUSTERED INDEX IX_Invitations_Token ON dbo.Invitations(invitation_token);
GO
