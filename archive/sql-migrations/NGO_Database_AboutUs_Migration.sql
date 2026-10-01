-- =====================================================
-- ABOUT US MODULE — ADDITIVE MIGRATION SCRIPT
-- =====================================================
-- Purpose: Extend the existing GiveAIDDB V2 schema with the
--          tables and seed data required by the About Us module.
--
-- Adds (idempotent guards, safe on existing data):
--   * TeamMembers          -> Our Team page
--   * Achievements         -> Our Achievements page
--
-- The existing tables below already power the remaining About
-- sub-pages and require NO schema change:
--   * Careers / CareerApplications -> Career page (jobs + apply form)
--   * Organizations (organization_type = 'Supporter' | 'NGO' | 'Partner')
--                                       -> Our Supporters page
--   * CmsPages                         -> editable About sub-page text blocks
--                                       (page_key = 'about_us', 'our_team',
--                                        'careers', 'achievements')
--
-- Run this script against GiveAIDDB only.
-- The script is safe to rerun — every CREATE/INSERT uses IF NOT EXISTS guards.
-- =====================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF DB_NAME() <> N'GiveAIDDB'
    THROW 50000, 'Run this migration against GiveAIDDB only.', 1;
GO

-- =====================================================
-- 1. TeamMembers
-- =====================================================
IF OBJECT_ID(N'dbo.TeamMembers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TeamMembers (
        team_member_id   INT             IDENTITY(1,1) PRIMARY KEY,
        full_name        NVARCHAR(150)   NOT NULL,
        role_title       NVARCHAR(150)   NOT NULL,
        department       NVARCHAR(100)   NULL,
        bio              NVARCHAR(MAX)   NULL,
        photo_url        VARCHAR(500)    NULL,
        email            VARCHAR(100)    NULL,
        linkedin_url     VARCHAR(255)    NULL,
        twitter_url      VARCHAR(255)    NULL,
        facebook_url     VARCHAR(255)    NULL,
        display_order    INT             NOT NULL DEFAULT 0,
        is_active        BIT             NOT NULL DEFAULT 1,
        is_featured      BIT             NOT NULL DEFAULT 0,
        joined_date      DATE            NULL,
        created_at       DATETIME        NOT NULL DEFAULT GETDATE(),
        updated_at       DATETIME        NOT NULL DEFAULT GETDATE(),
        created_by       INT             NULL,
        CONSTRAINT FK_TeamMembers_Users FOREIGN KEY (created_by)
            REFERENCES dbo.Users(user_id)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'idx_team_members_active_order'
      AND object_id = OBJECT_ID(N'dbo.TeamMembers')
)
BEGIN
    CREATE INDEX idx_team_members_active_order
        ON dbo.TeamMembers(is_active, display_order);
END
GO

-- =====================================================
-- 2. Achievements
-- =====================================================
IF OBJECT_ID(N'dbo.Achievements', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Achievements (
        achievement_id   INT             IDENTITY(1,1) PRIMARY KEY,
        title            NVARCHAR(200)   NOT NULL,
        category         NVARCHAR(100)   NULL,
        description      NVARCHAR(MAX)   NULL,
        metric_value     DECIMAL(18,2)   NULL,
        metric_label     NVARCHAR(100)   NULL,
        metric_suffix    NVARCHAR(20)    NULL,
        achievement_date DATE            NULL,
        image_url        VARCHAR(500)    NULL,
        icon             NVARCHAR(50)    NULL,
        award_by         NVARCHAR(150)   NULL,
        location         NVARCHAR(200)   NULL,
        beneficiaries    INT             NULL,
        display_order    INT             NOT NULL DEFAULT 0,
        is_active        BIT             NOT NULL DEFAULT 1,
        is_featured      BIT             NOT NULL DEFAULT 0,
        created_at       DATETIME        NOT NULL DEFAULT GETDATE(),
        updated_at       DATETIME        NOT NULL DEFAULT GETDATE(),
        created_by       INT             NULL,
        CONSTRAINT FK_Achievements_Users FOREIGN KEY (created_by)
            REFERENCES dbo.Users(user_id),
        CONSTRAINT CHK_AchievementMetric CHECK (metric_value IS NULL OR metric_value >= 0)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'idx_achievements_active_order'
      AND object_id = OBJECT_ID(N'dbo.Achievements')
)
BEGIN
    CREATE INDEX idx_achievements_active_order
        ON dbo.Achievements(is_active, display_order);
END
GO

-- =====================================================
-- 3. Seed CmsPages entries (idempotent — already seeded by V2)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM dbo.CmsPages WHERE page_key = 'our_team')
    INSERT INTO dbo.CmsPages (page_key, page_title, page_slug, display_order, is_in_menu)
    VALUES ('our_team', 'Our Team', 'our-team', 5, 1);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.CmsPages WHERE page_key = 'achievements')
    INSERT INTO dbo.CmsPages (page_key, page_title, page_slug, display_order, is_in_menu)
    VALUES ('achievements', 'Our Achievements', 'achievements', 7, 1);
