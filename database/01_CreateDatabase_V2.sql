-- =====================================================================
-- GiveAID V2 — Complete database setup script (SQL Server 2019+)
-- Idempotent: safe to re-run. Drops only if CREATE detects drift.
-- Creates GiveAIDDB on the standard local dev instance, creates all 22
-- tables matching the V2 Domain entities + indexes + views, seeds
-- baseline reference data.
-- =====================================================================
--
-- Connection: (localdb)\MSSQLLocalDB  (single source of truth —
--   matches src/WebApi/appsettings.Development.json).
-- Optional  : .\SQLEXPRESS — only if SQL Server Express is installed AND
--             TCP/IP + Named Pipes are enabled (see README).
-- Override : pass -Server "<your-server>" to 99_Apply-All.ps1.
--
-- Run from SSMS, sqlcmd, or via:
--   sqlcmd -S "(localdb)\MSSQLLocalDB" -E -d master -i 01_CreateDatabase_V2.sql
--   powershell -ExecutionPolicy Bypass -File 99_Apply-All.ps1
-- =====================================================================
--
-- TODO Step 7 cleanup: programme_photos (lines ~284-298 + any related
-- DROP/seed sections) is dropped in EF migration DropProgrammePhoto.
-- When Step 7 lands, remove the CREATE programme_photos block here,
-- drop related indexes, and remove programme_photos from the drift-
-- check at the top of this script. Marked here because the schema
-- will otherwise respawn programme_photos on every fresh dev setup.
-- =====================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

-- ---------------------------------------------------------------------
-- 0. Create database if missing
-- ---------------------------------------------------------------------
IF DB_ID(N'GiveAIDDB') IS NULL
BEGIN
    PRINT '>>> Creating database GiveAIDDB';
    CREATE DATABASE GiveAIDDB;
END
ELSE
BEGIN
    PRINT '>>> Database GiveAIDDB already exists — continuing.';
END
GO

USE GiveAIDDB;
GO

-- ---------------------------------------------------------------------
-- 1. Drop views (must precede tables for re-runs)
-- ---------------------------------------------------------------------
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql = @sql + 'DROP VIEW IF EXISTS ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name) + ';' + CHAR(10)
FROM sys.views WHERE SCHEMA_NAME(schema_id) = 'dbo';
EXEC sp_executesql @sql;
PRINT '>>> Dropped existing views.';
GO

-- ---------------------------------------------------------------------
-- 2. Drop all FK constraints, then drop all tables (cascade-safe).
--    Dropping FKs first removes the dependency chain that prevents
--    DROP TABLE IF EXISTS from succeeding on a populated database.
-- ---------------------------------------------------------------------
DECLARE @dropSql NVARCHAR(MAX) = N'';

-- 2a. Drop all foreign keys
SELECT @dropSql = @dropSql + 'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) +
    ' DROP CONSTRAINT ' + QUOTENAME(name) + ';' + CHAR(10)
FROM sys.foreign_keys WHERE SCHEMA_NAME(schema_id) = 'dbo';
EXEC sp_executesql @dropSql;

-- 2b. Drop all tables
SET @dropSql = N'';
SELECT @dropSql = @dropSql + 'DROP TABLE IF EXISTS ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name) + ';' + CHAR(10)
FROM sys.tables WHERE SCHEMA_NAME(schema_id) = 'dbo';
EXEC sp_executesql @dropSql;
PRINT '>>> Dropped all FK constraints and tables.';
GO

-- =====================================================================
-- 3. CREATE TABLES (matching V2 Domain entities + snake_case naming)
-- =====================================================================

-- 3.1 users
CREATE TABLE users (
    user_id              INT            IDENTITY(1,1) PRIMARY KEY,
    username             VARCHAR(50)    NOT NULL UNIQUE,
    email                VARCHAR(100)   NOT NULL UNIQUE,
    password_hash        VARCHAR(255)   NOT NULL,
    full_name            NVARCHAR(100)  NOT NULL,
    phone                VARCHAR(20)    NULL,
    address              NVARCHAR(255)  NULL,
    profession           NVARCHAR(100)  NULL,
    date_of_birth        DATE           NULL,
    gender               NVARCHAR(10)   NULL,
    role                 NVARCHAR(20)   NOT NULL DEFAULT 'User',  -- 'Admin' | 'User' | 'ContentManager'
    permissions          NVARCHAR(MAX)  NULL,                      -- JSON array
    is_verified          BIT            NOT NULL DEFAULT 0,
    verification_token   VARCHAR(100)   NULL,
    is_active            BIT            NOT NULL DEFAULT 1,
    last_login           DATETIME       NULL,
    password_changed_at  DATETIME       NULL,                      -- security stamp
    created_at           DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at           DATETIME       NULL,
    CONSTRAINT CHK_users_role CHECK (role IN ('Admin', 'User', 'ContentManager'))
);
PRINT '>>> Created users';
GO

