-- =====================================================
-- GALLERY SEED — Add sample gallery items if table empty
-- Images use picsum.photos (royalty-free placeholder images)
-- =====================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF DB_NAME() <> N'GiveAIDDB'
    THROW 50000, 'Run this migration against GiveAIDDB only.', 1;
GO

-- Only seed if no items exist
IF NOT EXISTS (SELECT 1 FROM dbo.Gallery)
BEGIN
    PRINT 'Seeding Gallery items...';

    -- Get a sample ProgrammeId if available
    DECLARE @SampleProgrammeId INT = NULL;
    SELECT TOP 1 @SampleProgrammeId = ProgrammeId FROM dbo.Programmes WHERE Status = 'Ongoing';

    -- Get a sample OrganizationId if available
    DECLARE @SampleOrgId INT = NULL;
    SELECT TOP 1 @SampleOrgId = OrganizationId FROM dbo.Organizations WHERE IsActive = 1;

    SET IDENTITY_INSERT dbo.Gallery ON;

    INSERT INTO dbo.Gallery
        (gallery_id, title, photo_url, thumbnail_url, category, tags,
         programme_id, organization_id, display_order, is_featured, uploaded_at)
    VALUES
        -- Education
        (1,
         N'Children Learning Together',
         N'https://picsum.photos/seed/edu1/800/600',
         N'https://picsum.photos/seed/edu1/400/300',
         N'Education',
         N'children,learning,village,classroom',
         @SampleProgrammeId, @SampleOrgId, 1, 1, GETDATE()),

        (2,
         N'Teacher Workshop Session',
         N'https://picsum.photos/seed/edu2/800/600',
         N'https://picsum.photos/seed/edu2/400/300',
         N'Education',
         N'teachers,workshop,training,skills',
         @SampleProgrammeId, NULL, 2, 0, GETDATE()),

        (3,
         N'Books Distribution Day',
         N'https://picsum.photos/seed/edu3/800/600',
         N'https://picsum.photos/seed/edu3/400/300',
         N'Education',
         N'books,distribution,school,community',
         NULL, @SampleOrgId, 3, 0, GETDATE()),

        -- Healthcare
        (4,
         N'Mobile Health Clinic',
         N'https://picsum.photos/seed/health1/800/600',
         N'https://picsum.photos/seed/health1/400/300',
         N'Healthcare',
         N'clinic,health,mobile,rural',
         @SampleProgrammeId, NULL, 4, 1, GETDATE()),

        (5,
         N'Vaccination Drive',
         N'https://picsum.photos/seed/health2/800/600',
         N'https://picsum.photos/seed/health2/400/300',
         N'Healthcare',
         N'vaccination,children,prevention,community',
         NULL, @SampleOrgId, 5, 0, GETDATE()),

        (6,
         N'Health Check-up Camp',
         N'https://picsum.photos/seed/health3/800/600',
         N'https://picsum.photos/seed/health3/400/300',
         N'Healthcare',
         N'checkup,screening,medical,rural',
         @SampleProgrammeId, NULL, 6, 0, GETDATE()),

        -- Community
        (7,
         N'Community Cleanup Initiative',
         N'https://picsum.photos/seed/comm1/800/600',
         N'https://picsum.photos/seed/comm1/400/300',
         N'Community',
         N'cleanup,environment,volunteers,local',
         NULL, @SampleOrgId, 7, 0, GETDATE()),

        (8,
         N'Village Meeting',
         N'https://picsum.photos/seed/comm2/800/600',
         N'https://picsum.photos/seed/comm2/400/300',
         N'Community',
         N'village,meeting,leaders,engagement',
         @SampleProgrammeId, NULL, 8, 0, GETDATE()),

        (9,
         N'Women Empowerment Workshop',
         N'https://picsum.photos/seed/women1/800/600',
         N'https://picsum.photos/seed/women1/400/300',
         N'Community',
         N'women,empowerment,skills,workshop',
         @SampleProgrammeId, @SampleOrgId, 9, 1, GETDATE()),

        -- Events
        (10,
         N'Annual Fundraising Gala',
         N'https://picsum.photos/seed/event1/800/600',
         N'https://picsum.photos/seed/event1/400/300',
         N'Events',
         N'gala,fundraising,donors,annual',
         NULL, @SampleOrgId, 10, 1, GETDATE()),

        (11,
         N'Charity Walk 2025',
         N'https://picsum.photos/seed/event2/800/600',
         N'https://picsum.photos/seed/event2/400/300',
         N'Events',
         N'walk,charity,running,awareness',
         NULL, @SampleOrgId, 11, 0, GETDATE()),

        (12,
         N'Impact Awards Ceremony',
         N'https://picsum.photos/seed/event3/800/600',
         N'https://picsum.photos/seed/event3/400/300',
         N'Events',
         N'awards,impact,recognition,ceremony',
         NULL, @SampleOrgId, 12, 0, GETDATE());

    SET IDENTITY_INSERT dbo.Gallery OFF;

    PRINT 'Gallery seeded 12 items across 4 categories.';
END
ELSE
BEGIN
    PRINT 'Gallery table already has data — skipping seed.';
END
GO

-- Add Gallery CmsPage entry for the Gallery page header (idempotent)
IF NOT EXISTS (SELECT 1 FROM dbo.CmsPages WHERE page_key = 'gallery')
BEGIN
    INSERT INTO dbo.CmsPages (page_key, page_title, page_slug, content, display_order, is_in_menu)
    VALUES (
        'gallery',
        'Gallery',
        'gallery',
        N'<h2>Our Gallery</h2><p>Explore moments of impact, community, and change captured through our work. From education to healthcare, see how your support makes a real difference.</p>',
        8,
        1
    );
END
GO

PRINT 'Gallery seed migration completed.';
GO
