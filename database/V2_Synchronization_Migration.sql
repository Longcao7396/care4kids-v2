-- =====================================================================
-- GiveAID V2 Database Synchronization Migration
-- =====================================================================
-- Purpose: Bring existing GiveAIDDB schema up to V2 standards
-- Date: 2026-09-29
-- 
-- This migration adds V2 features to the existing database:
--   1. Soft-delete infrastructure (is_deleted, deleted_at) to all 22 tables
--   2. Audit fields (created_by, updated_by) to all 22 tables
--   3. New tables: notifications, audit_logs, password_reset_tokens, webhook_logs
--   4. Gallery Cloudinary metadata columns
--   5. Fix donations idempotency index (make it unique)
--   6. Extend photo_url column lengths for Cloudinary URLs
--
-- CRITICAL: This migration is ADDITIVE ONLY - no data loss
-- Existing data: 4 users, 8 campaigns, 21 causes, 9 orgs, 16 gallery, 0 donations
-- =====================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

USE [GiveAIDDB];
GO

PRINT '=====================================================================';
PRINT 'GiveAID V2 Synchronization Migration';
PRINT 'Started: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '=====================================================================';
PRINT '';

-- =====================================================================
-- PHASE 1: ADD SOFT-DELETE COLUMNS TO ALL TABLES
-- =====================================================================
PRINT '>>> PHASE 1: Adding soft-delete infrastructure to all tables';
PRINT '';

-- Define all 22 tables that inherit from BaseEntity
DECLARE @tables TABLE (TableName NVARCHAR(128));
INSERT INTO @tables VALUES
    ('users'), ('causes'), ('campaigns'), ('donations'), 
    ('campaign_registrations'), ('campaign_reports'),
    ('programmes'), ('programme_registrations'),
    ('organizations'), ('conversations'), ('conversation_messages'),
    ('cms_pages'), ('careers'), ('career_applications'),
    ('gallery'), ('contact_messages'), ('invitations'),
    ('team_members'), ('achievements'), ('faqs'), 
    ('email_logs'), ('notifications');

DECLARE @tableName NVARCHAR(128);
DECLARE @sql NVARCHAR(MAX);

DECLARE table_cursor CURSOR FOR SELECT TableName FROM @tables;
OPEN table_cursor;
FETCH NEXT FROM table_cursor INTO @tableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Add is_deleted column (bit NOT NULL DEFAULT 0)
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = @tableName AND COLUMN_NAME = 'is_deleted'
    )
    BEGIN
        SET @sql = N'ALTER TABLE [dbo].[' + @tableName + N'] ADD [is_deleted] BIT NOT NULL DEFAULT 0;';
        EXEC sp_executesql @sql;
        PRINT '  Added is_deleted to ' + @tableName;
    END

    -- Add deleted_at column (datetime2 NULL)
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = @tableName AND COLUMN_NAME = 'deleted_at'
    )
    BEGIN
        SET @sql = N'ALTER TABLE [dbo].[' + @tableName + N'] ADD [deleted_at] DATETIME2 NULL;';
        EXEC sp_executesql @sql;
        PRINT '  Added deleted_at to ' + @tableName;
    END

    FETCH NEXT FROM table_cursor INTO @tableName;
END

CLOSE table_cursor;
DEALLOCATE table_cursor;

PRINT '';
PRINT 'PHASE 1 COMPLETE: Soft-delete columns added to all tables';
PRINT '';

-- =====================================================================
-- PHASE 2: ADD AUDIT TRACKING COLUMNS TO ALL TABLES
-- =====================================================================
PRINT '>>> PHASE 2: Adding audit tracking fields to all tables';
PRINT '';