GO

-- Make sure the canonical About Us page text block has content.
IF EXISTS (SELECT 1 FROM dbo.CmsPages WHERE page_key = 'about_us' AND (content IS NULL OR LEN(content) = 0))
BEGIN
    UPDATE dbo.CmsPages
    SET content = N'<h2>About Give-AID</h2>
<p>Give-AID is a non-governmental organization dedicated to creating lasting positive change in communities worldwide. Through our various programmes and partnerships, we address critical issues in education, healthcare, child welfare, and community development.</p>
<h3>Our Mission</h3>
<p>To empower vulnerable communities by providing access to quality education, healthcare, and opportunities for sustainable development through transparent and impactful programmes.</p>
<h3>Our Vision</h3>
<p>A world where every individual has equal access to opportunities and resources needed to lead a dignified and fulfilling life, free from poverty and inequality.</p>
<h3>Our Values</h3>
<ul>
  <li><strong>Transparency</strong> — Complete transparency in our operations and fund utilization.</li>
  <li><strong>Compassion</strong> — Empathy and genuine care for those we serve.</li>
  <li><strong>Collaboration</strong> — Working together with communities, partners, and donors.</li>
</ul>'
    WHERE page_key = 'about_us';
END
GO

-- =====================================================
-- 4. Seed TeamMembers (only if table empty)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM dbo.TeamMembers)
BEGIN
    SET IDENTITY_INSERT dbo.TeamMembers ON;
    INSERT INTO dbo.TeamMembers
        (team_member_id, full_name, role_title, department, bio, photo_url,
         email, linkedin_url, display_order, is_active, is_featured, joined_date)
    VALUES
        (1, N'Nguyễn Minh Anh', N'Executive Director', N'Leadership',
         N'Over 15 years of experience in non-profit management and community development. Passionate about creating sustainable change for vulnerable communities.',
         'https://i.pravatar.cc/300?img=12', 'minhanh@give-aid.org', 'https://www.linkedin.com/',
         1, 1, 1, '2018-03-15'),
        (2, N'Trần Quốc Bảo', N'Programme Director', N'Programmes',
         N'Leads the design and implementation of community programmes with a focus on education and healthcare initiatives.',
         'https://i.pravatar.cc/300?img=33', 'quocbao@give-aid.org', 'https://www.linkedin.com/',
         2, 1, 1, '2019-06-01'),
        (3, N'Lê Hoàng Yến', N'Head of Partnerships', N'Development',
         N'Builds and nurtures relationships with corporate partners, NGOs, and government agencies to expand our reach.',
         'https://i.pravatar.cc/300?img=47', 'hoangyen@give-aid.org', 'https://www.linkedin.com/',
         3, 1, 0, '2020-01-20'),
        (4, N'Phạm Đức Thành', N'Finance & Compliance Lead', N'Operations',
         N'Ensures financial transparency and regulatory compliance across all programmes.',
         'https://i.pravatar.cc/300?img=15', 'ducthanh@give-aid.org', 'https://www.linkedin.com/',
         4, 1, 0, '2020-09-10'),
        (5, N'Vũ Thanh Hương', N'Communications Manager', N'Communications',
         N'Tells the stories of the communities we serve and amplifies our impact through media and digital channels.',
         'https://i.pravatar.cc/300?img=45', 'thanhhuong@give-aid.org', 'https://www.linkedin.com/',
         5, 1, 0, '2021-04-05'),
        (6, N'Đặng Quốc Đạt', N'Volunteer Coordinator', N'Programmes',
         N'Manages the volunteer network and connects passionate individuals with meaningful opportunities.',
         'https://i.pravatar.cc/300?img=8', 'quocdat@give-aid.org', 'https://www.linkedin.com/',
         6, 1, 0, '2021-09-12');
    SET IDENTITY_INSERT dbo.TeamMembers OFF;
END
GO

