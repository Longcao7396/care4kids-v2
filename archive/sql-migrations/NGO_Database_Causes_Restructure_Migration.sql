-- =====================================================
-- NGO_Database_Causes_Restructure_Migration.sql
--
-- Restructures the Causes table to support a 2-level hierarchy
-- (parent cause + sub-causes) matching the Care4Kids business brief:
--
--   1. Education for children       (Giáo dục cho trẻ em)
--   2. Nutrition & food             (Dinh dưỡng & thực phẩm)
--   3. Medical care                 (Chăm sóc y tế)
--   4. Clean water & sanitation     (Nước sạch & vệ sinh)
--   5. Special circumstances        (Trẻ em có hoàn cảnh đặc biệt)
--   6. Clothing & essentials        (Quần áo & nhu yếu phẩm)
--   7. Child protection             (Bảo vệ trẻ em)
--   8. Emergency relief             (Hỗ trợ khẩn cấp)
--   9. Future development           (Phát triển tương lai)
--
-- Steps:
--   1. ALTER Causes: add parent_cause_id (self-FK, nullable)
--   2. Disable FK from Campaigns temporarily so we can re-seed
--   3. Move existing cause_id references out of the way
--      (don't drop — preserve campaign/donation FK by remapping)
--   4. DELETE old causes, INSERT 9 new parents + sub-causes
--   5. Re-link Campaigns and Donations to the new IDs
-- =====================================================

-- =====================================================
-- 1. SCHEMA CHANGE (idempotent — runs OUTSIDE the data transaction
--    because DDL implicitly commits in SQL Server and is fast enough
--    to be safe even on a partially-restored DB).
-- =====================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Causes') AND name = 'parent_cause_id'
)
BEGIN
    ALTER TABLE dbo.Causes
        ADD parent_cause_id INT NULL;

    ALTER TABLE dbo.Causes
        ADD CONSTRAINT FK_Causes_ParentCause
            FOREIGN KEY (parent_cause_id)
            REFERENCES dbo.Causes (cause_id)
            ON DELETE NO ACTION;

    CREATE INDEX idx_causes_parent ON dbo.Causes (parent_cause_id);
END
GO

BEGIN TRANSACTION;
BEGIN TRY

-- =====================================================
-- 2. PREPARE A BACKUP MAPPING TABLE
-- (Workaround for re-id: keep the old cause_id so we can
--  remap campaigns/donations after we re-seed.)
-- =====================================================
IF OBJECT_ID('tempdb..#OldCauseMap') IS NOT NULL DROP TABLE #OldCauseMap;
CREATE TABLE #OldCauseMap (
    old_cause_id     INT PRIMARY KEY,
    old_cause_code   VARCHAR(20),
    new_cause_code   VARCHAR(20)
);

INSERT INTO #OldCauseMap (old_cause_id, old_cause_code, new_cause_code)
SELECT cause_id, cause_code,
       CASE cause_code
           WHEN 'CHILD'  THEN 'SPECIAL'
           WHEN 'EDU'    THEN 'EDU'
           WHEN 'DIS'    THEN 'SPECIAL'
           WHEN 'WOMAN'  THEN 'PROTECT'
           WHEN 'YOUTH'  THEN 'FUTURE'
           WHEN 'ELDER'  THEN 'SPECIAL'
       END
FROM dbo.Causes
WHERE cause_code IN ('CHILD','EDU','DIS','WOMAN','YOUTH','ELDER');

-- =====================================================
-- 3. RE-LINK CHILD TABLES TO A SAFE PLACEHOLDER
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Causes WHERE cause_code = '__PLACEHOLDER__')
BEGIN
    INSERT INTO dbo.Causes (cause_name, cause_code, description, display_order)
    VALUES (N'__placeholder__', '__PLACEHOLDER__', N'temporary placeholder', 9999);
END

