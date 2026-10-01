-- =====================================================
-- CARE4KIDS CAMPAIGNS — Realistic NGO Data
-- =====================================================
-- IMPORTANT: Development / CI seed script only.
-- Do NOT run on a production database with live campaigns or donations.
--
-- This script is IDEMPOTENT (MERGE-based) and DATA-SAFE:
--   • Does NOT delete existing rows
--   • Only inserts/updates; never wipes data
--   • Uses MERGE on campaign_code as the unique key
--   • Resolves cause_id by cause_code (not hardcoded ID numbers)
--
-- How it works:
--   For each campaign in the seed list:
--     IF NOT EXISTS in DB → INSERT
--     IF EXISTS but different → UPDATE
--     IF EXISTS and same → NO-OP
-- =====================================================
USE GiveAIDDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Resolve cause IDs by cause_code so this works regardless of
-- whether NGO_Database_Causes_Restructure_Migration has run.
DECLARE @EDU_ID    INT = (SELECT cause_id FROM dbo.Causes WHERE cause_code = 'EDU');
DECLARE @NUTRI_ID  INT = (SELECT cause_id FROM dbo.Causes WHERE cause_code = 'NUTRI');
DECLARE @HEALTH_ID INT = (SELECT cause_id FROM dbo.Causes WHERE cause_code = 'HEALTH');
DECLARE @SPECIAL_ID INT = (SELECT cause_id FROM dbo.Causes WHERE cause_code = 'SPECIAL');

-- If the new causes exist (N1 migration ran), use them.
-- Otherwise fall back to whatever cause IDs exist (legacy schema).
IF @EDU_ID IS NULL
BEGIN
    SET @EDU_ID    = ISNULL((SELECT TOP 1 cause_id FROM dbo.Causes WHERE cause_code = 'EDU'),     1);
    SET @NUTRI_ID  = ISNULL((SELECT TOP 1 cause_id FROM dbo.Causes WHERE cause_code = 'NUTRI'),  2);
    SET @HEALTH_ID = ISNULL((SELECT TOP 1 cause_id FROM dbo.Causes WHERE cause_code = 'HEALTH'), 3);
    SET @SPECIAL_ID= ISNULL((SELECT TOP 1 cause_id FROM dbo.Causes WHERE cause_code = 'SPECIAL'), 4);
END

-- =====================================================
-- CAMPAIGN 1 — Nutritious Meals for Children
-- =====================================================
MERGE dbo.Campaigns AS target
USING (SELECT
    @NUTRI_ID AS cause_id,
    N'Nutritious Meals for Children' AS campaign_name,
    'MEALS-2026' AS campaign_code,
    N'Many children in difficult circumstances go to bed hungry. Through this campaign, we provide daily balanced meals — including rice, vegetables, protein and milk — to children at care homes and rural community centres. Every meal we serve brings strength, focus, and hope to a child who needs it most. Your gift of just 50,000 VND can help provide one full, nutritious meal.' AS description,
    45000000.00 AS goal_amount,
    21500000.00 AS raised_amount,
    '2026-08-01' AS start_date,
    '2026-11-30' AS end_date,
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80' AS image_url,
    350 AS beneficiaries_count,
    N'Ho Chi Minh City & surrounding provinces' AS location,
    'Active' AS status,
    1 AS is_featured,
    1 AS display_order
) AS source (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
              start_date, end_date, image_url, beneficiaries_count, location, status, is_featured, display_order)
ON target.campaign_code = source.campaign_code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
            start_date, end_date, image_url, beneficiaries_count, location,
            status, is_featured, display_order)
    VALUES (source.cause_id, source.campaign_name, source.campaign_code,
            source.description, source.goal_amount, source.raised_amount,
            source.start_date, source.end_date, source.image_url,
            source.beneficiaries_count, source.location,
            source.status, source.is_featured, source.display_order)