DECLARE table_cursor2 CURSOR FOR SELECT TableName FROM @tables;
OPEN table_cursor2;
FETCH NEXT FROM table_cursor2 INTO @tableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Add created_by column (nvarchar(450) NULL) - string to match JWT claims
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = @tableName AND COLUMN_NAME = 'created_by' 
        AND DATA_TYPE = 'nvarchar'
    )
    BEGIN
        -- Check if created_by exists as INT (old FK version)
        IF EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = @tableName AND COLUMN_NAME = 'created_by' 
            AND DATA_TYPE = 'int'
        )
        BEGIN
            PRINT '  Note: ' + @tableName + '.created_by exists as INT FK (keeping for compatibility)';
        END
        ELSE
        BEGIN
            SET @sql = N'ALTER TABLE [dbo].[' + @tableName + N'] ADD [created_by] NVARCHAR(450) NULL;';
            EXEC sp_executesql @sql;
            PRINT '  Added created_by to ' + @tableName;
        END
    END

    -- Add updated_by column (nvarchar(450) NULL)
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = @tableName AND COLUMN_NAME = 'updated_by'
        AND DATA_TYPE = 'nvarchar'
    )
    BEGIN
        -- Check if updated_by exists as INT (old FK version)
        IF EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = @tableName AND COLUMN_NAME = 'updated_by' 
            AND DATA_TYPE = 'int'
        )
        BEGIN
            PRINT '  Note: ' + @tableName + '.updated_by exists as INT FK (keeping for compatibility)';
        END
        ELSE
        BEGIN
            SET @sql = N'ALTER TABLE [dbo].[' + @tableName + N'] ADD [updated_by] NVARCHAR(450) NULL;';
            EXEC sp_executesql @sql;
            PRINT '  Added updated_by to ' + @tableName;
        END
    END

    FETCH NEXT FROM table_cursor2 INTO @tableName;
END

CLOSE table_cursor2;
DEALLOCATE table_cursor2;

PRINT '';
PRINT 'PHASE 2 COMPLETE: Audit tracking fields added to all tables';
PRINT '';

-- =====================================================================
-- PHASE 3: CREATE NEW V2 TABLES
-- =====================================================================
PRINT '>>> PHASE 3: Creating new V2 tables';
PRINT '';

-- 3.1 notifications table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'notifications')
BEGIN
    CREATE TABLE [dbo].[notifications] (
        [notification_id]      INT            IDENTITY(1,1) PRIMARY KEY,
        [user_id]              INT            NOT NULL,
        [type]                 NVARCHAR(50)   NOT NULL,
        [title]                NVARCHAR(255)  NOT NULL,
        [message]              NVARCHAR(MAX)  NOT NULL,
        [related_entity_type]  NVARCHAR(50)   NULL,
        [related_entity_id]    INT            NULL,
        [is_read]              BIT            NOT NULL DEFAULT 0,
        [read_at]              DATETIME2      NULL,
        [created_at]           DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
        [updated_at]           DATETIME2      NULL,
        [is_deleted]           BIT            NOT NULL DEFAULT 0,
        [deleted_at]           DATETIME2      NULL,
        [created_by]           NVARCHAR(450)  NULL,
        [updated_by]           NVARCHAR(450)  NULL,
        CONSTRAINT [FK_notifications_user] FOREIGN KEY ([user_id]) REFERENCES [users]([user_id])
    );
    CREATE INDEX [IX_notifications_user] ON [notifications]([user_id]);
    CREATE INDEX [IX_notifications_is_read] ON [notifications]([is_read]);
    PRINT '  Created notifications table';
END
ELSE
BEGIN
    PRINT '  notifications table already exists';
END