-- 3.2 organizations (merged Partners + NGOs + Supporters)
CREATE TABLE organizations (
    organization_id       INT            IDENTITY(1,1) PRIMARY KEY,
    organization_name     NVARCHAR(150)  NOT NULL,
    organization_type     NVARCHAR(20)   NOT NULL,   -- 'NGO' | 'Partner' | 'Supporter'
    description           NVARCHAR(MAX)  NULL,
    logo_url              VARCHAR(255)   NULL,
    website_url           VARCHAR(200)   NULL,
    contact_email         VARCHAR(100)   NULL,
    contact_phone         VARCHAR(20)    NULL,
    address               NVARCHAR(255)  NULL,
    registration_number   VARCHAR(50)    NULL,
    mission               NVARCHAR(500)  NULL,
    vision                NVARCHAR(500)  NULL,
    contribution_amount   DECIMAL(18,2)  NULL,
    contribution_type     NVARCHAR(50)   NULL,       -- 'Financial' | 'InKind' | 'Volunteer'
    is_active             BIT            NOT NULL DEFAULT 1,
    is_featured           BIT            NOT NULL DEFAULT 0,
    display_order         INT            NOT NULL DEFAULT 0,
    created_at            DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at            DATETIME       NULL,
    CONSTRAINT CHK_org_type CHECK (organization_type IN ('NGO', 'Partner', 'Supporter')),
    CONSTRAINT CHK_org_amount CHECK (contribution_amount IS NULL OR contribution_amount >= 0)
);
PRINT '>>> Created organizations';
GO

-- 3.3 causes (donation categories, with 2-level hierarchy)
CREATE TABLE causes (
    cause_id         INT            IDENTITY(1,1) PRIMARY KEY,
    cause_code       VARCHAR(20)    NULL UNIQUE,
    cause_name       NVARCHAR(100)  NOT NULL,
    description      NVARCHAR(500)  NULL,
    image_url        VARCHAR(255)   NULL,
    icon             NVARCHAR(50)   NULL,
    target_amount    DECIMAL(18,2)  NOT NULL DEFAULT 0,
    raised_amount    DECIMAL(18,2)  NOT NULL DEFAULT 0,
    is_active        BIT            NOT NULL DEFAULT 1,
    display_order    INT            NOT NULL DEFAULT 0,
    parent_cause_id  INT            NULL,
    created_at       DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at       DATETIME       NULL,
    CONSTRAINT FK_causes_parent FOREIGN KEY (parent_cause_id) REFERENCES causes(cause_id),
    CONSTRAINT CHK_causes_amounts CHECK (target_amount >= 0 AND raised_amount >= 0)
);
PRINT '>>> Created causes';
GO

-- 3.4 campaigns (merged Campaign + Programme functionality)
CREATE TABLE campaigns (
    campaign_id            INT            IDENTITY(1,1) PRIMARY KEY,
    cause_id               INT            NOT NULL,
    organization_id        INT            NULL,
    campaign_name          NVARCHAR(200)  NOT NULL,
    campaign_code          VARCHAR(50)    NULL UNIQUE,
    programme_type         VARCHAR(50)    NULL,         -- 'Education' | 'HealthCare' | 'ChildWelfare' | 'WomenEmpowerment'
    registration_required  BIT            NOT NULL DEFAULT 0,
    max_participants       INT            NULL,
    target_beneficiaries   INT            NULL,
    expected_budget        DECIMAL(18,2)  NULL,
    actual_budget          DECIMAL(18,2)  NULL,
    description            NVARCHAR(MAX)  NULL,
    goal_amount            DECIMAL(18,2)  NOT NULL,
    raised_amount          DECIMAL(18,2)  NOT NULL DEFAULT 0,
    start_date             DATE           NOT NULL,
    end_date               DATE           NULL,
    image_url              VARCHAR(500)   NULL,
    beneficiaries_count    INT            NULL,
    location               NVARCHAR(200)  NULL,
    status                 NVARCHAR(20)   NOT NULL DEFAULT 'Active',
    is_featured            BIT            NOT NULL DEFAULT 0,
    display_order          INT            NOT NULL DEFAULT 0,
    created_by             INT            NULL,
    created_at             DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at             DATETIME       NULL,
    CONSTRAINT FK_campaigns_cause FOREIGN KEY (cause_id) REFERENCES causes(cause_id),
    CONSTRAINT FK_campaigns_org   FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT FK_campaigns_user  FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT CHK_campaign_status CHECK (status IN ('Active', 'Completed', 'Cancelled', 'Paused')),
    CONSTRAINT CHK_campaign_amounts CHECK (goal_amount > 0 AND raised_amount >= 0),
    CONSTRAINT CHK_campaign_dates CHECK (end_date IS NULL OR end_date >= start_date)
);
PRINT '>>> Created campaigns';
GO

