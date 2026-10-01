-- RESET SCRIPT — DEVELOPMENT/TEST ONLY.
-- It drops and recreates every GiveAID table, so it destroys existing data.
-- Use a transactional migration for an existing environment; do not run this in production.
-- =====================================================
-- DATABASE SCHEMA V2: Give-AID NGO Website (REFACTORED)
-- =====================================================
-- Changes:
-- 1. Merged Admins + Users → Users (with role field)
-- 2. Merged Partners + NGOs + Supporters → Organizations (with type field)
-- 3. Renamed Queries/QueryReplies → Conversations/ConversationMessages
-- 4. Removed Invitations table
-- 5. Created CmsPages for static content
-- 6. Kept Programmes separate for events/activities
-- =====================================================
-- TODO Step 7 cleanup: ProgrammePhotos table is dropped in EF migration
-- DropProgrammePhoto (cleanup pending in docs/SQL). Marked here so a
-- fresh setup from this script does NOT recreate programme_photos for
-- new dev environments when that table is being phased out.
-- Search: "programme_photos" in this file → remove CREATE and DROP blocks
-- when Step 7 lands.

-- Keep session options compatible with table/index creation in SQL Server.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- This reset script must only run against the dedicated application database.
IF DB_NAME() <> N'GiveAIDDB'
    THROW 50000, 'Run this reset script against GiveAIDDB only.', 1;
GO

-- Drop views first so this script can be rerun safely.
DROP VIEW IF EXISTS vw_ActiveCampaigns;
DROP VIEW IF EXISTS vw_CampaignSummary;
DROP VIEW IF EXISTS vw_DonationsByCause;
DROP VIEW IF EXISTS vw_AdminUsers;
DROP VIEW IF EXISTS vw_ActivePartners;
DROP VIEW IF EXISTS vw_ActiveNGOs;
GO

-- Drop tables in reverse foreign-key order.
DROP TABLE IF EXISTS Gallery;
DROP TABLE IF EXISTS ConversationMessages;
DROP TABLE IF EXISTS Conversations;
DROP TABLE IF EXISTS ProgrammeRegistrations;
DROP TABLE IF EXISTS CampaignReports;
DROP TABLE IF EXISTS Donations;
DROP TABLE IF EXISTS CareerApplications;
DROP TABLE IF EXISTS Careers;
DROP TABLE IF EXISTS ProgrammePhotos;
DROP TABLE IF EXISTS Programmes;
DROP TABLE IF EXISTS Campaigns;
DROP TABLE IF EXISTS CmsPages;
DROP TABLE IF EXISTS Causes;
DROP TABLE IF EXISTS Organizations;
DROP TABLE IF EXISTS ContactMessages;
DROP TABLE IF EXISTS Users;
GO

-- =====================================================
-- 1. USERS TABLE (Merged Admins + Users)
-- =====================================================
CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name NVARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address NVARCHAR(255),
    
    -- User-specific fields
    profession NVARCHAR(100),
    date_of_birth DATE,
    gender NVARCHAR(10),
    
    -- Role-based access control
    role NVARCHAR(20) DEFAULT 'User',  -- 'SuperAdmin', 'Admin', 'ContentManager', 'User'
    permissions NVARCHAR(MAX),          -- JSON array of specific permissions
    
    -- Account status
    is_verified BIT DEFAULT 0,
    verification_token VARCHAR(100),
    is_active BIT DEFAULT 1,
    
    -- Timestamps
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    last_login DATETIME,
    
    CONSTRAINT CHK_Role CHECK (role IN ('SuperAdmin', 'Admin', 'ContentManager', 'User'))
);
GO

-- =====================================================
-- 2. ORGANIZATIONS TABLE (Merged NGOs + Partners + Supporters)
-- =====================================================
CREATE TABLE Organizations (
    organization_id INT PRIMARY KEY IDENTITY(1,1),
    organization_name NVARCHAR(150) NOT NULL,
    organization_type NVARCHAR(20) NOT NULL, -- 'NGO', 'Partner', 'Supporter'
    
    -- Common fields
    description NTEXT,
    logo_url VARCHAR(255),
    website_url VARCHAR(200),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    address NVARCHAR(255),
    
    -- NGO-specific fields
    registration_number VARCHAR(50),
    mission NVARCHAR(500),
    vision NVARCHAR(500),
    
    -- Partner/Supporter-specific fields
    contribution_amount DECIMAL(18,2),
    contribution_type NVARCHAR(50),    -- 'Financial', 'InKind', 'Volunteer'
    
    -- Display settings
    is_active BIT DEFAULT 1,
    is_featured BIT DEFAULT 0,
    display_order INT DEFAULT 0,
    
    -- Timestamps
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT CHK_OrgType CHECK (organization_type IN ('NGO', 'Partner', 'Supporter')),
    CONSTRAINT CHK_OrganizationContributionAmount CHECK (contribution_amount IS NULL OR contribution_amount >= 0)
);
GO

