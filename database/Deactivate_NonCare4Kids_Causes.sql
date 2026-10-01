-- =====================================================================
-- Migration: Deactivate non-Care4Kids causes on the Donation page.
-- =====================================================================
-- Purpose:
--   The seeded causes in this project are intended for a Care4Kids
--   children's-welfare donation platform. The original seed, however,
--   included nine parent causes that cover a generic NGO catalogue
--   (Women Empowerment, Environment, Emergency Relief, Elderly Care,
--   Disability Support, Animal Welfare) plus a stray UAT test record
--   ("UAT Test Cause - Updated"). These all surface in the public
--   Donation page dropdown via GET /api/v1/causes/tree because their
--   is_active flag is 1 and they are not referenced by any campaign.
--
--   This migration flips is_active to 0 for those parent causes (and
--   any sub-causes that hang off them) so the dropdown only shows
--   causes that match the Care4Kids platform theme:
--
--       1 EDU     - Education for Children    (KEEP)
--       2 HEALTH  - Healthcare Support        (KEEP)
--       3 CHILD   - Child Welfare             (KEEP)
--       4 WOMEN   - Women Empowerment          (DEACTIVATE)
--       5 ENV     - Environment               (DEACTIVATE)
--       6 EMERG   - Emergency Relief          (DEACTIVATE)
--       7 ELDER   - Elderly Care              (DEACTIVATE)
--       8 DIS     - Disability Support        (DEACTIVATE)
--       9 ANIMAL  - Animal Welfare            (DEACTIVATE)
--      22 UAT-UPD - UAT Test Cause - Updated  (DEACTIVATE)
--
--   Soft-deactivation (is_active = 0) is intentional:
--     * Records remain in the database so historical FK references from
--       donations / campaigns / audit logs are preserved.
--     * GetAllCausesQuery/GetCauseTreeQuery already filter on
--       IsActive = true when activeOnly = true (the default for the
--       public Donation page), so deactivated causes disappear from
--       the API response without any frontend change.
--     * If a future campaign needs to re-enable a cause, flipping
--       is_active = 1 brings it back immediately.
--
-- Safety:
--   * No rows are deleted.
--   * No schema, constraint, index, or seed-data change.
--   * Idempotent: running twice is a no-op (rows already inactive).
--   * No FK references from campaigns or donations point at these
--       causes in the current database (verified before authoring).
--
-- Run order:
--   powershell -ExecutionPolicy Bypass -File scripts/RunSqlFile.ps1 \
--               -SqlFile database/Deactivate_NonCare4Kids_Causes.sql \
--               -Server  "(localdb)\MSSQLLocalDB" \
--               -Database "GiveAIDDB"
--
-- Re-apply for any environment that already has the original seed:
--   The .NET code path (SeedData.cs) has also been updated so that
--   fresh installs create the same final state directly; this script
--   is the bridge for databases that already received the old seed.
-- =====================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

-- Only run against GiveAIDDB
DECLARE @DBName NVARCHAR(128) = DB_NAME();
IF @DBName <> 'GiveAIDDB'
BEGIN
    PRINT 'This migration must be run against GiveAIDDB. Current database: ' + @DBName;
    RETURN;
END;

-- 1. Deactivate non-Care4Kids parent causes by their canonical code.
--    Using cause_code (rather than numeric ids) keeps the script
--    resilient if the seed is regenerated with different IDs.
PRINT '>>> Deactivating non-Care4Kids parent causes (by cause_code).';
UPDATE causes
SET    is_active   = 0,
       updated_at  = GETUTCDATE()
WHERE  cause_code IN (
    'WOMEN',   -- Women Empowerment
    'ENV',     -- Environment
    'EMERG',   -- Emergency Relief
    'ELDER',   -- Elderly Care
    'DIS',     -- Disability Support
    'ANIMAL',  -- Animal Welfare
    'UAT-UPD', -- UAT Test Cause - Updated
    'UAT'      -- any other UAT test code, defensive
)
AND    is_active = 1;

-- 2. Deactivate any sub-causes that belong to the just-deactivated
--    parents. The parent must be inactive for sub-causes to also be
--    filtered out of the public tree; otherwise a sub-cause like
--    "Flood Relief" would still be reachable via the sub-causes
--    dropdown when "Emergency Relief" is selected.
PRINT '>>> Deactivating sub-causes of the deactivated parents.';
UPDATE sub_cause
SET    is_active  = 0,
       updated_at = GETUTCDATE()
FROM   causes AS sub_cause
INNER JOIN causes AS parent
        ON sub_cause.parent_cause_id = parent.cause_id
WHERE  parent.is_active = 0
AND    sub_cause.is_active = 1;

-- 3. Summary report so the operator can eyeball the result.
PRINT '>>> Post-migration cause state (parent causes only):';
SELECT
    cause_id,
    cause_code,
    cause_name,
    is_active,
    display_order
FROM   causes
WHERE  parent_cause_id IS NULL
ORDER BY display_order;

PRINT '====================================================================';
PRINT 'Non-Care4Kids causes deactivated. The Donation page dropdown will now';
PRINT 'show only Care4Kids-relevant causes (Education for Children,';
PRINT 'Healthcare Support, Child Welfare) and any active sub-cause';
PRINT 'hanging off them.';
PRINT '====================================================================';
GO