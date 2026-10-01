-- ============================================================================
-- scripts/sql/reconcile_raised_amount.sql
-- ============================================================================
-- READ-ONLY diagnostic script for the audit-fix task.  Lists every campaign and
-- cause whose denormalized raised_amount no longer matches the sum of Completed
-- donations, with both values side by side for review.
--
-- The corresponding UPDATE statements are provided at the bottom, COMMENTED
-- OUT, and clearly marked with a warning banner.
--
-- DO NOT run this file.  It is for diagnostic review only.
-- DO NOT include it in migrations, startup code, or any automated pipeline.
-- The reconciliation should be performed manually, after a full database
-- backup, by a human operator who has reviewed the diff output below.
-- ============================================================================

PRINT '=================================================================='
PRINT '   RECONCILIATION DIAGNOSTIC — campaigns.raised_amount'
PRINT '=================================================================='

SELECT
    c.campaign_id,
    c.campaign_name,
    c.raised_amount                                  AS campaigns_table_value,
    ISNULL(SUM(d.amount), 0)                         AS computed_from_completed_donations,
    c.raised_amount - ISNULL(SUM(d.amount), 0)       AS difference,
    (SELECT COUNT(*) FROM donations d2
        WHERE d2.campaign_id = c.campaign_id
          AND d2.payment_status = 'Completed')        AS completed_donation_count
FROM campaigns c
LEFT JOIN donations d
    ON d.campaign_id = c.campaign_id
    AND d.payment_status = 'Completed'
GROUP BY c.campaign_id, c.campaign_name, c.raised_amount
HAVING c.raised_amount <> ISNULL(SUM(d.amount), 0)
ORDER BY ABS(c.raised_amount - ISNULL(SUM(d.amount), 0)) DESC, c.campaign_id;

PRINT ''
PRINT '=================================================================='
PRINT '   RECONCILIATION DIAGNOSTIC — causes.raised_amount'
PRINT '=================================================================='

SELECT
    cs.cause_id,
    cs.cause_name,
    cs.raised_amount                                 AS causes_table_value,
    ISNULL(SUM(d.amount), 0)                         AS computed_from_completed_donations,
    cs.raised_amount - ISNULL(SUM(d.amount), 0)      AS difference,
    (SELECT COUNT(*) FROM donations d2
        WHERE d2.cause_id = cs.cause_id
          AND d2.payment_status = 'Completed')       AS completed_donation_count
FROM causes cs
LEFT JOIN donations d
    ON d.cause_id = cs.cause_id
    AND d.payment_status = 'Completed'
GROUP BY cs.cause_id, cs.cause_name, cs.raised_amount
HAVING cs.raised_amount <> ISNULL(SUM(d.amount), 0)
ORDER BY ABS(cs.raised_amount - ISNULL(SUM(d.amount), 0)) DESC, cs.cause_id;

-- ============================================================================
-- !!! WARNING — READ BEFORE UNCOMMENTING !!!
--
-- The UPDATE statements below will overwrite every campaign.raised_amount and
-- cause.raised_amount with the SUM(amount) of Completed donations.
--
-- This is an IRREVERSIBLE data migration.
--
-- REQUIREMENTS before uncommenting:
--   1. Take a full database backup (e.g. via SSMS or BACKUP DATABASE ...).
--   2. Run the diagnostic SELECTs above and review every row.
--   3. Confirm with stakeholders that the computed values are the desired
--      authoritative values for the aggregates.
--   4. Schedule the run during a maintenance window.
--
-- DO NOT run during production traffic; the UPDATE locks affected rows.
-- ============================================================================

/*

-- ============================================================================
-- BACKUP DATABASE FIRST — run manually after review
-- ============================================================================

-- BACKUP DATABASE [GiveAIDDB]
--     TO DISK = N'C:\backups\GiveAIDDB_pre_reconcile.bak'
-- WITH NOFORMAT, INIT, NAME = N'GiveAIDDB-pre-reconcile',
--      SKIP, NOREWIND, NOUNLOAD, STATS = 10;
-- GO

-- Recompute campaigns.raised_amount from the donation ledger.
UPDATE c
SET c.raised_amount = agg.computed_total
FROM campaigns c
INNER JOIN (
    SELECT campaign_id, ISNULL(SUM(amount), 0) AS computed_total
    FROM donations
    WHERE payment_status = 'Completed'
      AND campaign_id IS NOT NULL
    GROUP BY campaign_id
) agg ON agg.campaign_id = c.campaign_id;
GO

-- Campaigns with no Completed donations get raised_amount = 0.
UPDATE c
SET c.raised_amount = 0
FROM campaigns c
WHERE NOT EXISTS (
    SELECT 1 FROM donations d
    WHERE d.campaign_id = c.campaign_id
      AND d.payment_status = 'Completed'
);
GO

-- Recompute causes.raised_amount from the donation ledger.
UPDATE cs
SET cs.raised_amount = agg.computed_total
FROM causes cs
INNER JOIN (
    SELECT cause_id, ISNULL(SUM(amount), 0) AS computed_total
    FROM donations
    WHERE payment_status = 'Completed'
    GROUP BY cause_id
) agg ON agg.cause_id = cs.cause_id;
GO

-- Causes with no Completed donations get raised_amount = 0.
UPDATE cs
SET cs.raised_amount = 0
FROM causes cs
WHERE NOT EXISTS (
    SELECT 1 FROM donations d
    WHERE d.cause_id = cs.cause_id
      AND d.payment_status = 'Completed'
);
GO

-- After running the UPDATEs, re-run the diagnostic SELECTs at the top of this
-- file.  Both queries must return zero rows.

*/