WHEN MATCHED AND target.campaign_name <> source.campaign_name THEN
    UPDATE SET
        cause_id          = source.cause_id,
        campaign_name     = source.campaign_name,
        description       = source.description,
        goal_amount      = source.goal_amount,
        raised_amount    = source.raised_amount,
        start_date       = source.start_date,
        end_date         = source.end_date,
        image_url        = source.image_url,
        beneficiaries_count = source.beneficiaries_count,
        location         = source.location,
        status           = source.status,
        is_featured     = source.is_featured,
        display_order   = source.display_order;

-- =====================================================
-- CAMPAIGN 2 — School Supplies for a Brighter Future
-- =====================================================
MERGE dbo.Campaigns AS target
USING (SELECT
    @EDU_ID AS cause_id,
    N'School Supplies for a Brighter Future' AS campaign_name,
    'SUPPLIES-2026' AS campaign_code,
    N'For children from low-income families, going back to school often means choosing between buying a notebook or buying dinner. This campaign provides essential school supplies — backpacks, textbooks, notebooks, pens, pencils and learning kits — so that no child is held back simply because their family cannot afford the basics. A small donation can put a full set of learning tools into the hands of a child ready to learn.' AS description,
    30000000.00 AS goal_amount,
    12750000.00 AS raised_amount,
    '2026-08-15' AS start_date,
    '2026-10-15' AS end_date,
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80' AS image_url,
    500 AS beneficiaries_count,
    N'Hanoi, Hai Phong and northern provinces' AS location,
    'Active' AS status,
    1 AS is_featured,
    2 AS display_order
) AS source (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
              start_date, end_date, image_url, beneficiaries_count, location, status, is_featured, display_order)
ON target.campaign_code = source.campaign_code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
            start_date, end_date, image_url, beneficiaries_count, location,
            status, is_featured, display_order)
    VALUES (source.cause_id, source.campaign_name, source.campaign_code,
            source.description, source.goal_amount, source.raised_amount,
            source.start_date, source.end_date, source.image_url,
            source.beneficiaries_count, source.location,
            source.status, source.is_featured, source.display_order)
WHEN MATCHED AND target.campaign_name <> source.campaign_name THEN
    UPDATE SET
        cause_id          = source.cause_id,
        campaign_name     = source.campaign_name,
        description       = source.description,
        goal_amount      = source.goal_amount,
        raised_amount    = source.raised_amount,
        start_date       = source.start_date,
        end_date         = source.end_date,
        image_url        = source.image_url,
        beneficiaries_count = source.beneficiaries_count,
        location         = source.location,
        status           = source.status,
        is_featured     = source.is_featured,
        display_order   = source.display_order;

-- =====================================================
-- CAMPAIGN 3 — Support Children at Care Homes
-- =====================================================
MERGE dbo.Campaigns AS target
USING (SELECT
    @SPECIAL_ID AS cause_id,
    N'Support Children at Care Homes' AS campaign_name,
    'CARE-HOMES-2026' AS campaign_code,
    N'Across Vietnam, hundreds of children live in small care homes that depend entirely on community goodwill. This campaign funds monthly food baskets, new clothing, hygiene supplies and educational materials for children in 12 partner care homes. Your support gives caregivers the resources they need and gives children the comfort of knowing someone out there is rooting for them.' AS description,
    60000000.00 AS goal_amount,
    38200000.00 AS raised_amount,
    '2026-06-01' AS start_date,
    '2027-02-28' AS end_date,
    'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=1200&q=80' AS image_url,
    220 AS beneficiaries_count,
    N'Multiple cities in Vietnam' AS location,
    'Active' AS status,
    1 AS is_featured,
    3 AS display_order
) AS source (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
              start_date, end_date, image_url, beneficiaries_count, location, status, is_featured, display_order)
ON target.campaign_code = source.campaign_code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
            start_date, end_date, image_url, beneficiaries_count, location,
            status, is_featured, display_order)
    VALUES (source.cause_id, source.campaign_name, source.campaign_code,
            source.description, source.goal_amount, source.raised_amount,
            source.start_date, source.end_date, source.image_url,
            source.beneficiaries_count, source.location,
            source.status, source.is_featured, source.display_order)