DECLARE @placeholder_id INT = (SELECT cause_id FROM dbo.Causes WHERE cause_code = '__PLACEHOLDER__');
PRINT 'PH_ID: ' + ISNULL(CAST(@placeholder_id AS VARCHAR), '<NULL>');

-- Capture the original cause_code for every campaign/donation BEFORE we
-- mutate anything, so we can re-link to the NEW parents after insertion.
IF OBJECT_ID('tempdb..#CampaignOriginal') IS NOT NULL DROP TABLE #CampaignOriginal;
CREATE TABLE #CampaignOriginal (
    campaign_id    INT PRIMARY KEY,
    original_code  VARCHAR(20) NOT NULL
);

INSERT INTO #CampaignOriginal (campaign_id, original_code)
SELECT c.campaign_id, ocm.old_cause_code
FROM dbo.Campaigns c
INNER JOIN #OldCauseMap ocm ON c.cause_id = ocm.old_cause_id;

IF OBJECT_ID('tempdb..#DonationOriginal') IS NOT NULL DROP TABLE #DonationOriginal;
CREATE TABLE #DonationOriginal (
    donation_id    INT PRIMARY KEY,
    original_code  VARCHAR(20) NOT NULL
);

INSERT INTO #DonationOriginal (donation_id, original_code)
SELECT d.donation_id, ocm.old_cause_code
FROM dbo.Donations d
INNER JOIN #OldCauseMap ocm ON d.cause_id = ocm.old_cause_id;

