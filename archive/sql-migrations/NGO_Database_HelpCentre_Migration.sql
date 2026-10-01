-- =====================================================
-- HELP CENTRE + CONTACT MANAGEMENT — MIGRATION SCRIPT
-- =====================================================
-- Adds:
--   * Faqs                 -> Help Centre / FAQ page
--   * Seeds sample FAQs
--   * CmsPages entry for Help Centre
--
-- Existing tables reused (no schema change):
--   * ContactMessages      -> Contact form submissions (public submit + admin reply)
--   * Conversations / ConversationMessages -> User support threads
-- =====================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF DB_NAME() <> N'GiveAIDDB'
    THROW 50000, 'Run this migration against GiveAIDDB only.', 1;
GO

-- =====================================================
-- 1. Faqs
-- =====================================================
IF OBJECT_ID(N'dbo.Faqs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Faqs (
        faq_id         INT           IDENTITY(1,1) PRIMARY KEY,
        question       NVARCHAR(500) NOT NULL,
        answer         NVARCHAR(MAX) NOT NULL,
        category       NVARCHAR(100) NULL,
        display_order  INT           NOT NULL DEFAULT 0,
        is_active     BIT           NOT NULL DEFAULT 1,
        is_featured   BIT           NOT NULL DEFAULT 0,
        view_count    INT           NOT NULL DEFAULT 0,
        created_at    DATETIME      NOT NULL DEFAULT GETDATE(),
        updated_at    DATETIME      NOT NULL DEFAULT GETDATE(),
        created_by    INT           NULL,
        CONSTRAINT FK_Faqs_Users FOREIGN KEY (created_by)
            REFERENCES dbo.Users(user_id)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'idx_faqs_active_order'
      AND object_id = OBJECT_ID(N'dbo.Faqs')
)
BEGIN
    CREATE INDEX idx_faqs_active_order
        ON dbo.Faqs(is_active, display_order);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'idx_faqs_category'
      AND object_id = OBJECT_ID(N'dbo.Faqs')
)
BEGIN
    CREATE INDEX idx_faqs_category
        ON dbo.Faqs(category, is_active);
END
GO