-- =====================================================
-- 3. CAUSES (DONATION CATEGORIES) TABLE
-- =====================================================
CREATE TABLE Causes (
    cause_id INT PRIMARY KEY IDENTITY(1,1),
    cause_name NVARCHAR(100) NOT NULL,
    cause_code VARCHAR(20) UNIQUE,
    description NVARCHAR(500),
    target_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    raised_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    image_url VARCHAR(255),
    icon NVARCHAR(50),
    is_active BIT DEFAULT 1,
    display_order INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT CHK_CauseAmounts CHECK (target_amount >= 0 AND raised_amount >= 0)
);
GO

-- =====================================================
-- 4. CAMPAIGNS TABLE (Specific donation campaigns)
-- =====================================================
CREATE TABLE Campaigns (
    campaign_id INT PRIMARY KEY IDENTITY(1,1),
    cause_id INT NOT NULL,
    
    campaign_name NVARCHAR(200) NOT NULL,
    campaign_code VARCHAR(50) UNIQUE,
    description NTEXT,
    
    -- Financial targets
    goal_amount DECIMAL(18,2) NOT NULL,
    raised_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    
    -- Schedule
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Details
    image_url VARCHAR(500),
    beneficiaries_count INT,            -- Number of people to benefit
    location NVARCHAR(200),
    
    -- Status & Display
    status NVARCHAR(20) DEFAULT 'Active',
    is_featured BIT DEFAULT 0,
    display_order INT DEFAULT 0,
    
    -- Audit
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    created_by INT,
    
    FOREIGN KEY (cause_id) REFERENCES Causes(cause_id),
    FOREIGN KEY (created_by) REFERENCES Users(user_id),
    
    CONSTRAINT CHK_CampaignStatus CHECK (status IN ('Active', 'Completed', 'Cancelled', 'Paused')),
    CONSTRAINT CHK_CampaignAmounts CHECK (goal_amount > 0 AND raised_amount >= 0),
    CONSTRAINT CHK_CampaignDates CHECK (end_date IS NULL OR end_date >= start_date)
);
GO

-- =====================================================
-- 5. DONATIONS TABLE (Modified to link to campaigns)
-- =====================================================
CREATE TABLE Donations (
    donation_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NULL,  -- Nullable to support anonymous donations
    cause_id INT NOT NULL,
    campaign_id INT,                    -- Optional: specific campaign
    organization_id INT,                -- Optional: specific NGO
    
    amount DECIMAL(18,2) NOT NULL,
    donation_date DATETIME DEFAULT GETDATE(),
    
    -- Payment information
    payment_method NVARCHAR(20) NOT NULL, -- 'CreditCard', 'DebitCard', 'NetBanking', 'UPI'
    payment_status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
    transaction_id VARCHAR(100) UNIQUE,
    
    -- Card details (encrypted in production)
    card_last_four CHAR(4),
    card_type NVARCHAR(20),
    
    -- Additional info
    is_anonymous BIT DEFAULT 0,
    message NVARCHAR(500),
    receipt_sent BIT DEFAULT 0,
    
    created_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (cause_id) REFERENCES Causes(cause_id),
    FOREIGN KEY (campaign_id) REFERENCES Campaigns(campaign_id),
    FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id),
    
    CONSTRAINT CHK_PaymentStatus CHECK (payment_status IN ('Pending', 'Completed', 'Failed', 'Refunded')),
    CONSTRAINT CHK_DonationAmount CHECK (amount > 0)
);
GO