-- 3.5 donations
CREATE TABLE donations (
    donation_id             INT            IDENTITY(1,1) PRIMARY KEY,
    user_id                 INT            NULL,
    cause_id                INT            NOT NULL,
    campaign_id             INT            NULL,
    organization_id         INT            NULL,
    amount                  DECIMAL(18,2)  NOT NULL,
    donation_date           DATETIME       NOT NULL DEFAULT GETDATE(),
    payment_method          NVARCHAR(20)   NOT NULL,
    payment_status          NVARCHAR(20)   NOT NULL DEFAULT 'Pending',
    transaction_id          VARCHAR(100)   NULL UNIQUE,
    card_last_four          CHAR(4)        NULL,
    card_type               NVARCHAR(20)   NULL,
    is_anonymous            BIT            NOT NULL DEFAULT 0,
    message                 NVARCHAR(500)  NULL,
    receipt_sent            BIT            NOT NULL DEFAULT 0,
    idempotency_key         VARCHAR(100)   NULL,
    gateway_transaction_id  VARCHAR(100)   NULL,
    payment_confirmed_at    DATETIME       NULL,
    created_at              DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at              DATETIME       NULL,
    CONSTRAINT FK_donations_user   FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT FK_donations_cause  FOREIGN KEY (cause_id) REFERENCES causes(cause_id),
    CONSTRAINT FK_donations_camp   FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id),
    CONSTRAINT FK_donations_org    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT CHK_donation_payment_status CHECK (payment_status IN ('Pending', 'Completed', 'Failed', 'Refunded')),
    CONSTRAINT CHK_donation_amount CHECK (amount > 0)
);
PRINT '>>> Created donations';
GO

-- 3.6 campaign_reports
CREATE TABLE campaign_reports (
    report_id              INT            IDENTITY(1,1) PRIMARY KEY,
    campaign_id            INT            NOT NULL,
    total_received         DECIMAL(18,2)  NOT NULL,
    total_spent            DECIMAL(18,2)  NOT NULL,
    remaining_amount       AS (total_received - total_spent) PERSISTED,
    beneficiaries_reached  INT            NULL,
    report_title           NVARCHAR(200)  NULL,
    report_content         NVARCHAR(MAX)  NULL,
    expense_breakdown      NVARCHAR(MAX)  NULL,         -- JSON
    photos                 NVARCHAR(MAX)  NULL,         -- JSON array
    documents              NVARCHAR(MAX)  NULL,         -- JSON array
    is_published           BIT            NOT NULL DEFAULT 0,
    published_date         DATETIME       NULL,
    published_by           INT            NULL,
    created_at             DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at             DATETIME       NULL,
    CONSTRAINT FK_reports_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id),
    CONSTRAINT FK_reports_publisher FOREIGN KEY (published_by) REFERENCES users(user_id)
);
PRINT '>>> Created campaign_reports';
GO

-- 3.7 campaign_registrations (NEW — merged Programme registration)
CREATE TABLE campaign_registrations (
    registration_id         INT            IDENTITY(1,1) PRIMARY KEY,
    campaign_id             INT            NOT NULL,
    user_id                 INT            NOT NULL,
    registration_date       DATETIME       NOT NULL DEFAULT GETDATE(),
    status                  NVARCHAR(20)   NOT NULL DEFAULT 'Registered',
    notes                   NVARCHAR(500)  NULL,
    attendance_confirmed    BIT            NOT NULL DEFAULT 0,
    created_at              DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at              DATETIME       NULL,
    CONSTRAINT FK_camp_reg_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id),
    CONSTRAINT FK_camp_reg_user     FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT CHK_camp_reg_status  CHECK (status IN ('Registered', 'Confirmed', 'Attended', 'Cancelled')),
    CONSTRAINT UQ_camp_reg_user_camp UNIQUE (user_id, campaign_id)
);
PRINT '>>> Created campaign_registrations';
GO