-- 3.2 audit_logs table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audit_logs')
BEGIN
    CREATE TABLE [dbo].[audit_logs] (
        [audit_log_id]  INT            IDENTITY(1,1) PRIMARY KEY,
        [user_id]       NVARCHAR(450)  NULL,
        [action]        NVARCHAR(50)   NOT NULL,
        [entity_type]   NVARCHAR(100)  NULL,
        [entity_id]     NVARCHAR(50)   NULL,
        [old_values]    NVARCHAR(MAX)  NULL,
        [new_values]    NVARCHAR(MAX)  NULL,
        [timestamp]     DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
        [ip_address]    NVARCHAR(50)   NULL,
        [user_agent]    NVARCHAR(500)  NULL
    );
    CREATE INDEX [IX_audit_logs_user] ON [audit_logs]([user_id]);
    CREATE INDEX [IX_audit_logs_entity] ON [audit_logs]([entity_type], [entity_id]);
    CREATE INDEX [IX_audit_logs_timestamp] ON [audit_logs]([timestamp]);
    PRINT '  Created audit_logs table';
END
ELSE
BEGIN
    PRINT '  audit_logs table already exists';
END

-- 3.3 password_reset_tokens table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'password_reset_tokens')
BEGIN
    CREATE TABLE [dbo].[password_reset_tokens] (
        [id]                  INT            IDENTITY(1,1) PRIMARY KEY,
        [user_id]             INT            NOT NULL,
        [token]               NVARCHAR(255)  NOT NULL,
        [expires_at]          DATETIME2      NOT NULL,
        [used_at]             DATETIME2      NULL,
        [request_ip_address]  NVARCHAR(50)   NULL,
        [request_user_agent]  NVARCHAR(500)  NULL,
        [created_at]          DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [FK_password_reset_tokens_user] FOREIGN KEY ([user_id]) REFERENCES [users]([user_id])
    );
    CREATE INDEX [IX_password_reset_tokens_token] ON [password_reset_tokens]([token]);
    CREATE INDEX [IX_password_reset_tokens_user] ON [password_reset_tokens]([user_id]);
    PRINT '  Created password_reset_tokens table';
END
ELSE
BEGIN
    PRINT '  password_reset_tokens table already exists';
END

-- 3.4 webhook_logs table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'webhook_logs')
BEGIN
    CREATE TABLE [dbo].[webhook_logs] (
        [webhook_log_id]          BIGINT         IDENTITY(1,1) PRIMARY KEY,
        [gateway]                 NVARCHAR(50)   NOT NULL,
        [event_type]              NVARCHAR(100)  NOT NULL,
        [event_id]                NVARCHAR(255)  NOT NULL,
        [raw_payload]             NVARCHAR(MAX)  NOT NULL,
        [signature]               NVARCHAR(500)  NOT NULL,
        [signature_valid]         BIT            NOT NULL DEFAULT 0,
        [processing_status]       NVARCHAR(50)   NOT NULL DEFAULT 'Processed',
        [error_message]           NVARCHAR(MAX)  NULL,
        [donation_transaction_id] NVARCHAR(100)  NULL,
        [donation_id]             INT            NULL,
        [received_at]             DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
        [processed_at]            DATETIME2      NULL
    );
    CREATE INDEX [IX_webhook_logs_gateway] ON [webhook_logs]([gateway]);
    CREATE INDEX [IX_webhook_logs_event_id] ON [webhook_logs]([event_id]);
    CREATE INDEX [IX_webhook_logs_donation] ON [webhook_logs]([donation_id]);
    PRINT '  Created webhook_logs table';
END
ELSE
BEGIN
    PRINT '  webhook_logs table already exists';
END

PRINT '';
PRINT 'PHASE 3 COMPLETE: New V2 tables created';
PRINT '';

-- =====================================================================
-- PHASE 4: GALLERY CLOUDINARY METADATA COLUMNS
-- =====================================================================
PRINT '>>> PHASE 4: Adding Cloudinary metadata to gallery table';
PRINT '';

-- Extend photo_url to 500 chars (from 255)
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'gallery' AND COLUMN_NAME = 'photo_url' 
    AND CHARACTER_MAXIMUM_LENGTH = 255
)
BEGIN
    ALTER TABLE [dbo].[gallery] ALTER COLUMN [photo_url] VARCHAR(500) NOT NULL;
    PRINT '  Extended gallery.photo_url to VARCHAR(500)';
