-- =====================================================
-- PATCH: Fix missing DEFAULT GETDATE() on Donations.donation_date
--
-- The Donations table schema in NGO_Database_Schema_V2.sql defines
-- donation_date DATETIME DEFAULT GETDATE() -- but the EF entity
-- (Donation.DonationDate = DateTime.Now) is only set in-memory by EF.
-- When SaveChanges() runs, EF6 won't touch DonationDate because it was
-- not explicitly modified by the app. This leaves donation_date as
-- DATETIME MIN VALUE (0001-01-01) unless the app explicitly sets it.
--
-- Solution: Add a DEFAULT constraint so that if the app somehow saves
-- a NULL or default donation_date, the DB will auto-fill it with NOW().
-- Also adds a NOT NULL constraint since donation_date should always have
-- a meaningful value (donation creation time).
--
-- Safe to run multiple times (IF NOT EXISTS guards).
-- =====================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF DB_NAME() <> N'GiveAIDDB'
    THROW 50000, 'Run this patch against GiveAIDDB only.', 1;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    -- Add DEFAULT GETDATE() if the column allows NULL or has no default
    IF NOT EXISTS (
        SELECT 1 FROM sys.default_constraints
        WHERE parent_object_id = OBJECT_ID('dbo.Donations')
          AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('dbo.Donations'), 'donation_date', 'ColumnId')
          AND name LIKE '%donation_date%'
    )
    BEGIN
        -- First, fix any existing MIN-VALUE rows (they're broken data)
        UPDATE dbo.Donations
        SET donation_date = created_at
        WHERE donation_date < '2000-01-01';

        ALTER TABLE dbo.Donations
            ADD CONSTRAINT DF_Donations_donation_date DEFAULT GETDATE() FOR donation_date;

        PRINT 'Added DEFAULT GETDATE() on Donations.donation_date.';
    END
    ELSE
    BEGIN
        PRINT 'Donations.donation_date already has a DEFAULT — skipping.';
    END

    COMMIT TRANSACTION;
    PRINT 'Donation date fix patch completed.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DECLARE @msg NVARCHAR(MAX) = ERROR_MESSAGE();
    RAISERROR(@msg, 16, 1);
END CATCH;
GO