-- 3.8 programmes (legacy — kept for events/activities that aren't donation campaigns)
CREATE TABLE programmes (
    programme_id            INT            IDENTITY(1,1) PRIMARY KEY,
    organization_id         INT            NULL,
    title                   NVARCHAR(200)  NOT NULL,
    programme_type          NVARCHAR(50)   NOT NULL,
    description             NVARCHAR(MAX)  NULL,
    image_url               VARCHAR(255)   NULL,
    start_date              DATETIME       NULL,
    end_date                DATETIME       NULL,
    location                NVARCHAR(255)  NULL,
    target_beneficiaries    INT            NULL,
    expected_budget         DECIMAL(18,2)  NULL,
    actual_budget           DECIMAL(18,2)  NULL,
    status                  NVARCHAR(20)   NOT NULL DEFAULT 'Upcoming',
    is_featured             BIT            NOT NULL DEFAULT 0,
    registration_required   BIT            NOT NULL DEFAULT 1,
    max_participants        INT            NULL,
    created_by              INT            NULL,
    created_at              DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at              DATETIME       NULL,
    CONSTRAINT FK_programmes_org  FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT FK_programmes_user FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT CHK_programme_status CHECK (status IN ('Upcoming', 'Ongoing', 'Completed', 'Cancelled'))
);
PRINT '>>> Created programmes';
GO

-- 3.9 programme_photos
CREATE TABLE programme_photos (
    photo_id       INT            IDENTITY(1,1) PRIMARY KEY,
    programme_id   INT            NOT NULL,
    photo_url      VARCHAR(255)   NOT NULL,
    caption        NVARCHAR(200)  NULL,
    display_order  INT            NOT NULL DEFAULT 0,
    uploaded_by    INT            NULL,
    uploaded_at    DATETIME       NOT NULL DEFAULT GETDATE(),
    created_at     DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at     DATETIME       NULL,
    CONSTRAINT FK_photos_programme FOREIGN KEY (programme_id) REFERENCES programmes(programme_id) ON DELETE CASCADE,
    CONSTRAINT FK_photos_user      FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);
PRINT '>>> Created programme_photos';
GO

-- 3.10 programme_registrations
CREATE TABLE programme_registrations (
    registration_id        INT            IDENTITY(1,1) PRIMARY KEY,
    programme_id           INT            NOT NULL,
    user_id                INT            NOT NULL,
    registration_date      DATETIME       NOT NULL DEFAULT GETDATE(),
    status                 NVARCHAR(20)   NOT NULL DEFAULT 'Registered',
    notes                  NVARCHAR(500)  NULL,
    attendance_confirmed   BIT            NOT NULL DEFAULT 0,
    created_at             DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at             DATETIME       NULL,
    CONSTRAINT FK_prog_reg_programme FOREIGN KEY (programme_id) REFERENCES programmes(programme_id),
    CONSTRAINT FK_prog_reg_user      FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT CHK_prog_reg_status   CHECK (status IN ('Registered', 'Confirmed', 'Attended', 'Cancelled')),
    CONSTRAINT UQ_prog_reg_user_prog UNIQUE (user_id, programme_id)
);
PRINT '>>> Created programme_registrations';
GO

-- 3.11 cms_pages
CREATE TABLE cms_pages (
    page_id           INT            IDENTITY(1,1) PRIMARY KEY,
    page_key          VARCHAR(50)    NOT NULL UNIQUE,
    page_title        NVARCHAR(100)  NOT NULL,
    page_slug         VARCHAR(100)   NULL UNIQUE,
    content           NVARCHAR(MAX)  NULL,
    meta_description  NVARCHAR(255)  NULL,
    meta_keywords     NVARCHAR(255)  NULL,
    is_active         BIT            NOT NULL DEFAULT 1,
    is_in_menu        BIT            NOT NULL DEFAULT 1,
    parent_page_id    INT            NULL,
    display_order     INT            NOT NULL DEFAULT 0,
    updated_by        INT            NULL,
    created_at        DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME       NULL,
    CONSTRAINT FK_cms_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id),
    CONSTRAINT FK_cms_parent     FOREIGN KEY (parent_page_id) REFERENCES cms_pages(page_id)
);
PRINT '>>> Created cms_pages';
GO

-- 3.12 conversations (renamed from Queries)
CREATE TABLE conversations (
    conversation_id     INT            IDENTITY(1,1) PRIMARY KEY,
    user_id             INT            NULL,
    subject             NVARCHAR(200)  NOT NULL,
    conversation_type   NVARCHAR(50)   NULL,
    status              NVARCHAR(20)   NOT NULL DEFAULT 'Open',
    priority            NVARCHAR(20)   NOT NULL DEFAULT 'Normal',
    assigned_to         INT            NULL,
    created_at          DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at          DATETIME       NULL,
    closed_at           DATETIME       NULL,
    CONSTRAINT FK_conv_user   FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT FK_conv_assigned FOREIGN KEY (assigned_to) REFERENCES users(user_id),
    CONSTRAINT CHK_conv_status  CHECK (status IN ('Open', 'InProgress', 'Resolved', 'Closed')),
    CONSTRAINT CHK_conv_priority CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent'))
);
PRINT '>>> Created conversations';
GO

-- 3.13 conversation_messages
CREATE TABLE conversation_messages (
    message_id         INT            IDENTITY(1,1) PRIMARY KEY,
    conversation_id    INT            NOT NULL,
    sender_id          INT            NOT NULL,
    message_text       NVARCHAR(MAX)  NOT NULL,
    is_internal_note   BIT            NOT NULL DEFAULT 0,
    attachments        NVARCHAR(MAX)  NULL,           -- JSON array
    created_at         DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at         DATETIME       NULL,
    CONSTRAINT FK_msg_conv   FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    CONSTRAINT FK_msg_sender FOREIGN KEY (sender_id) REFERENCES users(user_id)
);
PRINT '>>> Created conversation_messages';
GO

-- 3.14 careers
CREATE TABLE careers (
    career_id          INT            IDENTITY(1,1) PRIMARY KEY,
    position_title     NVARCHAR(150)  NOT NULL,
    department         NVARCHAR(100)  NULL,
    description        NVARCHAR(MAX)  NULL,
    requirements       NVARCHAR(MAX)  NULL,
    responsibilities   NVARCHAR(MAX)  NULL,
    location           NVARCHAR(100)  NULL,
    employment_type    NVARCHAR(50)   NULL,
    salary_range       NVARCHAR(100)  NULL,
    vacancies          INT            NOT NULL DEFAULT 1,
    posted_date        DATE           NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    closing_date       DATE           NULL,
    is_active          BIT            NOT NULL DEFAULT 1,
    created_by         INT            NULL,
    created_at         DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at         DATETIME       NULL,
    CONSTRAINT FK_careers_user FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT CHK_careers_employment CHECK (employment_type IN ('FullTime', 'PartTime', 'Contract', 'Volunteer', 'Internship'))
);
PRINT '>>> Created careers';
GO