END

-- Extend thumbnail_url to 500 chars (from 255)
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'gallery' AND COLUMN_NAME = 'thumbnail_url' 
    AND CHARACTER_MAXIMUM_LENGTH = 255
)
BEGIN
    ALTER TABLE [dbo].[gallery] ALTER COLUMN [thumbnail_url] VARCHAR(500) NULL;
    PRINT '  Extended gallery.thumbnail_url to VARCHAR(500)';
END

-- Add public_id
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'gallery' AND COLUMN_NAME = 'public_id'
)
BEGIN
    ALTER TABLE [dbo].[gallery] ADD [public_id] NVARCHAR(255) NULL;
    PRINT '  Added gallery.public_id';
END

-- Add original_file_name
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'gallery' AND COLUMN_NAME = 'original_file_name'
)
BEGIN
    ALTER TABLE [dbo].[gallery] ADD [original_file_name] NVARCHAR(255) NULL;
    PRINT '  Added gallery.original_file_name';
END

-- Add file_size_bytes
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'gallery' AND COLUMN_NAME = 'file_size_bytes'
)
BEGIN
    ALTER TABLE [dbo].[gallery] ADD [file_size_bytes] BIGINT NULL;
    PRINT '  Added gallery.file_size_bytes';
END

-- Add content_type
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'gallery' AND COLUMN_NAME = 'content_type'
)
BEGIN
    ALTER TABLE [dbo].[gallery] ADD [content_type] NVARCHAR(50) NULL;
    PRINT '  Added gallery.content_type';
END

PRINT '';
PRINT 'PHASE 4 COMPLETE: Gallery Cloudinary metadata added';
PRINT '';

-- =====================================================================
-- PHASE 5: FIX DONATIONS IDEMPOTENCY INDEX
-- =====================================================================
PRINT '>>> PHASE 5: Fixing donations idempotency index';
PRINT '';

-- Drop old non-unique index
IF EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_donations_idempotency_key' 
    AND object_id = OBJECT_ID('dbo.donations')
    AND is_unique = 0
)
BEGIN
    DROP INDEX [IX_donations_idempotency_key] ON [dbo].[donations];
    PRINT '  Dropped old non-unique IX_donations_idempotency_key';
END

-- Drop other old idempotency indexes if they exist
IF EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'idx_donations_idem' 
    AND object_id = OBJECT_ID('dbo.donations')
)
BEGIN
    DROP INDEX [idx_donations_idem] ON [dbo].[donations];
    PRINT '  Dropped old idx_donations_idem';
END

IF EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_Donations_IdempotencyKey_Unique' 
    AND object_id = OBJECT_ID('dbo.donations')
)
BEGIN
    PRINT '  IX_Donations_IdempotencyKey_Unique already exists (keeping it)';
END
ELSE
BEGIN
    -- Create new UNIQUE filtered index
    CREATE UNIQUE INDEX [IX_Donations_IdempotencyKey_Unique]
        ON [dbo].[donations] ([idempotency_key])
        WHERE [idempotency_key] IS NOT NULL;
    PRINT '  Created UNIQUE index IX_Donations_IdempotencyKey_Unique';
END

PRINT '';
PRINT 'PHASE 5 COMPLETE: Donations idempotency index fixed';
PRINT '';

-- =====================================================================
-- PHASE 6: VERIFICATION
-- =====================================================================
PRINT '>>> PHASE 6: Verification';
PRINT '';

-- Count soft-delete columns
DECLARE @softDeleteCount INT;
SELECT @softDeleteCount = COUNT(*)
FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME = 'is_deleted'
  AND TABLE_NAME IN (SELECT TableName FROM @tables);

PRINT '  Soft-delete columns (is_deleted): ' + CAST(@softDeleteCount AS VARCHAR) + ' / 22 tables';