UPDATE dbo.Campaigns SET cause_id = @placeholder_id
WHERE cause_id IN (SELECT old_cause_id FROM #OldCauseMap);
PRINT 'CAMPAIGNS_MOVED: ' + CAST(@@ROWCOUNT AS VARCHAR);

UPDATE dbo.Donations SET cause_id = @placeholder_id
WHERE cause_id IN (SELECT old_cause_id FROM #OldCauseMap);
PRINT 'DONATIONS_MOVED: ' + CAST(@@ROWCOUNT AS VARCHAR);

-- =====================================================
-- 4. DELETE OLD CAUSES (only legacy code list)
-- =====================================================
DELETE FROM dbo.Causes
WHERE cause_code IN ('CHILD','EDU','DIS','WOMAN','YOUTH','ELDER');

-- =====================================================
-- 5. INSERT 9 PARENT CAUSES
-- (capture their new cause_ids into a temp table for sub-items)
-- =====================================================
IF OBJECT_ID('tempdb..#NewParents') IS NOT NULL DROP TABLE #NewParents;
CREATE TABLE #NewParents (
    new_cause_code VARCHAR(20) PRIMARY KEY,
    new_cause_id   INT NOT NULL
);

DECLARE @ins TABLE (cause_id INT, cause_code VARCHAR(20));

-- 1. Education for children
INSERT INTO dbo.Causes (cause_name, cause_code, description, icon, display_order)
OUTPUT INSERTED.cause_id, INSERTED.cause_code INTO @ins
VALUES (N'Giáo dục cho trẻ em', 'EDU',
        N'Hỗ trợ giáo dục cho trẻ em: sách vở, đồng phục, dụng cụ học tập, học phí, xây dựng trường/lớp, học bổng.',
        'bi-mortarboard-fill', 1);
INSERT INTO #NewParents VALUES ('EDU', (SELECT cause_id FROM @ins WHERE cause_code='EDU'));
DELETE FROM @ins;

-- 2. Nutrition & food
INSERT INTO dbo.Causes (cause_name, cause_code, description, icon, display_order)
OUTPUT INSERTED.cause_id, INSERTED.cause_code INTO @ins
VALUES (N'Dinh dưỡng & thực phẩm', 'NUTRI',
        N'Cung cấp bữa ăn đủ dinh dưỡng, hỗ trợ trẻ suy dinh dưỡng, sữa và thực phẩm thiết yếu.',
        'bi-egg-fried', 2);
INSERT INTO #NewParents VALUES ('NUTRI', (SELECT cause_id FROM @ins WHERE cause_code='NUTRI'));
DELETE FROM @ins;

-- 3. Medical care
INSERT INTO dbo.Causes (cause_name, cause_code, description, icon, display_order)
OUTPUT INSERTED.cause_id, INSERTED.cause_code INTO @ins
VALUES (N'Chăm sóc y tế', 'HEALTH',
        N'Khám chữa bệnh, hỗ trợ chi phí điều trị, cung cấp thuốc và vật tư y tế, khám sức khỏe định kỳ.',
        'bi-heart-pulse-fill', 3);
INSERT INTO #NewParents VALUES ('HEALTH', (SELECT cause_id FROM @ins WHERE cause_code='HEALTH'));
DELETE FROM @ins;

-- 4. Clean water & sanitation
INSERT INTO dbo.Causes (cause_name, cause_code, description, icon, display_order)
OUTPUT INSERTED.cause_id, INSERTED.cause_code INTO @ins
VALUES (N'Nước sạch & vệ sinh', 'WATER',
        N'Cung cấp nước sạch, hệ thống nước tại trường/khu dân cư, nhà vệ sinh và chương trình vệ sinh cá nhân.',
        'bi-droplet-fill', 4);
INSERT INTO #NewParents VALUES ('WATER', (SELECT cause_id FROM @ins WHERE cause_code='WATER'));
DELETE FROM @ins;

-- 5. Special circumstances
INSERT INTO dbo.Causes (cause_name, cause_code, description, icon, display_order)
OUTPUT INSERTED.cause_id, INSERTED.cause_code INTO @ins
VALUES (N'Trẻ em có hoàn cảnh đặc biệt', 'SPECIAL',
        N'Trẻ mồ côi, trẻ em thuộc gia đình khó khăn, trẻ khuyết tật, trẻ không có điều kiện tiếp cận giáo dục và chăm sóc cơ bản.',
        'bi-people-fill', 5);
INSERT INTO #NewParents VALUES ('SPECIAL', (SELECT cause_id FROM @ins WHERE cause_code='SPECIAL'));
DELETE FROM @ins;

-- 6. Clothing & essentials
INSERT INTO dbo.Causes (cause_name, cause_code, description, icon, display_order)
OUTPUT INSERTED.cause_id, INSERTED.cause_code INTO @ins
VALUES (N'Quần áo & nhu yếu phẩm', 'CLOTH',
        N'Quần áo, chăn màn, giày dép, đồ dùng sinh hoạt thiết yếu cho trẻ em.',
        'bi-bag-heart-fill', 6);
INSERT INTO #NewParents VALUES ('CLOTH', (SELECT cause_id FROM @ins WHERE cause_code='CLOTH'));
DELETE FROM @ins;

-- 7. Child protection
INSERT INTO dbo.Causes (cause_name, cause_code, description, icon, display_order)
OUTPUT INSERTED.cause_id, INSERTED.cause_code INTO @ins
VALUES (N'Bảo vệ trẻ em', 'PROTECT',
        N'Phòng chống bạo lực và xâm hại, bảo vệ trẻ có nguy cơ bị bỏ rơi, hỗ trợ trẻ trong môi trường không an toàn.',
        'bi-shield-fill-check', 7);
INSERT INTO #NewParents VALUES ('PROTECT', (SELECT cause_id FROM @ins WHERE cause_code='PROTECT'));
DELETE FROM @ins;

-- 8. Emergency relief
INSERT INTO dbo.Causes (cause_name, cause_code, description, icon, display_order)
OUTPUT INSERTED.cause_id, INSERTED.cause_code INTO @ins
VALUES (N'Hỗ trợ khẩn cấp', 'EMERG',
        N'Hỗ trợ trẻ em bị ảnh hưởng bởi bão lũ, thiên tai, dịch bệnh; thực phẩm, nước uống, nhu yếu phẩm khẩn cấp và phục hồi sau thiên tai.',
        'bi-life-preserver', 8);
INSERT INTO #NewParents VALUES ('EMERG', (SELECT cause_id FROM @ins WHERE cause_code='EMERG'));
DELETE FROM @ins;

-- 9. Future development
INSERT INTO dbo.Causes (cause_name, cause_code, description, icon, display_order)
OUTPUT INSERTED.cause_id, INSERTED.cause_code INTO @ins
VALUES (N'Phát triển tương lai', 'FUTURE',
        N'Đào tạo kỹ năng, hỗ trợ học nghề cho trẻ lớn, các chương trình giúp trẻ có cơ hội tự lập trong tương lai.',
        'bi-stars', 9);
INSERT INTO #NewParents VALUES ('FUTURE', (SELECT cause_id FROM @ins WHERE cause_code='FUTURE'));
DELETE FROM @ins;

-- =====================================================
-- 6. INSERT SUB-CAUSES (specific items from the brief)
-- =====================================================

-- Education sub-items
DECLARE @parent_id INT;
SELECT @parent_id = new_cause_id FROM #NewParents WHERE new_cause_code='EDU';
INSERT INTO dbo.Causes (cause_name, cause_code, description, parent_cause_id, display_order) VALUES
    (N'Mua sách vở, đồng phục, dụng cụ học tập', 'EDU-SUPPLIES', N'Sách giáo khoa, vở, đồng phục, dụng cụ học tập',              @parent_id, 1),
    (N'Hỗ trợ học phí',                            'EDU-FEES',     N'Hỗ trợ học phí cho trẻ em nghèo',                                  @parent_id, 2),
    (N'Xây dựng trường/lớp học',                   'EDU-INFRA',    N'Đầu tư cơ sở vật chất trường/lớp học',                            @parent_id, 3),
    (N'Trao học bổng cho trẻ khó khăn',            'EDU-SCHOLAR',  N'Học bổng khuyến học cho trẻ em có hoàn cảnh khó khăn',              @parent_id, 4);

-- Nutrition sub-items
SELECT @parent_id = new_cause_id FROM #NewParents WHERE new_cause_code='NUTRI';
INSERT INTO dbo.Causes (cause_name, cause_code, description, parent_cause_id, display_order) VALUES
    (N'Cung cấp bữa ăn đủ dinh dưỡng',             'NUTRI-MEALS',  N'Bữa ăn hàng ngày đảm bảo dinh dưỡng cho trẻ',                       @parent_id, 1),
    (N'Hỗ trợ trẻ suy dinh dưỡng',                 'NUTRI-MALNUTR',N'Phục hồi dinh dưỡng cho trẻ suy dinh dưỡng',                        @parent_id, 2),
    (N'Sữa và thực phẩm thiết yếu',                'NUTRI-MILK',   N'Cung cấp sữa, thực phẩm thiết yếu hàng ngày',                      @parent_id, 3);

-- Medical sub-items
SELECT @parent_id = new_cause_id FROM #NewParents WHERE new_cause_code='HEALTH';
INSERT INTO dbo.Causes (cause_name, cause_code, description, parent_cause_id, display_order) VALUES
    (N'Khám chữa bệnh cho trẻ',                    'HEALTH-CHK',   N'Khám và điều trị bệnh cho trẻ em',                                  @parent_id, 1),
    (N'Hỗ trợ chi phí điều trị',                   'HEALTH-COST',  N'Hỗ trợ tài chính cho gia đình trẻ trong quá trình điều trị',         @parent_id, 2),
    (N'Thuốc và vật tư y tế',                      'HEALTH-SUPPLY',N'Cung cấp thuốc và vật tư y tế thiết yếu',                           @parent_id, 3),
    (N'Khám sức khỏe định kỳ',                     'HEALTH-PERIOD',N'Chương trình khám sức khỏe định kỳ tại cộng đồng/trường học',       @parent_id, 4);

-- Water sub-items
SELECT @parent_id = new_cause_id FROM #NewParents WHERE new_cause_code='WATER';
INSERT INTO dbo.Causes (cause_name, cause_code, description, parent_cause_id, display_order) VALUES
    (N'Cung cấp nước sạch',                        'WATER-SUPPLY', N'Cung cấp nguồn nước sạch cho cộng đồng',                            @parent_id, 1),
    (N'Xây dựng hệ thống nước sạch tại trường/khu dân cư', 'WATER-SYSTEM', N'Đầu tư hệ thống nước sạch bền vững',                       @parent_id, 2),
    (N'Nhà vệ sinh & chương trình vệ sinh cá nhân', 'WATER-WASH',   N'Xây dựng nhà vệ sinh và giáo dục vệ sinh cá nhân',                   @parent_id, 3);

-- Special circumstances sub-items
SELECT @parent_id = new_cause_id FROM #NewParents WHERE new_cause_code='SPECIAL';
INSERT INTO dbo.Causes (cause_name, cause_code, description, parent_cause_id, display_order) VALUES
    (N'Trẻ mồ côi',                                'SPEC-ORPHAN',  N'Hỗ trợ trẻ mồ côi',                                                @parent_id, 1),
    (N'Trẻ em thuộc gia đình khó khăn',            'SPEC-POVERTY', N'Hỗ trợ trẻ em từ gia đình nghèo, khó khăn',                         @parent_id, 2),
    (N'Trẻ khuyết tật',                            'SPEC-DIS',     N'Hỗ trợ trẻ em khuyết tật',                                          @parent_id, 3),
    (N'Trẻ em không tiếp cận được giáo dục và CS cơ bản','SPEC-ACCESS',N'Hỗ trợ trẻ em bị giới hạn tiếp cận',                          @parent_id, 4);

-- Clothing sub-items
SELECT @parent_id = new_cause_id FROM #NewParents WHERE new_cause_code='CLOTH';
INSERT INTO dbo.Causes (cause_name, cause_code, description, parent_cause_id, display_order) VALUES
    (N'Quần áo',                                   'CLOTH-WEAR',   N'Cung cấp quần áo cho trẻ em',                                       @parent_id, 1),
    (N'Chăn màn',                                  'CLOTH-BLANKET',N'Cung cấp chăn màn cho trẻ em',                                      @parent_id, 2),
    (N'Giày dép',                                  'CLOTH-SHOES',  N'Cung cấp giày dép cho trẻ em',                                      @parent_id, 3),
    (N'Đồ dùng sinh hoạt',                         'CLOTH-DAILY',  N'Đồ dùng sinh hoạt thiết yếu',                                      @parent_id, 4);

-- Protection sub-items
SELECT @parent_id = new_cause_id FROM #NewParents WHERE new_cause_code='PROTECT';
INSERT INTO dbo.Causes (cause_name, cause_code, description, parent_cause_id, display_order) VALUES
    (N'Phòng chống bạo lực và xâm hại trẻ em',     'PROT-VIOLENCE',N'Các chương trình phòng chống bạo lực và xâm hại',                   @parent_id, 1),
    (N'Bảo vệ trẻ em có nguy cơ bị bỏ rơi',        'PROT-ABANDON', N'Hỗ trợ trẻ em có nguy cơ bị bỏ rơi',                               @parent_id, 2),
    (N'Hỗ trợ trẻ trong môi trường không an toàn', 'PROT-UNSAFE',  N'Can thiệp cho trẻ trong môi trường không an toàn',                  @parent_id, 3);

-- Emergency sub-items
SELECT @parent_id = new_cause_id FROM #NewParents WHERE new_cause_code='EMERG';
INSERT INTO dbo.Causes (cause_name, cause_code, description, parent_cause_id, display_order) VALUES
    (N'Hỗ trợ trẻ em bị ảnh hưởng bởi thiên tai', 'EMERG-DISASTER',N'Hỗ trợ trẻ em trong các tình huống bão lũ, thiên tai, dịch bệnh',  @parent_id, 1),
    (N'Cung cấp lương thực, nước uống khẩn cấp', 'EMERG-FOOD',    N'Phát lương thực, nước uống và nhu yếu phẩm khẩn cấp',             @parent_id, 2),
    (N'Hỗ trợ phục hồi sau thiên tai',            'EMERG-RECOVER', N'Chương trình phục hồi sau thiên tai dài hạn',                      @parent_id, 3);

-- Future sub-items
SELECT @parent_id = new_cause_id FROM #NewParents WHERE new_cause_code='FUTURE';
INSERT INTO dbo.Causes (cause_name, cause_code, description, parent_cause_id, display_order) VALUES
    (N'Đào tạo kỹ năng',                          'FUTURE-SKILL',  N'Đào tạo kỹ năng sống và kỹ năng mềm',                              @parent_id, 1),
    (N'Hỗ trợ học nghề cho trẻ lớn',              'FUTURE-VOC',    N'Hỗ trợ học nghề và định hướng nghề nghiệp',                         @parent_id, 2),
    (N'Chương trình giúp trẻ tự lập',             'FUTURE-IND',    N'Các chương trình giúp trẻ có cơ hội tự lập trong tương lai',        @parent_id, 3);

-- =====================================================
-- 7. RE-LINK CAMPAIGNS AND DONATIONS
-- (Old campaigns pointed to old cause IDs; map them to the
--  new parents via the #OldCauseMap we built earlier.)
-- =====================================================

--  new parents via #CampaignOriginal/#DonationOriginal which captured
--  the OLD cause_code before any repointing happened.)
-- =====================================================

-- Re-link campaigns to their mapped parent cause.
UPDATE c
SET c.cause_id = np.new_cause_id
FROM dbo.Campaigns c
INNER JOIN #CampaignOriginal co ON c.campaign_id = co.campaign_id
INNER JOIN #NewParents np        ON co.original_code = np.new_cause_code;

UPDATE d
SET d.cause_id = np.new_cause_id
FROM dbo.Donations d
INNER JOIN #DonationOriginal do ON d.donation_id = do.donation_id
INNER JOIN #NewParents np        ON do.original_code = np.new_cause_code;

-- Drop placeholder (no longer referenced after re-link)
DECLARE @placeholder_id2 INT = (SELECT cause_id FROM dbo.Causes WHERE cause_code = '__PLACEHOLDER__');
IF @placeholder_id2 IS NOT NULL
BEGIN
    -- defensive: if any campaigns/donations are still on placeholder, send to EDU
    UPDATE dbo.Campaigns SET cause_id = (SELECT cause_id FROM dbo.Causes WHERE cause_code='EDU') WHERE cause_id = @placeholder_id2;
    UPDATE dbo.Donations  SET cause_id = (SELECT cause_id FROM dbo.Causes WHERE cause_code='EDU') WHERE cause_id = @placeholder_id2;
    DELETE FROM dbo.Causes WHERE cause_id = @placeholder_id2;
END

-- =====================================================
-- 8. ANY ORPHANED CAUSES (legacy cause_id referenced by a campaign/donation that we couldn't map)?
-- (Shouldn't happen given the mapping above, but be defensive.)
-- =====================================================
UPDATE dbo.Campaigns
SET cause_id = (SELECT TOP 1 cause_id FROM dbo.Causes WHERE cause_code='EDU')
WHERE cause_id NOT IN (SELECT cause_id FROM dbo.Causes);

UPDATE dbo.Donations
SET cause_id = (SELECT TOP 1 cause_id FROM dbo.Causes WHERE cause_code='EDU')
WHERE cause_id NOT IN (SELECT cause_id FROM dbo.Causes);

COMMIT TRANSACTION;
PRINT 'Causes restructured successfully.';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    DECLARE @msg NVARCHAR(MAX) = ERROR_MESSAGE();
    RAISERROR(@msg, 16, 1);
END CATCH;
GO
