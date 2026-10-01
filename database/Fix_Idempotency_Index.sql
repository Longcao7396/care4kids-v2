-- Fix idempotency index with proper SET options
USE [GiveAIDDB];
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Drop old non-unique index
IF EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_donations_idempotency_key' 
    AND object_id = OBJECT_ID('dbo.donations')
    AND is_unique = 0
)
BEGIN
    DROP INDEX [IX_donations_idempotency_key] ON [dbo].[donations];
    PRINT 'Dropped old non-unique IX_donations_idempotency_key';
END

-- Create new UNIQUE filtered index
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_Donations_IdempotencyKey_Unique' 
    AND object_id = OBJECT_ID('dbo.donations')
)
BEGIN
    CREATE UNIQUE INDEX [IX_Donations_IdempotencyKey_Unique]
        ON [dbo].[donations] ([idempotency_key])
        WHERE [idempotency_key] IS NOT NULL;
    PRINT 'Created UNIQUE index IX_Donations_IdempotencyKey_Unique';
END
ELSE
BEGIN
    PRINT 'IX_Donations_IdempotencyKey_Unique already exists';
END
GO