-- =====================================================
-- 6. CAMPAIGN REPORTS TABLE (Financial transparency)
-- =====================================================
CREATE TABLE CampaignReports (
    report_id INT PRIMARY KEY IDENTITY(1,1),
    campaign_id INT NOT NULL,
    
    -- Financial summary
    total_received DECIMAL(18,2) NOT NULL,
    total_spent DECIMAL(18,2) NOT NULL,
    remaining_amount AS (total_received - total_spent) PERSISTED,
    
    -- Impact
    beneficiaries_reached INT,
    
    -- Report content
    report_title NVARCHAR(200),
    report_content NTEXT,
    expense_breakdown NVARCHAR(MAX),    -- JSON: [{category: "Food", amount: 15000000}, ...]
    photos NVARCHAR(MAX),               -- JSON array of photo URLs
    documents NVARCHAR(MAX),            -- JSON array of document URLs
    
    -- Publication
    is_published BIT DEFAULT 0,
    published_date DATETIME,
    published_by INT,
    
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (campaign_id) REFERENCES Campaigns(campaign_id),
    FOREIGN KEY (published_by) REFERENCES Users(user_id)
);
GO

-- =====================================================
-- 7. CMS PAGES TABLE (For static content)
-- =====================================================
CREATE TABLE CmsPages (
    page_id INT PRIMARY KEY IDENTITY(1,1),
    page_key VARCHAR(50) NOT NULL UNIQUE,
    page_title NVARCHAR(100) NOT NULL,
    page_slug VARCHAR(100) UNIQUE,
    content NTEXT,
    meta_description NVARCHAR(255),
    meta_keywords NVARCHAR(255),
    
    -- Display settings
    is_active BIT DEFAULT 1,
    is_in_menu BIT DEFAULT 1,
    display_order INT DEFAULT 0,
    parent_page_id INT,
    
    -- Audit fields
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    updated_by INT,
    
    FOREIGN KEY (updated_by) REFERENCES Users(user_id),
    FOREIGN KEY (parent_page_id) REFERENCES CmsPages(page_id)
);
GO

-- =====================================================
-- 8. PROGRAMMES (EVENTS/ACTIVITIES) TABLE
-- =====================================================
CREATE TABLE Programmes (
    programme_id INT PRIMARY KEY IDENTITY(1,1),
    organization_id INT,                -- Which organization conducts this
    
    title NVARCHAR(200) NOT NULL,
    programme_type NVARCHAR(50),       -- 'Education', 'HealthCare', 'ChildWelfare', 'WomenEmpowerment'
    description NTEXT,
    
    -- Schedule
    start_date DATETIME,
    end_date DATETIME,
    location NVARCHAR(255),
    
    -- Targets & Budget
    target_beneficiaries INT,
    expected_budget DECIMAL(18,2),
    actual_budget DECIMAL(18,2),
    
    -- Status & Display
    status NVARCHAR(20) DEFAULT 'Upcoming',
    image_url VARCHAR(255),
    is_featured BIT DEFAULT 0,
    registration_required BIT DEFAULT 1,
    max_participants INT,
    
    -- Timestamps
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    created_by INT,
    
    FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id),
    FOREIGN KEY (created_by) REFERENCES Users(user_id),
    
    CONSTRAINT CHK_ProgrammeStatus CHECK (status IN ('Upcoming', 'Ongoing', 'Completed', 'Cancelled')),
    CONSTRAINT CHK_ProgrammeValues CHECK (
        (target_beneficiaries IS NULL OR target_beneficiaries >= 0) AND
        (expected_budget IS NULL OR expected_budget >= 0) AND
        (actual_budget IS NULL OR actual_budget >= 0) AND
        (max_participants IS NULL OR max_participants > 0) AND
        (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
    )
);
GO

