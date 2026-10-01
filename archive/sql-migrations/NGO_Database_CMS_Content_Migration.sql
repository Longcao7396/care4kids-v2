-- =====================================================
-- CMS CONTENT MANAGEMENT — MIGRATION SCRIPT
-- =====================================================
-- Adds / updates CMS pages for editable About Us content
-- and Contact Info. Reuses existing CmsPages table — no
-- new table created.
-- =====================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF DB_NAME() <> N'GiveAIDDB'
    THROW 50000, 'Run this migration against GiveAIDDB only.', 1;
GO

-- =====================================================
-- 1. About Us main page
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM dbo.CmsPages WHERE page_key = 'about_us')
BEGIN
    INSERT INTO dbo.CmsPages (page_key, page_slug, page_title, content, display_order, is_in_menu, is_active)
    VALUES (
        'about_us',
        'about-us',
        'About Give-AID',
        N'<h2>What We Do</h2>
<p>Give-AID is a non-governmental organization dedicated to creating lasting positive change in communities worldwide. Through our various programmes and partnerships, we address critical issues in education, healthcare, child welfare, and community development.</p>

<h3>Our Mission</h3>
<p>To empower vulnerable communities by providing access to quality education, healthcare, and opportunities for sustainable development through transparent and impactful programmes.</p>

<h3>Our Vision</h3>
<p>A world where every individual has equal access to opportunities and resources needed to lead a dignified and fulfilling life, free from poverty and inequality.</p>

<h3>Our Core Values</h3>
<ul>
  <li><strong>Transparency:</strong> We maintain complete transparency in our operations and fund utilization.</li>
  <li><strong>Compassion:</strong> We approach every situation with empathy and genuine care for those we serve.</li>
  <li><strong>Collaboration:</strong> We work together with communities, partners, and donors to create lasting impact.</li>
</ul>

<h3>Our Impact</h3>
<ul>
  <li><strong>500+</strong> Projects Completed</li>
  <li><strong>10,000+</strong> Lives Impacted</li>
  <li><strong>50+</strong> NGO Partners</li>
  <li><strong>25+</strong> Countries Reached</li>
</ul>',
        1, 1, 1);
END
GO

-- =====================================================
-- 2. Contact Info page (structured HTML for the Contact page)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM dbo.CmsPages WHERE page_key = 'contact_info')
BEGIN
    INSERT INTO dbo.CmsPages (page_key, page_slug, page_title, content, display_order, is_in_menu, is_active)
    VALUES (
        'contact_info',
        'contact-info',
        'Contact Information',
        N'<div class="contact-info-block">
  <h3>Give-AID Headquarters</h3>
  <p class="ci-line"><i class="bi bi-geo-alt-fill"></i> 123 Charity Street, District 1, Ho Chi Minh City, Vietnam</p>
  <p class="ci-line"><i class="bi bi-telephone-fill"></i> <a href="tel:1800123456">1800-123-456</a> <span class="ci-meta">(Mon–Fri: 9am–6pm GMT+7)</span></p>
  <p class="ci-line"><i class="bi bi-envelope-fill"></i> <a href="mailto:info@give-aid.org">info@give-aid.org</a></p>
  <p class="ci-line"><i class="bi bi-clock-fill"></i> Monday – Friday: 9:00 AM – 6:00 PM</p>
</div>

<div class="contact-social-block">
  <h4>Follow Us</h4>
  <ul class="ci-social-list">
    <li><i class="bi bi-facebook"></i> facebook.com/giveaid</li>
    <li><i class="bi bi-twitter"></i> twitter.com/giveaid</li>
    <li><i class="bi bi-instagram"></i> instagram.com/giveaid</li>
    <li><i class="bi bi-linkedin"></i> linkedin.com/company/giveaid</li>
    <li><i class="bi bi-youtube"></i> youtube.com/@giveaid</li>
  </ul>
</div>

<div class="contact-response-block">
  <h4>Response Time</h4>
  <p>We aim to respond to all enquiries within <strong>2 business days</strong>. For urgent matters, please call us directly.</p>
</div>',
        2, 0, 1);
END
GO

-- =====================================================
-- 3. Help Centre CMS page (idempotent — already seeded by Task 2)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM dbo.CmsPages WHERE page_key = 'help_centre')
BEGIN
    INSERT INTO dbo.CmsPages (page_key, page_slug, page_title, content, display_order, is_in_menu, is_active)
    VALUES (
        'help_centre',
        'help-centre',
        'Help Centre',
        N'<h2>Help Centre</h2><p>Find answers to common questions about donations, programmes, volunteering and more. If you can''t find what you are looking for, use the contact form to reach our team.</p>',
        3, 1, 1);
END
GO

-- =====================================================
-- 4. Privacy Policy (default boilerplate)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM dbo.CmsPages WHERE page_key = 'privacy_policy')
BEGIN
    INSERT INTO dbo.CmsPages (page_key, page_slug, page_title, content, display_order, is_in_menu, is_active)
    VALUES (
        'privacy_policy',
        'privacy-policy',
        'Privacy Policy',
        N'<h2>Privacy Policy</h2>
<p>Last updated: ' + CONVERT(NVARCHAR(20), GETDATE(), 23) + N'</p>

<h3>1. Information We Collect</h3>
<p>We collect information you provide directly to us when you register, donate, register for programmes, or contact us.</p>

<h3>2. How We Use Your Information</h3>
<p>We use your information to process donations, manage programme registrations, send updates about our impact, and respond to your enquiries.</p>

<h3>3. Data Security</h3>
<p>We use industry-standard encryption (SSL/TLS) to protect data in transit. Payment details are never stored on our servers — all transactions are processed by certified payment providers.</p>

<h3>4. Your Rights</h3>
<p>You have the right to access, correct, or delete your personal data. Contact us at <a href="mailto:info@give-aid.org">info@give-aid.org</a>.</p>

<h3>5. Contact</h3>
<p>For privacy questions, email <a href="mailto:privacy@give-aid.org">privacy@give-aid.org</a>.</p>',
        50, 0, 1);
END
GO

-- =====================================================
-- 5. Terms of Service (default boilerplate)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM dbo.CmsPages WHERE page_key = 'terms_of_service')
BEGIN
    INSERT INTO dbo.CmsPages (page_key, page_slug, page_title, content, display_order, is_in_menu, is_active)
    VALUES (
        'terms_of_service',
        'terms-of-service',
        'Terms of Service',
        N'<h2>Terms of Service</h2>
<p>Last updated: ' + CONVERT(NVARCHAR(20), GETDATE(), 23) + N'</p>

<h3>1. Acceptance</h3>
<p>By accessing Give-AID, you agree to be bound by these Terms of Service.</p>

<h3>2. Donations</h3>
<p>All donations are voluntary and non-refundable unless required by law. We use donations for the purposes described at the time of donation.</p>

<h3>3. User Accounts</h3>
<p>You are responsible for maintaining the confidentiality of your account and password.</p>

<h3>4. Content</h3>
<p>User-generated content (reviews, comments) must not be unlawful, harmful, or infringing.</p>

<h3>5. Limitation of Liability</h3>
<p>Give-AID is not liable for any indirect or consequential damages arising from use of the service.</p>

<h3>6. Changes</h3>
<p>We may update these terms at any time. Continued use constitutes acceptance.</p>',
        51, 0, 1);
END
GO

PRINT 'CMS content management migration completed.';
PRINT 'Seeded/updated pages: about_us, contact_info, help_centre, privacy_policy, terms_of_service';
GO