-- =====================================================
-- 5. Seed Achievements (only if table empty)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Achievements)
BEGIN
    SET IDENTITY_INSERT dbo.Achievements ON;
    INSERT INTO dbo.Achievements
        (achievement_id, title, category, description, metric_value, metric_label,
         metric_suffix, achievement_date, icon, award_by, beneficiaries,
         display_order, is_active, is_featured)
    VALUES
        (1, N'Reached 10,000+ lives impacted', N'Milestone',
         N'Cumulative number of beneficiaries who received direct support across all our programmes.',
         10000, N'Lives Impacted', N'+', '2025-12-01', 'people-fill', NULL, 10000,
         1, 1, 1),
        (2, N'Completed 500 community projects', N'Project',
         N'Projects spanning education, healthcare, child welfare, and emergency relief since founding.',
         500, N'Projects Completed', N'+', '2025-11-15', 'trophy-fill', NULL, NULL,
         2, 1, 1),
        (3, N'20,000+ hours volunteered', N'Volunteer',
         N'Total volunteer hours contributed by our community of changemakers.',
         20000, N'Volunteer Hours', NULL, '2025-10-30', 'hand-thumbs-up-fill', NULL, NULL,
         3, 1, 1),
        (4, N'Built 12 community learning centres', N'Education',
         N'Safe learning spaces providing education access to children in remote areas.',
         12, N'Learning Centres', NULL, '2025-08-20', 'house-fill', N'Ministry of Education', 1800,
         4, 1, 0),
        (5, N'Provided healthcare to 5,000+ families', N'Healthcare',
         N'Free health screenings, vaccinations, and medical supplies to underserved families.',
         5000, N'Families Served', N'+', '2025-07-12', 'hospital-fill', NULL, 5000,
         5, 1, 0),
        (6, N'Received Transparency Award 2024', N'Recognition',
         N'Recognized for outstanding financial transparency and accountability in the non-profit sector.',
         NULL, N'Award 2024', NULL, '2024-12-10', 'award-fill', N'National NGO Council', NULL,
         6, 1, 1),
        (7, N'25+ active NGO partners', N'Partnership',
         N'Network of partner organizations collaborating on shared social impact goals.',
         25, N'NGO Partners', N'+', '2025-06-01', 'link-45deg', NULL, NULL,
         7, 1, 0),
        (8, N'Distributed 100,000+ meals', N'Welfare',
         N'Nutritious meals distributed to children and families in food-insecure regions.',
         100000, N'Meals Distributed', N'+', '2025-09-25', 'basket-fill', NULL, 8500,
         8, 1, 0);
    SET IDENTITY_INSERT dbo.Achievements OFF;
END
GO

-- =====================================================
-- 6. Seed sample Careers (only if table empty)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Careers)
BEGIN
    SET IDENTITY_INSERT dbo.Careers ON;
    INSERT INTO dbo.Careers
        (career_id, position_title, department, description, requirements,
         responsibilities, location, employment_type, salary_range, vacancies,
         posted_date, closing_date, is_active)
    VALUES
        (1, N'Community Outreach Officer', N'Programmes',
         N'Join our Programmes team to engage with local communities and ensure our initiatives reach those who need them most.',
         N'<ul><li>Bachelor''s degree in Social Work, Development Studies or related field</li><li>2+ years of community engagement experience</li><li>Strong communication and interpersonal skills</li><li>Fluency in Vietnamese and English</li></ul>',
         N'<ul><li>Build relationships with community leaders and local partners</li><li>Coordinate field visits and programme activities</li><li>Collect and report on community feedback</li><li>Support programme design with on-the-ground insights</li></ul>',
         N'Ho Chi Minh City, Vietnam', 'FullTime', N'15,000,000 - 22,000,000 VNĐ', 2,
         CAST(GETDATE() AS DATE), DATEADD(month, 2, CAST(GETDATE() AS DATE)), 1),
        (2, N'Digital Fundraising Coordinator', N'Development',
         N'Drive online fundraising campaigns to grow our donor base and amplify impact.',
         N'<ul><li>3+ years experience in digital fundraising or marketing</li><li>Experience with CRM and email marketing tools</li><li>Strong copywriting and storytelling skills</li><li>Data-driven mindset</li></ul>',
         N'<ul><li>Plan and execute multi-channel fundraising campaigns</li><li>Manage donor database and communications</li><li>Analyze campaign performance and optimize ROI</li><li>Collaborate with Communications team on content</li></ul>',
         N'Remote / Hanoi, Vietnam', 'FullTime', N'18,000,000 - 25,000,000 VNĐ', 1,
         CAST(GETDATE() AS DATE), DATEADD(month, 3, CAST(GETDATE() AS DATE)), 1),
        (3, N'M&E (Monitoring & Evaluation) Specialist', N'Programmes',
         N'Design and lead our monitoring & evaluation framework to measure programme impact.',
         N'<ul><li>Master''s degree in M&E, Statistics, Development Studies or related field</li><li>4+ years experience in NGO M&E roles</li><li>Strong quantitative and qualitative research skills</li><li>Experience with data visualization tools</li></ul>',
         N'<ul><li>Develop logical frameworks and KPIs for all programmes</li><li>Design baseline, midline, and endline studies</li><li>Build dashboards and impact reports</li><li>Train field staff on data collection methods</li></ul>',
         N'Ho Chi Minh City, Vietnam', 'FullTime', N'25,000,000 - 35,000,000 VNĐ', 1,
         CAST(GETDATE() AS DATE), DATEADD(month, 1, CAST(GETDATE() AS DATE)), 1),
        (4, N'Volunteer Engagement Intern', N'Programmes',
         N'Support our volunteer programme and gain hands-on experience in the non-profit sector.',
         N'<ul><li>Currently enrolled in or recently graduated from university</li><li>Strong organizational skills</li><li>Passion for social impact</li><li>Available for at least 3 months</li></ul>',
         N'<ul><li>Assist with volunteer onboarding and orientation</li><li>Maintain volunteer database</li><li>Help organize volunteer events and recognition activities</li><li>Support day-to-day volunteer coordination</li></ul>',
         N'Ho Chi Minh City, Vietnam', 'Internship', N'Unpaid (stipend provided)', 3,
         CAST(GETDATE() AS DATE), DATEADD(week, 6, CAST(GETDATE() AS DATE)), 1);
    SET IDENTITY_INSERT dbo.Careers OFF;
