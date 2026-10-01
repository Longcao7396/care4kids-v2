-- =====================================================================
-- GiveAID V2 — Gallery 64-Photo Seed (Idempotent)
-- ---------------------------------------------------------------------
-- Source documents:
--   assets/images/ảnh gallery/NGO_Gallery_Titles.docx              (1–20)
--   assets/images/ảnh gallery/NGO_Gallery_Titles_Batch2.docx        (21–40)
--   assets/images/ảnh gallery/NGO_Gallery_Titles_Batch3.docx        (41–60)
--   assets/images/ảnh gallery/NGO_Gallery_Titles_Batch4.docx        (61–64)
--
-- Photo URLs reference /images/gallery/Gxxx.{ext} files served by the
-- React app's public/ folder. The API surface remains identical:
--   GET  /api/v1/gallery          (public list)
--   GET  /api/v1/gallery/featured (featured subset for homepage)
--   CRUD /api/v1/gallery          (admin CMS)
--
-- Batch 3 has no #56 (numbered 55 → 57 in the source). 63 photos total.
--
-- Idempotent.  Uses MERGE matched on Title to upsert the docx set;
-- old unsplash-based rows are soft-deleted so re-running cleanly
-- retires them without losing the underlying file.
-- =====================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

USE GiveAIDDB;
GO

