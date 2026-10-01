-- =====================================================
-- CARE4KIDS — HELP CENTRE / FAQ SEED
-- =====================================================
-- Purpose:  Replace the 14 legacy "Give-AID" FAQs with Care4Kids-branded
--           FAQs on the public Help Centre page (frontend: /help-centre,
--           API: GET /api/faqs, GET /api/faqs/categories).
--
-- Target table:  dbo.Faqs
-- Source schema: NGO_Database_HelpCentre_Migration.sql (UNCHANGED)
--
-- Safety:
--   * NEVER deletes rows from dbo.Faqs
--   * Existing rows are UPDATED in place (matched on faq_id 1–14) so any
--     foreign key referencing faq_id is preserved
--   * Rows whose faq_id is missing are INSERTED with IDENTITY_INSERT
--   * Idempotent — running multiple times converges on the same state
--   * Wrapped in a transaction so partial failures roll back cleanly
--
-- Run with:  SSMS → New Query → select GiveAIDDB → Execute
-- =====================================================

USE GiveAIDDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF DB_NAME() <> N'GiveAIDDB'
    THROW 50000, 'Run this seed against GiveAIDDB only.', 1;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    -- =====================================================
    -- STEP 1: UPDATE legacy Give-AID FAQs in place (if they exist).
    --         Match on faq_id; never touches rows whose id we did not seed.
    -- =====================================================

    -- FAQ 1 — Donations
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 1)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'How do I make a donation to Care4Kids?',
            answer   = N'<p>Making a donation to <strong>Care4Kids</strong> is quick and secure. Visit our <a href="/donate">Donate</a> page, choose an amount that feels right for you, and complete the payment form. We accept credit cards, debit cards and local bank transfer.</p><p>Every donation — large or small — goes directly towards food, education, healthcare and safe shelter for vulnerable children across Vietnam.</p>',
            category = N'Donations',
            display_order = 1,
            is_active = 1,
            is_featured = 1,
            updated_at = GETDATE()
        WHERE faq_id = 1;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (1, N'How do I make a donation to Care4Kids?',
                N'<p>Making a donation to <strong>Care4Kids</strong> is quick and secure. Visit our <a href="/donate">Donate</a> page, choose an amount that feels right for you, and complete the payment form. We accept credit cards, debit cards and local bank transfer.</p><p>Every donation — large or small — goes directly towards food, education, healthcare and safe shelter for vulnerable children across Vietnam.</p>',
                N'Donations', 1, 1, 1, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    -- FAQ 2 — Donations
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 2)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'Is my donation to Care4Kids tax-deductible?',
            answer   = N'<p>Yes. Care4Kids is a registered non-profit organization in Vietnam. Official donation receipts are issued for every contribution above 100,000 VND and can be used to support your tax declaration according to local regulations.</p>',
            category = N'Donations',
            display_order = 2,
            is_active = 1,
            is_featured = 1,
            updated_at = GETDATE()
        WHERE faq_id = 2;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (2, N'Is my donation to Care4Kids tax-deductible?',
                N'<p>Yes. Care4Kids is a registered non-profit organization in Vietnam. Official donation receipts are issued for every contribution above 100,000 VND and can be used to support your tax declaration according to local regulations.</p>',
                N'Donations', 2, 1, 1, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    -- FAQ 3 — Donations
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 3)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'Can I donate anonymously?',
            answer   = N'<p>Yes. During the donation flow you can tick the "Donate anonymously" option and your name will not appear on public donor lists or in campaign reports. The transaction itself is still recorded for financial transparency.</p>',
            category = N'Donations',
            display_order = 3,
            is_active = 1,
            is_featured = 0,
            updated_at = GETDATE()
        WHERE faq_id = 3;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (3, N'Can I donate anonymously?',
                N'<p>Yes. During the donation flow you can tick the "Donate anonymously" option and your name will not appear on public donor lists or in campaign reports. The transaction itself is still recorded for financial transparency.</p>',
                N'Donations', 3, 1, 0, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    -- FAQ 4 — Donations
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 4)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'How is my donation used?',
            answer   = N'<p>Every donation to Care4Kids is allocated to the cause or campaign you choose. We publish a financial report for every active campaign showing exactly how funds were spent — including food purchases, school kits, medical supplies and shelter improvements.</p><p>You can read our latest <a href="/campaigns">Campaign Reports</a> at any time.</p>',
            category = N'Donations',
            display_order = 4,
            is_active = 1,
            is_featured = 1,
            updated_at = GETDATE()
        WHERE faq_id = 4;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (4, N'How is my donation used?',
                N'<p>Every donation to Care4Kids is allocated to the cause or campaign you choose. We publish a financial report for every active campaign showing exactly how funds were spent — including food purchases, school kits, medical supplies and shelter improvements.</p><p>You can read our latest <a href="/campaigns">Campaign Reports</a> at any time.</p>',
                N'Donations', 4, 1, 1, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    -- FAQ 5 — Programmes
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 5)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'How do I register for a Care4Kids programme?',
            answer   = N'<p>Visit the <a href="/programmes">Programmes</a> page, find the programme that interests you, and click "Register". You will need a free Care4Kids account. After registering you can track your participation, attendance and impact updates from your dashboard.</p>',
            category = N'Programmes',
            display_order = 5,
            is_active = 1,
            is_featured = 1,
            updated_at = GETDATE()
        WHERE faq_id = 5;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (5, N'How do I register for a Care4Kids programme?',
                N'<p>Visit the <a href="/programmes">Programmes</a> page, find the programme that interests you, and click "Register". You will need a free Care4Kids account. After registering you can track your participation, attendance and impact updates from your dashboard.</p>',
                N'Programmes', 5, 1, 1, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    -- FAQ 6 — Programmes
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 6)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'Can I cancel my programme registration?',
            answer   = N'<p>Yes. You can cancel any registration before the programme starts from your <a href="/my-registrations">My Registrations</a> page. If the programme has already begun, please contact our team so we can release your slot to another volunteer.</p>',
            category = N'Programmes',
            display_order = 6,
            is_active = 1,
            is_featured = 0,
            updated_at = GETDATE()
        WHERE faq_id = 6;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (6, N'Can I cancel my programme registration?',
                N'<p>Yes. You can cancel any registration before the programme starts from your <a href="/my-registrations">My Registrations</a> page. If the programme has already begun, please contact our team so we can release your slot to another volunteer.</p>',
                N'Programmes', 6, 1, 0, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    -- FAQ 7 — Programmes
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 7)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'Are Care4Kids programmes free to attend?',
            answer   = N'<p>Most of our community programmes (tutoring, story-time, weekend activities) are free for both children and volunteers. Some specialised events — like training workshops — may charge a small materials fee, which is always clearly listed on the programme page.</p>',
            category = N'Programmes',
            display_order = 7,
            is_active = 1,
            is_featured = 0,
            updated_at = GETDATE()
        WHERE faq_id = 7;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (7, N'Are Care4Kids programmes free to attend?',
                N'<p>Most of our community programmes (tutoring, story-time, weekend activities) are free for both children and volunteers. Some specialised events — like training workshops — may charge a small materials fee, which is always clearly listed on the programme page.</p>',
                N'Programmes', 7, 1, 0, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    -- FAQ 8 — Account
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 8)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'How do I create a Care4Kids account?',
            answer   = N'<p>Click <strong>Register</strong> in the top navigation, fill in your name, email and a password, and you are ready. An account lets you donate, register for programmes, track your contributions and invite friends to support our work.</p>',
            category = N'Account',
            display_order = 8,
            is_active = 1,
            is_featured = 1,
            updated_at = GETDATE()
        WHERE faq_id = 8;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (8, N'How do I create a Care4Kids account?',
                N'<p>Click <strong>Register</strong> in the top navigation, fill in your name, email and a password, and you are ready. An account lets you donate, register for programmes, track your contributions and invite friends to support our work.</p>',
                N'Account', 8, 1, 1, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    -- FAQ 9 — Account
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 9)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'I forgot my password. How do I reset it?',
            answer   = N'<p>On the <a href="/login">Login</a> page, click "Forgot password" and enter the email address on your account. You will receive a secure reset link within a few minutes. If you do not see the email, please check your spam folder or contact our support team.</p>',
            category = N'Account',
            display_order = 9,
            is_active = 1,
            is_featured = 0,
            updated_at = GETDATE()
        WHERE faq_id = 9;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (9, N'I forgot my password. How do I reset it?',
                N'<p>On the <a href="/login">Login</a> page, click "Forgot password" and enter the email address on your account. You will receive a secure reset link within a few minutes. If you do not see the email, please check your spam folder or contact our support team.</p>',
                N'Account', 9, 1, 0, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    -- FAQ 10 — Account
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 10)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'Is my personal information secure?',
            answer   = N'<p>Absolutely. Care4Kids uses industry-standard encryption (HTTPS, TLS 1.2+) for all data in transit and at rest. We never sell or share your personal data with third parties. You can review our full <a href="/privacy">Privacy Policy</a> for details.</p>',
            category = N'Account',
            display_order = 10,
            is_active = 1,
            is_featured = 1,
            updated_at = GETDATE()
        WHERE faq_id = 10;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (10, N'Is my personal information secure?',
                N'<p>Absolutely. Care4Kids uses industry-standard encryption (HTTPS, TLS 1.2+) for all data in transit and at rest. We never sell or share your personal data with third parties. You can review our full <a href="/privacy">Privacy Policy</a> for details.</p>',
                N'Account', 10, 1, 1, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    -- FAQ 11 — Volunteering
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 11)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'Does Care4Kids accept volunteers?',
            answer   = N'<p>Yes! We welcome volunteers for tutoring, meal service, weekend activities, photography, translation and professional skills (medical, legal, accounting). Sign up via the <a href="/programmes">Programmes</a> page or send us a short intro through the <a href="/contact">Contact</a> form.</p>',
            category = N'Volunteering',
            display_order = 11,
            is_active = 1,
            is_featured = 1,
            updated_at = GETDATE()
        WHERE faq_id = 11;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (11, N'Does Care4Kids accept volunteers?',
                N'<p>Yes! We welcome volunteers for tutoring, meal service, weekend activities, photography, translation and professional skills (medical, legal, accounting). Sign up via the <a href="/programmes">Programmes</a> page or send us a short intro through the <a href="/contact">Contact</a> form.</p>',
                N'Volunteering', 11, 1, 1, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    -- FAQ 12 — Volunteering
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 12)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'How can my organization partner with Care4Kids?',
            answer   = N'<p>We actively seek partnerships with organizations that share our mission of supporting children. Please send a brief introduction — including your area of focus, region and what you would like to contribute — to <a href="mailto:partners@care4kids.example.org">partners@care4kids.example.org</a> and our partnerships team will respond within 5 working days.</p>',
            category = N'Volunteering',
            display_order = 12,
            is_active = 1,
            is_featured = 0,
            updated_at = GETDATE()
        WHERE faq_id = 12;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (12, N'How can my organization partner with Care4Kids?',
                N'<p>We actively seek partnerships with organizations that share our mission of supporting children. Please send a brief introduction — including your area of focus, region and what you would like to contribute — to <a href="mailto:partners@care4kids.example.org">partners@care4kids.example.org</a> and our partnerships team will respond within 5 working days.</p>',
                N'Volunteering', 12, 1, 0, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    -- FAQ 13 — Child Welfare
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 13)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'Who are the children that Care4Kids supports?',
            answer   = N'<p>Care4Kids works with children living in care homes, children from low-income families, and children in remote provinces where access to nutrition, education and healthcare is limited. Every child we serve is registered with a local partner organization and our impact is tracked quarterly in published campaign reports.</p>',
            category = N'Child Welfare',
            display_order = 13,
            is_active = 1,
            is_featured = 1,
            updated_at = GETDATE()
        WHERE faq_id = 13;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (13, N'Who are the children that Care4Kids supports?',
                N'<p>Care4Kids works with children living in care homes, children from low-income families, and children in remote provinces where access to nutrition, education and healthcare is limited. Every child we serve is registered with a local partner organization and our impact is tracked quarterly in published campaign reports.</p>',
                N'Child Welfare', 13, 1, 1, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    -- FAQ 14 — General
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 14)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'How can I contact the Care4Kids team?',
            answer   = N'<p>You can reach us through our <a href="/contact">Contact form</a>, by email at <a href="mailto:hello@care4kids.example.org">hello@care4kids.example.org</a>, or by phone during business hours (Mon–Fri, 9:00–17:00 GMT+7). For urgent child-welfare concerns, please mention "URGENT" in the subject line and our safeguarding officer will respond within 24 hours.</p>',
            category = N'General',
            display_order = 14,
            is_active = 1,
            is_featured = 1,
            updated_at = GETDATE()
        WHERE faq_id = 14;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (14, N'How can I contact the Care4Kids team?',
                N'<p>You can reach us through our <a href="/contact">Contact form</a>, by email at <a href="mailto:hello@care4kids.example.org">hello@care4kids.example.org</a>, or by phone during business hours (Mon–Fri, 9:00–17:00 GMT+7). For urgent child-welfare concerns, please mention "URGENT" in the subject line and our safeguarding officer will respond within 24 hours.</p>',
                N'General', 14, 1, 1, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    -- FAQ 15 — Child Welfare (additional)
    IF EXISTS (SELECT 1 FROM dbo.Faqs WHERE faq_id = 15)
    BEGIN
        UPDATE dbo.Faqs SET
            question = N'How does Care4Kids protect children''s privacy and safety?',
            answer   = N'<p>Every photo and story we publish is reviewed by our safeguarding officer. We never publish identifying details (full name, specific care-home address, school name) without written consent from the guardian. All field staff and volunteers must complete our child-protection training before working directly with children.</p>',
            category = N'Child Welfare',
            display_order = 15,
            is_active = 1,
            is_featured = 0,
            updated_at = GETDATE()
        WHERE faq_id = 15;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.Faqs ON;
        INSERT INTO dbo.Faqs (faq_id, question, answer, category, display_order, is_active, is_featured, view_count, created_at, updated_at)
        VALUES (15, N'How does Care4Kids protect children''s privacy and safety?',
                N'<p>Every photo and story we publish is reviewed by our safeguarding officer. We never publish identifying details (full name, specific care-home address, school name) without written consent from the guardian. All field staff and volunteers must complete our child-protection training before working directly with children.</p>',
                N'Child Welfare', 15, 1, 0, 0, GETDATE(), GETDATE());
        SET IDENTITY_INSERT dbo.Faqs OFF;
    END

    COMMIT TRANSACTION;

    PRINT '──────────────────────────────────────────────────';
    PRINT 'Care4Kids FAQ seed completed.';
    PRINT 'Updated / inserted 15 FAQs across 5 categories:';
    PRINT '  - Donations       (1-4)';
    PRINT '  - Programmes      (5-7)';
    PRINT '  - Account         (8-10)';
    PRINT '  - Volunteering    (11-12)';
    PRINT '  - Child Welfare   (13, 15)';
    PRINT '  - General         (14)';
    PRINT '──────────────────────────────────────────────────';
    PRINT '';
    PRINT 'Verify with:';
    PRINT '  SELECT faq_id, category, is_active, is_featured, LEFT(question, 60) AS question';
    PRINT '  FROM dbo.Faqs ORDER BY display_order;';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DECLARE @msg NVARCHAR(MAX) = ERROR_MESSAGE();
    RAISERROR(@msg, 16, 1);
END CATCH
GO