WHEN MATCHED AND target.campaign_name <> source.campaign_name THEN
    UPDATE SET
        cause_id          = source.cause_id,
        campaign_name     = source.campaign_name,
        description       = source.description,
        goal_amount      = source.goal_amount,
        raised_amount    = source.raised_amount,
        start_date       = source.start_date,
        end_date         = source.end_date,
        image_url        = source.image_url,
        beneficiaries_count = source.beneficiaries_count,
        location         = source.location,
        status           = source.status,
        is_featured     = source.is_featured,
        display_order   = source.display_order;

-- =====================================================
-- CAMPAIGN 4 — Children's Healthcare Support
-- =====================================================
MERGE dbo.Campaigns AS target
USING (SELECT
    @HEALTH_ID AS cause_id,
    N'Children''s Healthcare Support' AS campaign_name,
    'HEALTH-2026' AS campaign_code,
    N'Children should never go without medical care because their family cannot afford it. This campaign funds routine health check-ups, essential medicines, vaccinations, and emergency treatment for children in underserved communities. We partner with local clinics and pediatric specialists to ensure every child receives timely, compassionate care.' AS description,
    50000000.00 AS goal_amount,
    18500000.00 AS raised_amount,
    '2026-07-01' AS start_date,
    '2026-12-31' AS end_date,
    'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=1200&q=80' AS image_url,
    180 AS beneficiaries_count,
    N'Mekong Delta region' AS location,
    'Active' AS status,
    1 AS is_featured,
    4 AS display_order
) AS source (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
              start_date, end_date, image_url, beneficiaries_count, location, status, is_featured, display_order)
ON target.campaign_code = source.campaign_code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
            start_date, end_date, image_url, beneficiaries_count, location,
            status, is_featured, display_order)
    VALUES (source.cause_id, source.campaign_name, source.campaign_code,
            source.description, source.goal_amount, source.raised_amount,
            source.start_date, source.end_date, source.image_url,
            source.beneficiaries_count, source.location,
            source.status, source.is_featured, source.display_order)
WHEN MATCHED AND target.campaign_name <> source.campaign_name THEN
    UPDATE SET
        cause_id          = source.cause_id,
        campaign_name     = source.campaign_name,
        description       = source.description,
        goal_amount      = source.goal_amount,
        raised_amount    = source.raised_amount,
        start_date       = source.start_date,
        end_date         = source.end_date,
        image_url        = source.image_url,
        beneficiaries_count = source.beneficiaries_count,
        location         = source.location,
        status           = source.status,
        is_featured     = source.is_featured,
        display_order   = source.display_order;

-- =====================================================
-- CAMPAIGN 5 — Back-to-School Support
-- =====================================================
MERGE dbo.Campaigns AS target
USING (SELECT
    @EDU_ID AS cause_id,
    N'Back-to-School Support' AS campaign_name,
    'BACK2SCHOOL-2026' AS campaign_code,
    N'A new school year should be an exciting milestone — not a financial burden. Our Back-to-School Support campaign provides uniforms, shoes, school bags, and complete learning kits to children from families facing financial hardship. Together, we can make sure every child walks into the new school year with confidence, dignity and the right tools to succeed.' AS description,
    35000000.00 AS goal_amount,
    9800000.00 AS raised_amount,
    '2026-08-20' AS start_date,
    '2026-09-15' AS end_date,
    'https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=1200&q=80' AS image_url,
    400 AS beneficiaries_count,
    N'Central Highlands provinces' AS location,
    'Active' AS status,
    0 AS is_featured,
    5 AS display_order
) AS source (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
              start_date, end_date, image_url, beneficiaries_count, location, status, is_featured, display_order)