BEGIN TRY
    BEGIN TRAN;

    DECLARE @now DATETIME2 = SYSUTCDATETIME();
    DECLARE @uploadedBy INT = (SELECT TOP 1 user_id FROM dbo.users WHERE username = 'admin');

    IF OBJECT_ID(N'dbo.gallery', N'U') IS NULL
    BEGIN
        PRINT '!!! gallery table not found — run 01_CreateDatabase_V2.sql first.';
        ROLLBACK;
        RETURN;
    END;

    -- Source-of-truth list (63 rows). DisplayOrder = photo number.
    -- Categories are derived from the photo subject matter:
    --   portraits = close-up portraits of children
    --   community = groups, friendship, play
    --   education = school / learning
    --   health    = meals, nutrition
    --   relief    = hardship / cold-season resilience
    DECLARE @seedGallery TABLE (
        Title          NVARCHAR(200) NOT NULL,
        FileName       NVARCHAR(100) NOT NULL,
        Category       NVARCHAR(50)  NULL,
        DisplayOrder   INT           NOT NULL,
        IsFeatured     BIT           NOT NULL
    );

    INSERT INTO @seedGallery (Title, FileName, Category, DisplayOrder, IsFeatured)
    VALUES
        -- ── Batch 1 (1–20): Highlands & everyday moments ──
        (N'Growing Up in the Highlands',     N'G001.jpg', N'portraits',  1, 1),
        (N'Sharing Small Joys',              N'G002.jpg', N'portraits',  2, 0),
        (N'A Splash of Joy',                 N'G003.jpg', N'portraits',  3, 1),
        (N'Curious Eyes, Bright Future',     N'G004.jpg', N'education',  4, 0),
        (N'Swinging Toward Hope',            N'G005.jpg', N'community',  5, 0),
        (N'A Smile Worth Protecting',        N'G006.jpg', N'portraits',  6, 0),
        (N'Eager to Learn',                  N'G007.jpg', N'education',  7, 1),
        (N'Warm Hearts, Cold Hills',         N'G008.jpg', N'relief',     8, 0),
        (N'Building Their Future',           N'G009.jpg', N'education',  9, 0),
        (N'Hope in Their Hands',             N'G010.jpg', N'community', 10, 0),
        (N'A Meal Means the World',          N'G011.png', N'health',    11, 1),
        (N'Carrying Hope Uphill',            N'G012.jpg', N'community', 12, 0),
        (N'Secret Giggles',                  N'G013.jpg', N'portraits', 13, 0),
        (N'Hand in Hand',                    N'G014.jpg', N'community', 14, 1),
        (N'Hello from the Mountains',        N'G015.jpg', N'portraits', 15, 0),
        (N'Dreaming Above the Terraces',     N'G016.jpg', N'portraits', 16, 0),
        (N'Shy Smile, Big Dreams',           N'G017.jpg', N'portraits', 17, 0),
        (N'Peeking at Tomorrow',             N'G018.jpg', N'portraits', 18, 0),
        (N'Never Letting Go',                N'G019.jpg', N'community', 19, 0),
        (N'Looking Toward Tomorrow',         N'G020.jpg', N'portraits', 20, 1),

        -- ── Batch 2 (21–40): Cold season & resilience ──
        (N'Held Close',                      N'G021.jpg', N'portraits', 21, 0),
        (N'Resting, Still Hoping',           N'G022.jpg', N'portraits', 22, 0),
        (N'A Cold Morning Wait',             N'G023.jpg', N'relief',    23, 0),
        (N'Barefoot in the Cold',            N'G024.jpg', N'relief',    24, 1),
        (N'Standing Together',               N'G025.jpg', N'community', 25, 0),
        (N'Learning Against the Odds',       N'G026.jpg', N'education', 26, 0),
        (N'Room to Grow',                    N'G027.jpg', N'education', 27, 0),
        (N'Whispered Wishes',                N'G028.jpg', N'portraits', 28, 0),
        (N'Growing Up Too Fast',             N'G029.jpg', N'portraits', 29, 0),
        (N'Every Bowl Counts',               N'G030.jpg', N'health',    30, 1),
        (N'Carried with Love',               N'G031.jpg', N'community', 31, 0),
        (N'Small Hands at Work',             N'G032.jpg', N'community', 32, 0),
        (N'Walking Her Own Way',             N'G033.jpg', N'portraits', 33, 0),
        (N'A Sweet Little Moment',           N'G034.jpg', N'portraits', 34, 0),
        (N'A Quiet Smile',                   N'G035.jpg', N'portraits', 35, 0),
        (N'Little Explorer',                 N'G036.jpg', N'community', 36, 0),
        (N'Wide-Eyed Wonder',                N'G037.jpg', N'portraits', 37, 0),
        (N'Every Tear Matters',              N'G038.jpg', N'relief',    38, 0),
        (N'Brighter Days Ahead',             N'G039.jpg', N'portraits', 39, 1),
        (N'Laughing Together',               N'G040.jpg', N'community', 40, 0),

        -- ── Batch 3 (41–60): Family, farm, friendship ──
        -- (Note: source skips #56 — jumps 55 → 57)
        (N'Gentle Strength',                 N'G041.jpg', N'portraits', 41, 0),
        (N'Little Ones, Big Needs',          N'G042.jpg', N'relief',    42, 0),
        (N'Warmth Shared',                   N'G043.jpg', N'community', 43, 0),
        (N'Side by Side',                    N'G044.jpg', N'community', 44, 1),
        (N'Wildflower Laughter',             N'G045.jpg', N'portraits', 45, 0),
        (N'Golden Steps Together',           N'G046.jpg', N'community', 46, 0),
        (N'A Gift in Small Hands',           N'G047.jpg', N'community', 47, 0),
        (N'Waiting Quietly',                 N'G048.jpg', N'portraits', 48, 0),
        (N'Sleeping Safe on Her Back',       N'G049.jpg', N'portraits', 49, 1),
        (N'Running Through the Mist',        N'G050.jpg', N'community', 50, 0),
        (N'Rosy Cheeks, Big Smile',          N'G051.png', N'portraits', 51, 0),
        (N'Little Guardians',                N'G052.jpg', N'community', 52, 0),
        (N'Innocent Eyes',                   N'G053.jpg', N'portraits', 53, 1),
        (N'Little Farmhands',                N'G054.jpg', N'community', 54, 0),
        (N'Play Finds a Way',                N'G055.jpg', N'community', 55, 0),
        -- #56 deliberately missing in source
        (N'Comfort in Friendship',           N'G057.jpg', N'community', 57, 0),
        (N'Small Feet, Cold Ground',         N'G058.jpg', N'relief',    58, 0),
        (N'Joy in Bloom',                    N'G059.jpg', N'community', 59, 1),
        (N'Small Backs, Big Loads',          N'G060.jpg', N'community', 60, 0),

        -- ── Batch 4 (61–64): School & nutrition ──
        (N'A Classroom of Dreams',           N'G061.jpg', N'education', 61, 1),
        (N'Plain Rice, Grateful Hearts',     N'G062.jpg', N'health',    62, 0),
        (N'A Humble Schoolhouse',            N'G063.jpg', N'education', 63, 0),
        (N'Waiting for Lunch',               N'G064.jpg', N'health',    64, 0);

    -- Upsert by Title (natural key from the docx set).
    MERGE dbo.gallery AS target
    USING @seedGallery AS source
        ON target.title = source.Title
    WHEN MATCHED THEN
        UPDATE SET
            photo_url     = N'/images/gallery/' + source.FileName,
            category      = source.Category,
            display_order = source.DisplayOrder,
            is_featured   = source.IsFeatured,
            updated_at    = @now
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (title, photo_url, category, display_order, is_featured,
                uploaded_by, uploaded_at, created_at, updated_at,
                is_deleted, deleted_at)
        VALUES (source.Title,
                N'/images/gallery/' + source.FileName,
                source.Category,
                source.DisplayOrder,
                source.IsFeatured,
                @uploadedBy,
                @now,
                @now,
                @now,
                0,
                NULL);

    -- Retire the legacy unsplash-based placeholders that the original
    -- SeedData.cs inserted. Soft-delete keeps them in the audit trail.
    UPDATE g
       SET is_deleted = 1,
           deleted_at = @now,
           updated_at = @now
      FROM dbo.gallery g
     WHERE g.is_deleted = 0
       AND g.photo_url LIKE N'https://images.unsplash.com/%';

    COMMIT TRAN;
    PRINT '>>> Gallery seeded from 4 docx batches (63 photos).';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRAN;
    DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR(@msg, 16, 1);
END CATCH;
GO

-- ---------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------
SELECT
    COUNT(*) AS TotalPhotos,
    SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) AS FeaturedCount,
    COUNT(DISTINCT category) AS DistinctCategories
FROM dbo.gallery
WHERE is_deleted = 0;