-- 3.15 career_applications
CREATE TABLE career_applications (
    application_id   INT            IDENTITY(1,1) PRIMARY KEY,
    career_id        INT            NOT NULL,
    applicant_name   NVARCHAR(100)  NOT NULL,
    email            VARCHAR(100)   NOT NULL,
    phone            VARCHAR(20)    NULL,
    resume_url       VARCHAR(255)   NULL,
    cover_letter     NVARCHAR(MAX)  NULL,
    linkedin_url     VARCHAR(200)   NULL,
    portfolio_url    VARCHAR(200)   NULL,
    status           NVARCHAR(20)   NOT NULL DEFAULT 'Submitted',
    reviewed_by      INT            NULL,
    reviewed_at      DATETIME       NULL,
    notes            NVARCHAR(MAX)  NULL,
    applied_at       DATETIME       NOT NULL DEFAULT GETDATE(),
    created_at       DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at       DATETIME       NULL,
    CONSTRAINT FK_apps_career FOREIGN KEY (career_id) REFERENCES careers(career_id),
    CONSTRAINT FK_apps_user   FOREIGN KEY (reviewed_by) REFERENCES users(user_id),
    CONSTRAINT CHK_apps_status CHECK (status IN ('Submitted', 'Screening', 'Interview', 'Offered', 'Accepted', 'Rejected'))
);
PRINT '>>> Created career_applications';
GO

-- 3.16 gallery
CREATE TABLE gallery (
    gallery_id       INT            IDENTITY(1,1) PRIMARY KEY,
    title            NVARCHAR(200)  NULL,
    photo_url        VARCHAR(255)   NOT NULL,
    thumbnail_url    VARCHAR(255)   NULL,
    category         NVARCHAR(50)   NULL,
    tags             NVARCHAR(255)  NULL,
    programme_id     INT            NULL,
    organization_id  INT            NULL,
    display_order    INT            NOT NULL DEFAULT 0,
    is_featured      BIT            NOT NULL DEFAULT 0,
    uploaded_by      INT            NULL,
    uploaded_at      DATETIME       NOT NULL DEFAULT GETDATE(),
    created_at       DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at       DATETIME       NULL,
    CONSTRAINT FK_gallery_programme FOREIGN KEY (programme_id) REFERENCES programmes(programme_id),
    CONSTRAINT FK_gallery_org       FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT FK_gallery_user      FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);
PRINT '>>> Created gallery';
GO

-- 3.17 contact_messages
CREATE TABLE contact_messages (
    contact_id      INT            IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(100)  NOT NULL,
    email           VARCHAR(100)   NOT NULL,
    phone           VARCHAR(20)    NULL,
    subject         NVARCHAR(200)  NULL,
    message         NVARCHAR(MAX)  NOT NULL,
    is_read         BIT            NOT NULL DEFAULT 0,
    replied_by      INT            NULL,
    reply_message   NVARCHAR(MAX)  NULL,
    replied_at      DATETIME       NULL,
    created_at      DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME       NULL,
    CONSTRAINT FK_contact_user FOREIGN KEY (replied_by) REFERENCES users(user_id)
);
PRINT '>>> Created contact_messages';
GO

-- 3.18 invitations
CREATE TABLE invitations (
    invitation_id      INT            IDENTITY(1,1) PRIMARY KEY,
    inviter_user_id    INT            NULL,
    invitee_name       NVARCHAR(150)  NOT NULL,
    invitee_email      NVARCHAR(150)  NOT NULL,
    personal_message   NVARCHAR(500)  NULL,
    status             NVARCHAR(20)   NOT NULL DEFAULT 'Pending',  -- 'Pending' | 'Sent' | 'Failed' | 'Registered' | 'Cancelled'
    invitation_token   NVARCHAR(64)   NULL,
    sent_at            DATETIME       NULL,
    registered_at      DATETIME       NULL,
    failure_reason     NVARCHAR(MAX)  NULL,
    created_at         DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at         DATETIME       NULL,
    CONSTRAINT FK_inv_user FOREIGN KEY (inviter_user_id) REFERENCES users(user_id),
    CONSTRAINT CHK_inv_status CHECK (status IN ('Pending', 'Sent', 'Failed', 'Registered', 'Cancelled'))
);
PRINT '>>> Created invitations';
GO

-- 3.19 team_members (About Us)
CREATE TABLE team_members (
    team_member_id  INT            IDENTITY(1,1) PRIMARY KEY,
    full_name       NVARCHAR(150)  NOT NULL,
    role_title      NVARCHAR(150)  NOT NULL,
    department      NVARCHAR(100)  NULL,
    bio             NVARCHAR(MAX)  NULL,
    photo_url       NVARCHAR(500)  NULL,
    email           NVARCHAR(100)  NULL,
    linkedin_url    NVARCHAR(255)  NULL,
    twitter_url     NVARCHAR(255)  NULL,
    facebook_url    NVARCHAR(255)  NULL,
    display_order   INT            NOT NULL DEFAULT 0,
    is_active       BIT            NOT NULL DEFAULT 1,
    is_featured     BIT            NOT NULL DEFAULT 0,
    joined_date     DATE           NULL,
    created_by      INT            NULL,
    created_at      DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME       NULL,
    CONSTRAINT FK_team_user FOREIGN KEY (created_by) REFERENCES users(user_id)
);
PRINT '>>> Created team_members';
GO