END
GO

-- =====================================================
-- 7. Seed sample Supporters (organization_type = 'Supporter')
-- =====================================================
IF NOT EXISTS (
    SELECT 1 FROM dbo.Organizations
    WHERE organization_type = 'Supporter' AND organization_name = N'Hope Foundation'
)
BEGIN
    INSERT INTO dbo.Organizations
        (organization_name, organization_type, description, logo_url, website_url,
         contact_email, contact_phone, address, contribution_type, contribution_amount,
         is_active, is_featured, display_order)
    VALUES
        (N'Hope Foundation', 'Supporter',
         N'A charitable foundation focused on education and child welfare across Southeast Asia.',
         'https://via.placeholder.com/150x150.png?text=Hope', 'https://www.hopefoundation.example',
         'partners@hopefoundation.example', '+84 28 1234 5678',
         N'12 Le Loi, District 1, Ho Chi Minh City',
         'Financial', 500000000, 1, 1, 1),

        (N'GreenEarth Initiative', 'Supporter',
         N'An environmental NGO partnering on climate-resilient community programmes.',
         'https://via.placeholder.com/150x150.png?text=GreenEarth', 'https://www.greenearth.example',
         'contact@greenearth.example', '+84 24 9876 5432',
         N'45 Phan Dinh Phung, Hanoi',
         'InKind', NULL, 1, 1, 2),

        (N'Bright Future Tech', 'Partner',
         N'Technology partner supporting digital literacy programmes in rural schools.',
         'https://via.placeholder.com/150x150.png?text=BFT', 'https://www.bft.example',
         'csr@brightfuturetech.example', '+84 28 8888 9999',
         N'8 Nguyen Hue, District 1, Ho Chi Minh City',
         'InKind', NULL, 1, 0, 3),

        (N'Community Health Network', 'Partner',
         N'Network of clinics providing free healthcare services to programme beneficiaries.',
         'https://via.placeholder.com/150x150.png?text=CHN', 'https://www.chn.example',
         'info@chn.example', '+84 236 123 4567',
         N'22 Bach Dang, Da Nang',
         'Volunteer', NULL, 1, 0, 4),

        (N'Education For All', 'NGO',
         N'Sister NGO collaborating on inclusive education initiatives for children with disabilities.',
         'https://via.placeholder.com/150x150.png?text=EFA', 'https://www.efa.example',
         'hello@efa.example', '+84 28 7777 8888',
         N'100 Hai Ba Trung, District 3, Ho Chi Minh City',
         'Financial', 250000000, 1, 1, 5);
END
GO

PRINT 'About Us module migration completed successfully.';
PRINT 'New tables: TeamMembers, Achievements';
PRINT 'Existing tables reused: Careers, CareerApplications, Organizations, CmsPages';
GO