-- =====================================================
-- 7. PROGRAMME PHOTOS TABLE
-- =====================================================
CREATE TABLE ProgrammePhotos (
    photo_id INT PRIMARY KEY IDENTITY(1,1),
    programme_id INT NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    caption NVARCHAR(200),
    display_order INT DEFAULT 0,
    uploaded_by INT,
    uploaded_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (programme_id) REFERENCES Programmes(programme_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES Users(user_id)
);
GO

-- =====================================================
-- 8. PROGRAMME REGISTRATIONS TABLE
-- =====================================================
CREATE TABLE ProgrammeRegistrations (
    registration_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    programme_id INT NOT NULL,
    registration_date DATETIME DEFAULT GETDATE(),
    status NVARCHAR(20) DEFAULT 'Registered',
    notes NVARCHAR(500),
    attendance_confirmed BIT DEFAULT 0,
    
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (programme_id) REFERENCES Programmes(programme_id),
    
    CONSTRAINT CHK_RegistrationStatus CHECK (status IN ('Registered', 'Confirmed', 'Attended', 'Cancelled')),
    CONSTRAINT UQ_UserProgramme UNIQUE (user_id, programme_id)
);
GO

-- =====================================================
-- 9. CONVERSATIONS TABLE (Renamed from Queries)
-- =====================================================
CREATE TABLE Conversations (
    conversation_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT,                        -- Can be NULL for guest
    
    subject NVARCHAR(200) NOT NULL,
    conversation_type NVARCHAR(50),    -- 'Support', 'Donation', 'Programme', 'Partnership', 'General'
    status NVARCHAR(20) DEFAULT 'Open',
    priority NVARCHAR(20) DEFAULT 'Normal',
    
    -- Assignment
    assigned_to INT,
    
    -- Timestamps
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    closed_at DATETIME,
    
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (assigned_to) REFERENCES Users(user_id),
    
    CONSTRAINT CHK_ConversationStatus CHECK (status IN ('Open', 'InProgress', 'Resolved', 'Closed')),
    CONSTRAINT CHK_Priority CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent'))
);
GO

-- =====================================================
-- 10. CONVERSATION MESSAGES TABLE (Renamed from QueryReplies)
-- =====================================================
CREATE TABLE ConversationMessages (
    message_id INT PRIMARY KEY IDENTITY(1,1),
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_text NTEXT NOT NULL,
    is_internal_note BIT DEFAULT 0,    -- For admin-only notes
    attachments NVARCHAR(MAX),          -- JSON array of file URLs
    created_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (conversation_id) REFERENCES Conversations(conversation_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES Users(user_id)
);
GO

-- =====================================================
-- 11. CAREERS TABLE
-- =====================================================
CREATE TABLE Careers (
    career_id INT PRIMARY KEY IDENTITY(1,1),
    position_title NVARCHAR(150) NOT NULL,
    department NVARCHAR(100),
    description NTEXT,
    requirements NTEXT,
    responsibilities NTEXT,
    location NVARCHAR(100),
    employment_type NVARCHAR(50),
    salary_range NVARCHAR(100),
    vacancies INT DEFAULT 1,
    
    posted_date DATE DEFAULT CAST(GETDATE() AS DATE),
    closing_date DATE,
    is_active BIT DEFAULT 1,
    
    created_at DATETIME DEFAULT GETDATE(),
    created_by INT,
    
    FOREIGN KEY (created_by) REFERENCES Users(user_id),
    
    CONSTRAINT CHK_EmploymentType CHECK (employment_type IN ('FullTime', 'PartTime', 'Contract', 'Volunteer', 'Internship'))
);
GO

-- =====================================================
-- 12. CAREER APPLICATIONS TABLE
-- =====================================================
CREATE TABLE CareerApplications (
    application_id INT PRIMARY KEY IDENTITY(1,1),
    career_id INT NOT NULL,
    applicant_name NVARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    resume_url VARCHAR(255),
    cover_letter NTEXT,
    linkedin_url VARCHAR(200),
    portfolio_url VARCHAR(200),
    
    status NVARCHAR(20) DEFAULT 'Submitted',
    reviewed_by INT,
    reviewed_at DATETIME,
    notes NTEXT,
    
    applied_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (career_id) REFERENCES Careers(career_id),
    FOREIGN KEY (reviewed_by) REFERENCES Users(user_id),
    
    CONSTRAINT CHK_ApplicationStatus CHECK (status IN ('Submitted', 'Screening', 'Interview', 'Offered', 'Accepted', 'Rejected'))
);
GO

-- =====================================================
-- 13. GALLERY TABLE
-- =====================================================
CREATE TABLE Gallery (
    gallery_id INT PRIMARY KEY IDENTITY(1,1),
    title NVARCHAR(200),
    photo_url VARCHAR(255) NOT NULL,
    thumbnail_url VARCHAR(255),
    category NVARCHAR(50),
    tags NVARCHAR(255),
    
    -- Optional associations
    programme_id INT,
    organization_id INT,
    
    display_order INT DEFAULT 0,
    is_featured BIT DEFAULT 0,
    
    uploaded_by INT,
    uploaded_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (programme_id) REFERENCES Programmes(programme_id),
    FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id),
    FOREIGN KEY (uploaded_by) REFERENCES Users(user_id)
);
GO

-- =====================================================
-- 14. CONTACT MESSAGES TABLE
-- =====================================================
CREATE TABLE ContactMessages (
    contact_id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    subject NVARCHAR(200),
    message NTEXT NOT NULL,
    
    is_read BIT DEFAULT 0,
    replied_by INT,
    reply_message NTEXT,
    replied_at DATETIME,
    
    created_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (replied_by) REFERENCES Users(user_id)
);
GO

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_role ON Users(role);
CREATE INDEX idx_organizations_type ON Organizations(organization_type);
CREATE INDEX idx_campaigns_cause ON Campaigns(cause_id);
CREATE INDEX idx_campaigns_status ON Campaigns(status);
CREATE INDEX idx_campaigns_dates ON Campaigns(start_date, end_date);
CREATE INDEX idx_donations_user ON Donations(user_id);
CREATE INDEX idx_donations_cause ON Donations(cause_id);
CREATE INDEX idx_donations_campaign ON Donations(campaign_id);
CREATE INDEX idx_donations_date ON Donations(donation_date);
CREATE INDEX idx_donations_status ON Donations(payment_status);
CREATE INDEX idx_programmes_status ON Programmes(status);
CREATE INDEX idx_programmes_type ON Programmes(programme_type);
CREATE INDEX idx_programme_registrations ON ProgrammeRegistrations(user_id, programme_id);
CREATE INDEX idx_programme_registrations_programme_status ON ProgrammeRegistrations(programme_id, status);
CREATE INDEX idx_conversations_status ON Conversations(status);
CREATE INDEX idx_conversations_user ON Conversations(user_id);
CREATE INDEX idx_conversation_messages ON ConversationMessages(conversation_id);
GO

-- =====================================================
-- VIEWS FOR CONVENIENCE
-- =====================================================

-- View: Active NGOs only
CREATE VIEW vw_ActiveNGOs AS
SELECT * FROM Organizations 
WHERE organization_type = 'NGO' AND is_active = 1;
GO

-- View: Active Partners only
CREATE VIEW vw_ActivePartners AS
SELECT * FROM Organizations 
WHERE organization_type = 'Partner' AND is_active = 1;
GO

-- View: Admin Users
CREATE VIEW vw_AdminUsers AS
SELECT user_id, username, email, full_name, role, last_login, is_active
FROM Users 
WHERE role IN ('SuperAdmin', 'Admin', 'ContentManager');
GO

-- View: Donation Summary by Cause
CREATE VIEW vw_DonationsByCause AS
SELECT 
    c.cause_id,
    c.cause_name,
    c.target_amount,
    COUNT(d.donation_id) as total_donations,
    ISNULL(SUM(d.amount), 0) as total_raised,
    CAST(ISNULL(SUM(d.amount) * 100.0 / NULLIF(c.target_amount, 0), 0) AS DECIMAL(5,2)) as percentage_reached
FROM Causes c
LEFT JOIN Donations d ON c.cause_id = d.cause_id AND d.payment_status = 'Completed'
GROUP BY c.cause_id, c.cause_name, c.target_amount;
GO

-- View: Campaign Summary
CREATE VIEW vw_CampaignSummary AS
SELECT 
    cp.campaign_id,
    cp.campaign_name,
    cp.campaign_code,
    cp.goal_amount,
    cp.raised_amount,
    CAST(ISNULL(cp.raised_amount * 100.0 / NULLIF(cp.goal_amount, 0), 0) AS DECIMAL(5,2)) as percentage_reached,
    COUNT(DISTINCT d.user_id) as donor_count,
    cp.start_date,
    cp.end_date,
    cp.status,
    c.cause_name,
    c.cause_code,
    DATEDIFF(day, GETDATE(), cp.end_date) as days_remaining
FROM Campaigns cp
INNER JOIN Causes c ON cp.cause_id = c.cause_id
LEFT JOIN Donations d ON cp.campaign_id = d.campaign_id AND d.payment_status = 'Completed'
GROUP BY cp.campaign_id, cp.campaign_name, cp.campaign_code, cp.goal_amount, 
         cp.raised_amount, cp.start_date, cp.end_date, cp.status, c.cause_name, c.cause_code;
GO

-- View: Active Campaigns
CREATE VIEW vw_ActiveCampaigns AS
SELECT * FROM vw_CampaignSummary
WHERE status = 'Active' AND (end_date IS NULL OR end_date >= CAST(GETDATE() AS DATE));
GO

-- =====================================================
-- SEED DATA
-- =====================================================

-- Default CMS Pages
INSERT INTO CmsPages (page_key, page_title, page_slug, display_order, is_in_menu) VALUES
('home', 'Home', 'home', 1, 1),
('about_us', 'About Us', 'about-us', 2, 1),
('what_we_do', 'What We Do', 'what-we-do', 3, 1),
('our_mission', 'Our Mission', 'our-mission', 4, 1),
('our_team', 'Our Team', 'our-team', 5, 1),
('careers', 'Career With Us', 'careers', 6, 1),
('achievements', 'Our Achievements', 'achievements', 7, 1),
('contact_us', 'Contact Us', 'contact-us', 8, 1);
GO

-- Default Causes
INSERT INTO Causes (cause_name, cause_code, description, icon, display_order) VALUES
('Children Welfare', 'CHILD', 'Support programs for underprivileged children', 'child', 1),
('Education', 'EDU', 'Educational initiatives and scholarships', 'education', 2),
('Disabled Persons', 'DIS', 'Support for differently-abled individuals', 'accessible', 3),
('Women Empowerment', 'WOMAN', 'Programs for women empowerment and safety', 'female', 4),
('Youth Development', 'YOUTH', 'Youth skill development and mentoring', 'youth', 5),
('Elderly Care', 'ELDER', 'Support for senior citizens', 'elderly', 6);
GO

-- Sample Campaigns (Based on Care4Kids document)
INSERT INTO Campaigns (cause_id, campaign_name, campaign_code, description, goal_amount, raised_amount, start_date, end_date, beneficiaries_count, status, is_featured, display_order) VALUES
(2, N'Cặp sách đến trường', 'CAP-SACH-2026', N'Hỗ trợ cặp sách, vở và dụng cụ học tập cho trẻ em có hoàn cảnh khó khăn tại các vùng miền núi phía Bắc', 30000000, 0, '2026-08-01', '2026-09-30', 500, 'Active', 1, 1),
(2, N'1000 bộ sách cho em', 'SACH-1000-2026', N'Quyên góp sách giáo khoa, truyện và sách tham khảo cho trẻ em có hoàn cảnh khó khăn', 50000000, 0, '2026-08-15', '2026-10-15', 1000, 'Active', 1, 2),
(2, N'Máy tính cho tương lai', 'MAY-TINH-2026', N'Hỗ trợ thiết bị học tập (máy tính, tablet) cho những em thiếu điều kiện tiếp cận công nghệ', 80000000, 0, '2026-09-01', '2026-11-30', 200, 'Active', 1, 3),
(1, N'1000 phần quà cho trẻ em', 'QUA-TET-2026', N'Tặng quà Tết cho trẻ em có hoàn cảnh khó khăn tại các mái ấm', 50000000, 0, '2026-01-01', '2026-02-10', 1000, 'Completed', 0, 4),
(1, N'Bữa ăn dinh dưỡng cho trẻ', 'BUA-AN-2026', N'Cung cấp bữa ăn dinh dưỡng hàng ngày cho trẻ em tại các vùng khó khăn', 100000000, 0, '2026-06-01', '2026-12-31', 300, 'Active', 1, 5);
GO

-- The application seeds demo users with BCrypt hashes on first startup.
-- Never place plaintext or placeholder password hashes in this schema script.

PRINT 'Database schema V2 created successfully!';
PRINT 'Total tables: 16';
PRINT '- Users (merged Admins + Users)';
PRINT '- Organizations (merged NGOs + Partners + Supporters)';
PRINT '- Campaigns (NEW - specific donation campaigns)';
PRINT '- CampaignReports (NEW - financial transparency)';
PRINT '- Donations (modified to link campaigns)';
PRINT '- Conversations & ConversationMessages (renamed from Queries)';
PRINT '- CmsPages (for static content)';
PRINT '- Programmes (for events/activities)';
PRINT '';
PRINT 'Sample data seeded:';
PRINT '- Demo users are seeded by the application';
PRINT '- 6 Causes';
PRINT '- 5 Campaigns (3 Active Education campaigns as per Care4Kids)';
PRINT '- 8 CMS Pages';
PRINT '';
PRINT 'Ready to use!';