ON target.campaign_code = source.campaign_code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
            start_date, end_date, image_url, beneficiaries_count, location,
            status, is_featured, display_order)
    VALUES (source.cause_id, source.campaign_name, source.campaign_code,
            source.description, source.goal_amount, source.raised_amount,
            source.start_date, source.end_date, source.image_url,
            source.beneficiaries_count, source.location,
            source.status, source.is_featured, source.display_order)
WHEN MATCHED AND target.campaign_name <> source.campaign_name THEN
    UPDATE SET
        cause_id          = source.cause_id,
        campaign_name    = source.campaign_name,
        description       = source.description,
        goal_amount      = source.goal_amount,
        raised_amount    = source.raised_amount,
        start_date       = source.start_date,
        end_date         = source.end_date,
        image_url        = source.image_url,
        beneficiaries_count = source.beneficiaries_count,
        location         = source.location,
        status           = source.status,
        is_featured      = source.is_featured,
        display_order   = source.display_order;

-- =====================================================
-- CAMPAIGN 6 — Gifts for Children
-- =====================================================
MERGE dbo.Campaigns AS target
USING (SELECT
    @SPECIAL_ID AS cause_id,
    N'Gifts for Children' AS campaign_name,
    'GIFTS-2026' AS campaign_code,
    N'Every child deserves to feel remembered and loved on their birthday and during the festive season. Through this campaign, we deliver carefully chosen gifts — toys, books, art supplies, and personalised care packages — to children in hospitals, care homes and remote communities. A single gift can brighten a child''s entire year.' AS description,
    20000000.00 AS goal_amount,
    14300000.00 AS raised_amount,
    '2026-09-01' AS start_date,
    '2026-12-25' AS end_date,
    'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1200&q=80' AS image_url,
    600 AS beneficiaries_count,
    N'Nationwide' AS location,
    'Active' AS status,
    0 AS is_featured,
    6 AS display_order
) AS source (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
              start_date, end_date, image_url, beneficiaries_count, location, status, is_featured, display_order)
ON target.campaign_code = source.campaign_code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
            start_date, end_date, image_url, beneficiaries_count, location,
            status, is_featured, display_order)
    VALUES (source.cause_id, source.campaign_name, source.campaign_code,
            source.description, source.goal_amount, source.raised_amount,
            source.start_date, source.end_date, source.image_url,
            source.beneficiaries_count, source.location,
            source.status, source.is_featured, source.display_order)
WHEN MATCHED AND target.campaign_name <> source.campaign_name THEN
    UPDATE SET
        cause_id          = source.cause_id,
        campaign_name    = source.campaign_name,
        description       = source.description,
        goal_amount      = source.goal_amount,
        raised_amount    = source.raised_amount,
        start_date       = source.start_date,
        end_date         = source.end_date,
        image_url        = source.image_url,
        beneficiaries_count = source.beneficiaries_count,
        location         = source.location,
        status           = source.status,
        is_featured      = source.is_featured,
        display_order   = source.display_order;

-- =====================================================
-- CAMPAIGN 7 — Warm Winter for Children
-- =====================================================
MERGE dbo.Campaigns AS target
USING (SELECT
    @SPECIAL_ID AS cause_id,
    N'Warm Winter for Children' AS campaign_name,
    'WINTER-2026' AS campaign_code,
    N'Northern Vietnam''s winters can be bitterly cold, and for children without warm clothing, the season brings real suffering. This campaign provides winter jackets, blankets, socks, hats and gloves to children in mountainous provinces. Together we can make sure no child has to choose between going to school and staying warm.' AS description,
    40000000.00 AS goal_amount,
    7100000.00 AS raised_amount,
    '2026-10-15' AS start_date,
    '2027-01-31' AS end_date,
    'https://images.unsplash.com/photo-1545193544-312983719627?auto=format&fit=crop&w=1200&q=80' AS image_url,
    450 AS beneficiaries_count,
    N'Northern mountainous provinces' AS location,
    'Active' AS status,
    1 AS is_featured,
    7 AS display_order
) AS source (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
              start_date, end_date, image_url, beneficiaries_count, location, status, is_featured, display_order)