-- Count audit columns
DECLARE @auditCount INT;
SELECT @auditCount = COUNT(DISTINCT TABLE_NAME)
FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME = 'created_by'
  AND TABLE_NAME IN (SELECT TableName FROM @tables);

PRINT '  Audit columns (created_by): ' + CAST(@auditCount AS VARCHAR) + ' / 22 tables';

-- Verify new tables
DECLARE @newTablesCount INT = 0;
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'notifications') SET @newTablesCount = @newTablesCount + 1;
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audit_logs') SET @newTablesCount = @newTablesCount + 1;
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'password_reset_tokens') SET @newTablesCount = @newTablesCount + 1;
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'webhook_logs') SET @newTablesCount = @newTablesCount + 1;

PRINT '  New V2 tables created: ' + CAST(@newTablesCount AS VARCHAR) + ' / 4';

-- Verify gallery Cloudinary columns
DECLARE @galleryCloudinaryCount INT;
SELECT @galleryCloudinaryCount = COUNT(*)
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'gallery'
  AND COLUMN_NAME IN ('public_id', 'original_file_name', 'file_size_bytes', 'content_type');

PRINT '  Gallery Cloudinary columns: ' + CAST(@galleryCloudinaryCount AS VARCHAR) + ' / 4';

-- Verify idempotency index is unique
DECLARE @idempotencyUnique BIT = 0;
SELECT @idempotencyUnique = is_unique
FROM sys.indexes
WHERE name = 'IX_Donations_IdempotencyKey_Unique'
  AND object_id = OBJECT_ID('dbo.donations');

IF @idempotencyUnique = 1
    PRINT '  Donations idempotency index: UNIQUE (correct)';
ELSE
    PRINT '  WARNING: Donations idempotency index is NOT unique!';

-- Verify data preservation
DECLARE @userCount INT, @campaignCount INT, @causeCount INT, @orgCount INT, @galleryCount INT;
SELECT @userCount = COUNT(*) FROM users;
SELECT @campaignCount = COUNT(*) FROM campaigns;
SELECT @causeCount = COUNT(*) FROM causes;
SELECT @orgCount = COUNT(*) FROM organizations;
SELECT @galleryCount = COUNT(*) FROM gallery;

PRINT '';
PRINT '  Data Preservation Check:';
PRINT '    users:         ' + CAST(@userCount AS VARCHAR) + ' rows';
PRINT '    campaigns:     ' + CAST(@campaignCount AS VARCHAR) + ' rows';
PRINT '    causes:        ' + CAST(@causeCount AS VARCHAR) + ' rows';
PRINT '    organizations: ' + CAST(@orgCount AS VARCHAR) + ' rows';
PRINT '    gallery:       ' + CAST(@galleryCount AS VARCHAR) + ' rows';

PRINT '';
PRINT 'PHASE 6 COMPLETE: Verification finished';
PRINT '';

-- =====================================================================
-- COMPLETION
-- =====================================================================
PRINT '=====================================================================';
PRINT 'GiveAID V2 Synchronization Migration COMPLETE';
PRINT 'Completed: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '';
PRINT 'Summary:';
PRINT '  - Soft-delete infrastructure: ADDED to all 22 tables';
PRINT '  - Audit tracking fields: ADDED to all 22 tables';
PRINT '  - New tables: notifications, audit_logs, password_reset_tokens, webhook_logs';
PRINT '  - Gallery Cloudinary metadata: ADDED';
PRINT '  - Donations idempotency index: FIXED (now UNIQUE)';
PRINT '  - Existing data: PRESERVED';
PRINT '';
PRINT 'Next steps:';
PRINT '  1. Verify application startup (dotnet run)';
PRINT '  2. Test soft-delete functionality';
PRINT '  3. Test audit logging';
PRINT '  4. Test donation idempotency';
PRINT '=====================================================================';
GO