-- =====================================================
-- 2. Seed Faqs (only if table empty)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Faqs)
BEGIN
    SET IDENTITY_INSERT dbo.Faqs ON;
    INSERT INTO dbo.Faqs
        (faq_id, question, answer, category, display_order, is_active, is_featured)
    VALUES
        -- DONATIONS
        (1,
         N'How do I make a donation?',
         N'<p>Making a donation is quick and easy:</p><ol><li>Click the "Donate Now" button on any page.</li><li>Choose a cause or campaign to support.</li><li>Enter your donation amount and select a payment method.</li><li>Fill in your card details and submit.</li><li>You will receive a confirmation email with your donation receipt.</li></ol><p>All donations are processed securely via our payment gateway.</p>',
         N'Donations', 1, 1, 1),

        (2,
         N'Is my donation tax-deductible?',
         N'<p>Yes, Give-AID is a registered non-profit organization. For donations within Vietnam, you may be eligible for tax benefits under applicable regulations. Please retain your donation receipt (sent to your email) for tax filing purposes. For international donors, please consult your local tax advisor.</p>',
         N'Donations', 2, 1, 1),

        (3,
         N'Can I donate anonymously?',
         N'<p>Yes, during the donation process you can opt for an anonymous donation. Your name will not be displayed publicly, but your donation will still be counted toward our totals.</p>',
         N'Donations', 3, 1, 0),

        (4,
         N'How is my donation used?',
         N'<p>Every donation is allocated to the cause or campaign you choose. We maintain complete financial transparency — all funds are tracked and reported. After each campaign ends, we publish a detailed report showing how funds were spent.</p>',
         N'Donations', 4, 1, 1),

        -- PROGRAMMES & EVENTS
        (5,
         N'How do I register for a programme?',
         N'<p>Visit the Programmes page, find the programme you are interested in, and click "Register Now". Fill in your motivation message and submit. You will receive a confirmation email. You can track all your registrations in "My Registrations" after logging in.</p>',
         N'Programmes', 5, 1, 1),

        (6,
         N'Can I cancel my programme registration?',
         N'<p>Yes, you can cancel your registration before the programme starts. Go to "My Registrations" in your dashboard and click "Cancel". Please note that cancellation may affect your eligibility for future programmes.</p>',
         N'Programmes', 6, 1, 0),

        (7,
         N'Are programmes free to attend?',
         N'<p>Most of our community programmes are free. Some specialized workshops or training programmes may require a small fee to cover materials. This information is clearly listed on each programme detail page.</p>',
         N'Programmes', 7, 1, 0),

        -- ACCOUNT & SECURITY
        (8,
         N'How do I create an account?',
         N'<p>Click "Register" in the navigation menu. Fill in your username, email, password and full name. After registration, you can log in immediately and start donating or registering for programmes.</p>',
         N'Account', 8, 1, 1),

        (9,
         N'I forgot my password. How do I reset it?',
         N'<p>Currently, password reset is handled by contacting our support team. Please email <a href="mailto:support@give-aid.org">support@give-aid.org</a> with your registered email address and we will assist you.</p>',
         N'Account', 9, 1, 0),

        (10,
         N'Is my personal information secure?',
         N'<p>Absolutely. We use industry-standard encryption for all data transmission. Your payment details are never stored on our servers — all payment processing is handled by certified payment providers. Read our Privacy Policy for full details.</p>',
         N'Account', 10, 1, 1),

        -- VOLUNTEERING
        (11,
         N'Do you accept volunteers?',
         N'<p>Yes! We welcome volunteers in many roles. Please visit our Careers page for volunteer opportunities, or send us a message through our Contact form indicating your skills and availability.</p>',
         N'Volunteering', 11, 1, 1),

        (12,
         N'How can my organization partner with Give-AID?',
         N'<p>We actively seek partnerships with organizations that share our mission. Please visit our "Our Supporters" page to learn about existing partners, then contact us through the form with details about your organization and how you would like to collaborate.</p>',
         N'Volunteering', 12, 1, 0),

        -- GENERAL
        (13,
         N'How can I contact Give-AID?',
         N'<p>You can reach us through:</p><ul><li><strong>Email:</strong> <a href="mailto:info@give-aid.org">info@give-aid.org</a></li><li><strong>Phone:</strong> 1800-123-456 (Mon–Fri, 9am–6pm)</li><li><strong>Contact Form:</strong> Use the form on our Contact page</li><li><strong>Address:</strong> 123 Charity Street, Ho Chi Minh City, Vietnam</li></ul>',
         N'General', 13, 1, 1),

        (14,
         N'Where does Give-AID operate?',
         N'<p>Give-AID primarily operates in Vietnam, with a focus on underserved communities. Through our partner network, we have reach in 25+ countries across Southeast Asia and beyond.</p>',
         N'General', 14, 1, 0);
    SET IDENTITY_INSERT dbo.Faqs OFF;
END
GO

-- =====================================================
-- 3. Seed Help Centre CMS page (idempotent)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM dbo.CmsPages WHERE page_key = 'help_centre')
BEGIN
    INSERT INTO dbo.CmsPages (page_key, page_title, page_slug, content, display_order, is_in_menu)
    VALUES (
        'help_centre',
        'Help Centre',
        'help-centre',
        N'<h2>Help Centre</h2><p>Find answers to common questions about donations, programmes, volunteering and more. If you can''t find what you are looking for, use the contact form to reach our team.</p>',
        9,
        1
    );
END
GO

PRINT 'Help Centre + Contact Management migration completed.';
PRINT 'New table: Faqs (seeded 14 FAQ items)';
PRINT 'Existing tables reused: ContactMessages (public submit + admin reply)';
GO