ON target.campaign_code = source.campaign_code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
            start_date, end_date, image_url, beneficiaries_count, location,
            status, is_featured, display_order)
    VALUES (source.cause_id, source.campaign_name, source.campaign_code,
            source.description, source.goal_amount, source.raised_amount,
            source.start_date, source.end_date, source.image_url,
            source.beneficiaries_count, source.location,
            source.status, source.is_featured, source.display_order)
WHEN MATCHED AND target.campaign_name <> source.campaign_name THEN
    UPDATE SET
        cause_id          = source.cause_id,
        campaign_name    = source.campaign_name,
        description       = source.description,
        goal_amount      = source.goal_amount,
        raised_amount    = source.raised_amount,
        start_date       = source.start_date,
        end_date         = source.end_date,
        image_url        = source.image_url,
        beneficiaries_count = source.beneficiaries_count,
        location         = source.location,
        status           = source.status,
        is_featured      = source.is_featured,
        display_order   = source.display_order;

-- =====================================================
-- CAMPAIGN 8 — Education Opportunity Fund
-- =====================================================
MERGE dbo.Campaigns AS target
USING (SELECT
    @EDU_ID AS cause_id,
    N'Education Opportunity Fund' AS campaign_name,
    'EDU-FUND-2026' AS campaign_code,
    N'This long-term scholarship program supports promising students from disadvantaged backgrounds through secondary school and university. Donations cover tuition fees, textbooks, mentoring, and a small monthly stipend so that students can focus entirely on their studies. Every scholar we support today becomes a future role model for their community.' AS description,
    80000000.00 AS goal_amount,
    45600000.00 AS raised_amount,
    '2026-05-01' AS start_date,
    '2027-06-30' AS end_date,
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80' AS image_url,
    80 AS beneficiaries_count,
    N'Nationwide' AS location,
    'Active' AS status,
    0 AS is_featured,
    8 AS display_order
) AS source (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
              start_date, end_date, image_url, beneficiaries_count, location, status, is_featured, display_order)
ON target.campaign_code = source.campaign_code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount,
            start_date, end_date, image_url, beneficiaries_count, location,
            status, is_featured, display_order)
    VALUES (source.cause_id, source.campaign_name, source.campaign_code,
            source.description, source.goal_amount, source.raised_amount,
            source.start_date, source.end_date, source.image_url,
            source.beneficiaries_count, source.location,
            source.status, source.is_featured, source.display_order)
WHEN MATCHED AND target.campaign_name <> source.campaign_name THEN
    UPDATE SET
        cause_id          = source.cause_id,
        campaign_name    = source.campaign_name,
        description       = source.description,
        goal_amount      = source.goal_amount,
        raised_amount    = source.raised_amount,
        start_date       = source.start_date,
        end_date         = source.end_date,
        image_url        = source.image_url,
        beneficiaries_count = source.beneficiaries_count,
        location         = source.location,
        status           = source.status,
        is_featured      = source.is_featured,
        display_order   = source.display_order;

-- =====================================================
-- FEATURED FLAG — mark top 3 campaigns
-- =====================================================
UPDATE dbo.Campaigns SET is_featured = 1
WHERE campaign_code IN ('MEALS-2026', 'SUPPLIES-2026', 'CARE-HOMES-2026');