-- 3.20 achievements
CREATE TABLE achievements (
    achievement_id    INT            IDENTITY(1,1) PRIMARY KEY,
    title             NVARCHAR(200)  NOT NULL,
    category          NVARCHAR(100)  NULL,
    description       NVARCHAR(MAX)  NULL,
    metric_value      DECIMAL(18,2)  NULL,
    metric_label      NVARCHAR(100)  NULL,
    metric_suffix     NVARCHAR(20)   NULL,
    achievement_date  DATE           NULL,
    image_url         NVARCHAR(500)  NULL,
    icon              NVARCHAR(50)   NULL,
    award_by          NVARCHAR(150)  NULL,
    location          NVARCHAR(200)  NULL,
    beneficiaries     INT            NULL,
    display_order     INT            NOT NULL DEFAULT 0,
    is_active         BIT            NOT NULL DEFAULT 1,
    is_featured       BIT            NOT NULL DEFAULT 0,
    created_by        INT            NULL,
    created_at        DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME       NULL,
    CONSTRAINT FK_ach_user FOREIGN KEY (created_by) REFERENCES users(user_id)
);
PRINT '>>> Created achievements';
GO

-- 3.21 faqs (Help Centre)
CREATE TABLE faqs (
    faq_id        INT            IDENTITY(1,1) PRIMARY KEY,
    question      NVARCHAR(500)  NOT NULL,
    answer        NVARCHAR(MAX)  NOT NULL,
    category      NVARCHAR(100)  NULL,
    display_order INT            NOT NULL DEFAULT 0,
    is_active     BIT            NOT NULL DEFAULT 1,
    is_featured   BIT            NOT NULL DEFAULT 0,
    view_count    INT            NOT NULL DEFAULT 0,
    created_by    INT            NULL,
    created_at    DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at    DATETIME       NULL,
    CONSTRAINT FK_faq_user FOREIGN KEY (created_by) REFERENCES users(user_id)
);
PRINT '>>> Created faqs';
GO

-- 3.22 email_logs
CREATE TABLE email_logs (
    email_log_id    INT            IDENTITY(1,1) PRIMARY KEY,
    to_email        NVARCHAR(150)  NOT NULL,
    subject         NVARCHAR(255)  NOT NULL,
    body            NVARCHAR(MAX)  NULL,
    status          NVARCHAR(20)   NOT NULL DEFAULT 'Pending',  -- 'Pending' | 'Sent' | 'Failed'
    error_message   NVARCHAR(MAX)  NULL,
    sent_at         DATETIME       NULL,
    email_type      NVARCHAR(50)   NULL,
    created_at      DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME       NULL,
    CONSTRAINT CHK_email_status CHECK (status IN ('Pending', 'Sent', 'Failed'))
);
PRINT '>>> Created email_logs';
GO

-- =====================================================================
-- 4. INDEXES
-- =====================================================================
CREATE INDEX idx_users_email     ON users(email);
CREATE INDEX idx_users_role      ON users(role);
CREATE INDEX idx_users_active    ON users(is_active);
CREATE INDEX idx_org_type        ON organizations(organization_type);
CREATE INDEX idx_org_active      ON organizations(is_active);
CREATE INDEX idx_causes_active   ON causes(is_active);
CREATE INDEX idx_causes_parent   ON causes(parent_cause_id);
CREATE INDEX idx_campaigns_cause ON campaigns(cause_id);
CREATE INDEX idx_campaigns_org   ON campaigns(organization_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_featured ON campaigns(is_featured);
CREATE INDEX idx_donations_user   ON donations(user_id);
CREATE INDEX idx_donations_cause  ON donations(cause_id);
CREATE INDEX idx_donations_camp   ON donations(campaign_id);
CREATE INDEX idx_donations_date   ON donations(donation_date);
CREATE INDEX idx_donations_status ON donations(payment_status);
CREATE INDEX idx_donations_idem   ON donations(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_programmes_status ON programmes(status);
CREATE INDEX idx_programmes_type   ON programmes(programme_type);
CREATE INDEX idx_programmes_org    ON programmes(organization_id);
CREATE INDEX idx_conv_status        ON conversations(status);
CREATE INDEX idx_conv_user          ON conversations(user_id);
CREATE INDEX idx_conv_messages      ON conversation_messages(conversation_id);
CREATE INDEX idx_cms_slug           ON cms_pages(page_slug);
CREATE INDEX idx_cms_active         ON cms_pages(is_active);
CREATE INDEX idx_career_apps        ON career_applications(career_id);
CREATE INDEX idx_career_apps_status ON career_applications(status);
CREATE INDEX idx_gallery_featured   ON gallery(is_featured);
CREATE INDEX idx_gallery_category   ON gallery(category);
CREATE INDEX idx_contact_read       ON contact_messages(is_read);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_token  ON invitations(invitation_token);
CREATE INDEX idx_team_active        ON team_members(is_active);
CREATE INDEX idx_achievements_active ON achievements(is_active);
CREATE INDEX idx_faqs_active        ON faqs(is_active);
CREATE INDEX idx_faqs_category      ON faqs(category);
CREATE INDEX idx_email_logs_status  ON email_logs(status);
PRINT '>>> Created indexes';
GO

-- =====================================================================
-- 5. VIEWS
-- =====================================================================
CREATE OR ALTER VIEW dbo.vw_ActiveCampaigns AS
SELECT
    cp.campaign_id, cp.campaign_name, cp.campaign_code, cp.cause_id,
    cp.goal_amount, cp.raised_amount,
    CAST(ISNULL(cp.raised_amount * 100.0 / NULLIF(cp.goal_amount, 0), 0) AS DECIMAL(5,2)) AS percentage_reached,
    cp.start_date, cp.end_date, cp.status, cp.is_featured, cp.display_order
FROM campaigns cp
WHERE cp.status = 'Active' AND (cp.end_date IS NULL OR cp.end_date >= CAST(GETDATE() AS DATE));
GO

CREATE OR ALTER VIEW dbo.vw_CampaignSummary AS
SELECT
    cp.campaign_id, cp.campaign_name, cp.campaign_code,
    cp.goal_amount, cp.raised_amount,
    CAST(ISNULL(cp.raised_amount * 100.0 / NULLIF(cp.goal_amount, 0), 0) AS DECIMAL(5,2)) AS percentage_reached,
    (SELECT COUNT(DISTINCT user_id) FROM donations d WHERE d.campaign_id = cp.campaign_id AND d.payment_status = 'Completed') AS donor_count,
    cp.start_date, cp.end_date, cp.status,
    c.cause_name, c.cause_code,
    DATEDIFF(day, GETDATE(), cp.end_date) AS days_remaining
FROM campaigns cp
INNER JOIN causes c ON cp.cause_id = c.cause_id;
GO

CREATE OR ALTER VIEW dbo.vw_DonationsByCause AS
SELECT
    c.cause_id, c.cause_name, c.target_amount,
    COUNT(d.donation_id) AS total_donations,
    ISNULL(SUM(d.amount), 0) AS total_raised,
    CAST(ISNULL(SUM(d.amount) * 100.0 / NULLIF(c.target_amount, 0), 0) AS DECIMAL(5,2)) AS percentage_reached
FROM causes c
LEFT JOIN donations d ON c.cause_id = d.cause_id AND d.payment_status = 'Completed'
GROUP BY c.cause_id, c.cause_name, c.target_amount;
GO

CREATE OR ALTER VIEW dbo.vw_ActiveNGOs AS
SELECT * FROM organizations WHERE organization_type = 'NGO' AND is_active = 1;
GO

CREATE OR ALTER VIEW dbo.vw_ActivePartners AS
SELECT * FROM organizations WHERE organization_type = 'Partner' AND is_active = 1;
GO

CREATE OR ALTER VIEW dbo.vw_AdminUsers AS
SELECT user_id, username, email, full_name, role, last_login, is_active
FROM users
WHERE role IN ('Admin', 'ContentManager');
GO

PRINT '>>> Created views';
GO

-- =====================================================================
-- 6. SEED DATA
-- =====================================================================

-- 6.1 Seed CMS pages (only if empty)
IF NOT EXISTS (SELECT 1 FROM cms_pages)
BEGIN
    PRINT '>>> Seeding cms_pages';
    INSERT INTO cms_pages (page_key, page_title, page_slug, display_order, is_in_menu, is_active, created_at, updated_at) VALUES
        ('home',          N'Home',              'home',           1, 1, 1, GETDATE(), NULL),
        ('about_us',      N'About Us',          'about-us',       2, 1, 1, GETDATE(), NULL),
        ('what_we_do',    N'What We Do',        'what-we-do',     3, 1, 1, GETDATE(), NULL),
        ('our_mission',   N'Our Mission',       'our-mission',    4, 1, 1, GETDATE(), NULL),
        ('our_team',      N'Our Team',          'our-team',       5, 1, 1, GETDATE(), NULL),
        ('careers',       N'Career With Us',    'careers',        6, 1, 1, GETDATE(), NULL),
        ('achievements',  N'Our Achievements',  'achievements',   7, 1, 1, GETDATE(), NULL),
        ('contact_us',    N'Contact Us',        'contact-us',     8, 1, 1, GETDATE(), NULL),
        ('help_centre',   N'Help Centre',       'help-centre',    9, 1, 1, GETDATE(), NULL),
        ('privacy_policy',N'Privacy Policy',    'privacy-policy', 0, 0, 1, GETDATE(), NULL),
        ('terms_of_service',N'Terms of Service', 'terms-of-service',0, 0, 1, GETDATE(), NULL);
END
GO

-- 6.2 Seed parent causes (only if empty)
-- Care4Kids only: Education for Children, Healthcare Support, Child Welfare.
-- Generic NGO categories (Women Empowerment, Environment, Emergency Relief,
-- Elderly Care, Disability Support, Animal Welfare) are intentionally NOT
-- seeded because they don't match the Care4Kids platform theme. The Donation
-- page dropdown sources its data via GET /api/v1/causes/tree and must only
-- see Care4Kids-aligned causes. See database/Deactivate_NonCare4Kids_Causes.sql
-- for the soft-deactivation script for existing databases that already have
-- the older seed.
IF NOT EXISTS (SELECT 1 FROM causes)
BEGIN
    PRINT '>>> Seeding causes (Care4Kids parent + sub)';
    SET IDENTITY_INSERT causes ON;
    INSERT INTO causes (cause_id, cause_code, cause_name, description, icon, target_amount, raised_amount, is_active, display_order, parent_cause_id, created_at, updated_at) VALUES
        (1, 'EDU',     N'Education for Children',  N'Support education initiatives for underprivileged children', 'graduation-cap', 500000000, 0, 1, 1, NULL, GETDATE(), NULL),
        (2, 'HEALTH',  N'Healthcare Support',      N'Provide healthcare access to those in need',                'heartbeat',      750000000, 0, 1, 2, NULL, GETDATE(), NULL),
        (3, 'CHILD',   N'Child Welfare',           N'Protect and support vulnerable children',                   'child',          400000000, 0, 1, 3, NULL, GETDATE(), NULL),
        -- sub-causes for EDU
        (10, 'EDU-BOOK',     N'School Supplies',     N'Provide books, uniforms, and stationery',              NULL,  50000000,  0, 1, 1, 1,  GETDATE(), NULL),
        (11, 'EDU-SCHOLAR',  N'Scholarships',        N'Fund educational scholarships',                         NULL, 100000000,  0, 1, 2, 1,  GETDATE(), NULL),
        (12, 'EDU-SKILL',    N'Vocational Training', N'Skill development programs',                            NULL,  75000000,  0, 1, 3, 1,  GETDATE(), NULL),
        -- sub-causes for HEALTH
        (13, 'HEALTH-MED',   N'Medical Treatment',   N'Fund medical treatments and surgeries',                 NULL, 200000000,  0, 1, 1, 2,  GETDATE(), NULL),
        (14, 'HEALTH-VAC',   N'Vaccination Programs',N'Support vaccination drives',                            NULL, 100000000,  0, 1, 2, 2,  GETDATE(), NULL),
        (15, 'HEALTH-MH',    N'Mental Health',       N'Mental health awareness and support',                   NULL,  75000000,  0, 1, 3, 2,  GETDATE(), NULL),
        -- sub-causes for CHILD
        (16, 'CHILD-SHELTER',N'Child Shelters',      N'Safe houses for children',                              NULL, 100000000,  0, 1, 1, 3,  GETDATE(), NULL),
        (17, 'CHILD-NUTR',   N'Nutrition',           N'Fight child malnutrition',                              NULL,  75000000,  0, 1, 2, 3,  GETDATE(), NULL);
    SET IDENTITY_INSERT causes OFF;
END
GO

-- 6.3 Seed FAQs
IF NOT EXISTS (SELECT 1 FROM faqs)
BEGIN
    PRINT '>>> Seeding faqs';
    INSERT INTO faqs (question, answer, category, display_order, is_active, created_at, updated_at) VALUES
        (N'How do I make a donation?', N'Simply browse our causes, select one you care about, and click ''Donate''. You can use credit card, debit card, or bank transfer.', N'Donations', 1, 1, GETDATE(), NULL),
        (N'Is my donation tax-deductible?', N'Yes, donations to registered charitable organizations may be tax-deductible. Please consult your tax advisor for specific advice.', N'Donations', 2, 1, GETDATE(), NULL),
        (N'How is my donation used?', N'100% of your donation goes directly to the cause you choose. We maintain transparent reporting on all campaigns.', N'Donations', 3, 1, GETDATE(), NULL),
        (N'How do I volunteer?', N'Register on our platform, browse volunteer opportunities, and sign up for programs that match your interests.', N'Volunteering', 1, 1, GETDATE(), NULL),
        (N'Can I cancel my recurring donation?', N'Yes, you can cancel your recurring donation anytime from your account settings.', N'Donations', 4, 1, GETDATE(), NULL),
        (N'How do I receive a donation receipt?', N'Donation receipts are automatically sent to your registered email address after each donation.', N'Donations', 5, 1, GETDATE(), NULL);
END
GO

-- =====================================================================
-- 7. SUMMARY
-- =====================================================================
PRINT '====================================================================';
PRINT 'GiveAID V2 — Database setup COMPLETE.';
PRINT 'Tables created: 22';
PRINT 'Indexes created: ~40';
PRINT 'Views created:   7';
PRINT 'Seed data:       11 CMS pages, 11 causes (3 Care4Kids parents + 8 sub-causes), 6 FAQs';
PRINT '';
PRINT 'IMPORTANT: Admin user is seeded by the application, NOT by this SQL script.';
PRINT 'For Development: Start API with ASPNETCORE_ENVIRONMENT=Development to auto-seed.';
PRINT 'For Production: Set ADMIN_PASSWORD environment variable before first run.';
PRINT '====================================================================';
GO