-- =====================================================
-- SEED REALISTIC DONATIONS (only if none exist for these campaigns)
-- Uses user IDs 2 and 3 (demo users seeded by application).
-- =====================================================
IF NOT EXISTS (
    SELECT 1 FROM dbo.Donations
    WHERE transaction_id = 'TXN-C4K-0001'
)
BEGIN
    INSERT INTO dbo.Donations
        (user_id, cause_id, campaign_id, organization_id, amount, payment_method,
         payment_status, card_last_four, card_type, is_anonymous, donation_date, transaction_id)
    VALUES
        (2, @NUTRI_ID,
         (SELECT campaign_id FROM dbo.Campaigns WHERE campaign_code = 'MEALS-2026'),
         NULL, 500000, 'CreditCard', 'Completed', '1234', 'Visa', 0, '2026-08-05', 'TXN-C4K-0001'),
        (3, @NUTRI_ID,
         (SELECT campaign_id FROM dbo.Campaigns WHERE campaign_code = 'MEALS-2026'),
         NULL, 200000, 'CreditCard', 'Completed', '5678', 'MasterCard', 0, '2026-08-12', 'TXN-C4K-0002'),
        (2, @NUTRI_ID,
         (SELECT campaign_id FROM dbo.Campaigns WHERE campaign_code = 'MEALS-2026'),
         NULL, 1000000, 'BankTransfer', 'Completed', NULL, NULL, 0, '2026-09-01', 'TXN-C4K-0003'),
        (3, @NUTRI_ID,
         (SELECT campaign_id FROM dbo.Campaigns WHERE campaign_code = 'MEALS-2026'),
         NULL, 300000, 'CreditCard', 'Completed', '9012', 'Visa', 1, '2026-09-04', 'TXN-C4K-0004'),
        (3, @EDU_ID,
         (SELECT campaign_id FROM dbo.Campaigns WHERE campaign_code = 'SUPPLIES-2026'),
         NULL, 250000, 'CreditCard', 'Completed', '3456', 'Visa', 0, '2026-08-20', 'TXN-C4K-0005'),
        (2, @EDU_ID,
         (SELECT campaign_id FROM dbo.Campaigns WHERE campaign_code = 'SUPPLIES-2026'),
         NULL, 500000, 'CreditCard', 'Completed', '7890', 'Visa', 0, '2026-08-28', 'TXN-C4K-0006'),
        (3, @SPECIAL_ID,
         (SELECT campaign_id FROM dbo.Campaigns WHERE campaign_code = 'CARE-HOMES-2026'),
         NULL, 2000000, 'BankTransfer', 'Completed', NULL, NULL, 0, '2026-07-15', 'TXN-C4K-0007'),
        (2, @SPECIAL_ID,
         (SELECT campaign_id FROM dbo.Campaigns WHERE campaign_code = 'CARE-HOMES-2026'),
         NULL, 5000000, 'BankTransfer', 'Completed', NULL, NULL, 1, '2026-08-10', 'TXN-C4K-0008'),
        (2, @HEALTH_ID,
         (SELECT campaign_id FROM dbo.Campaigns WHERE campaign_code = 'HEALTH-2026'),
         NULL, 800000, 'CreditCard', 'Completed', '1111', 'MasterCard', 0, '2026-07-25', 'TXN-C4K-0009'),
        (3, @EDU_ID,
         (SELECT campaign_id FROM dbo.Campaigns WHERE campaign_code = 'BACK2SCHOOL-2026'),
         NULL, 400000, 'CreditCard', 'Completed', '2222', 'Visa', 0, '2026-08-22', 'TXN-C4K-0010'),
        (2, @SPECIAL_ID,
         (SELECT campaign_id FROM dbo.Campaigns WHERE campaign_code = 'GIFTS-2026'),
         NULL, 1500000, 'CreditCard', 'Completed', '3333', 'Visa', 1, '2026-09-02', 'TXN-C4K-0011'),
        (2, @EDU_ID,
         (SELECT campaign_id FROM dbo.Campaigns WHERE campaign_code = 'EDU-FUND-2026'),
         NULL, 5000000, 'BankTransfer', 'Completed', NULL, NULL, 0, '2026-06-12', 'TXN-C4K-0012'),
        (3, @EDU_ID,
         (SELECT campaign_id FROM dbo.Campaigns WHERE campaign_code = 'EDU-FUND-2026'),
         NULL, 3500000, 'BankTransfer', 'Completed', NULL, NULL, 0, '2026-07-08', 'TXN-C4K-0013');
END
GO

PRINT 'Care4Kids campaigns seeded (idempotent MERGE — existing data preserved).';
GO
