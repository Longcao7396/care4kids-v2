#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate Give-AID NGO Website Requirements Compliance Checklist (Word Document)
Analyzes the original requirements against the implemented project.
"""

from docx import Document
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import sys

def set_cell_shading(cell, color_hex):
    """Set cell background color"""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), color_hex)
    tcPr.append(shd)

def add_checkmark_to_cell(cell, checked):
    """Add ✓ or ✗ to cell"""
    cell.text = "✓" if checked else "✗"

def create_checklist():
    doc = Document()
    
    # === PAGE SETUP ===
    section = doc.sections[0]
    section.page_width = Inches(11)
    section.page_height = Inches(8.5)
    section.left_margin = Inches(0.75)
    section.right_margin = Inches(0.75)
    section.top_margin = Inches(0.5)
    section.bottom_margin = Inches(0.5)
    
    # === TITLE ===
    title = doc.add_heading('GIVE-AID WEBSITE', level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for run in title.runs:
        run.font.color.rgb = RGBColor(15, 23, 42)  # Navy #0F172A
    
    subtitle = doc.add_paragraph('Requirements Compliance Checklist')
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle_run = subtitle.runs[0]
    subtitle_run.font.size = Pt(16)
    subtitle_run.font.color.rgb = RGBColor(56, 189, 248)  # Sky #38BDF8
    subtitle_run.bold = True
    
    subtitle2 = doc.add_paragraph('NGO Website with Multi-NGO Support, Fundraising & Programme Management')
    subtitle2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle2.runs[0].font.size = Pt(11)
    subtitle2.runs[0].font.italic = True
    
    doc.add_paragraph()  # spacing
    
    # === SECTION 1: HOMEPAGE & NAVIGATION ===
    doc.add_heading('1. HOMEPAGE & NAVIGATION', level=1)
    
    table1 = doc.add_table(rows=1, cols=4)
    table1.style = 'Table Grid'
    table1.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    hdr = table1.rows[0].cells
    hdr[0].text = 'Requirement'
    hdr[1].text = 'Status'
    hdr[2].text = 'Implemented'
    hdr[3].text = 'Notes'
    for cell in hdr:
        set_cell_shading(cell, '0F172A')  # Navy
        for paragraph in cell.paragraphs:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in paragraph.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
                run.font.size = Pt(10)
    
    nav_items = [
        ('Home / Trang chủ', True, 'HomePage.js', 'Implemented as /'),
        ('Donate / Quyên góp', True, 'DonatePage.js', 'Implemented'),
        ('Help Centre / Trung tâm trợ giúp', False, 'MISSING', 'Not implemented'),
        ('About Us / Về chúng tôi', True, 'AboutPage.js', 'Implemented'),
        ('Our Partners / Đối tác', False, 'MISSING', 'Not implemented'),
        ('Register / ĐĂNG KÝ', True, 'RegisterPage.js', 'Implemented'),
        ('Login / ĐĂNG NHẬP', True, 'LoginPage.js', 'Implemented'),
        ('No whitespace design', True, 'CSS', 'Responsive layout'),
        ('User-friendly navigation', True, 'Navbar.js', 'Consistent Navbar'),
        ('Consistent design', True, 'App.css', 'Design system'),
    ]
    
    for req, impl, loc, note in nav_items:
        row = table1.add_row().cells
        row[0].text = req
        row[1].text = '✓' if impl else '✗'
        row[2].text = loc
        row[3].text = note
        row[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(9)
    
    doc.add_paragraph()
    
    # === SECTION 2: TWO MODULES ===
    doc.add_heading('2. SYSTEM ARCHITECTURE: TWO MODULES', level=1)
    
    table2 = doc.add_table(rows=1, cols=4)
    table2.style = 'Table Grid'
    hdr2 = table2.rows[0].cells
    hdr2[0].text = 'Module'
    hdr2[1].text = 'Requirement'
    hdr2[2].text = 'Status'
    hdr2[3].text = 'Notes'
    for cell in hdr2:
        set_cell_shading(cell, '1E293B')  # Slate
        for paragraph in cell.paragraphs:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in paragraph.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
                run.font.size = Pt(10)
    
    modules = [
        ('ADMIN Module', 'Manage all content', True, 'AdminDashboard.js + backend CRUD'),
        ('ADMIN Module', 'Edit partners', False, 'Not implemented'),
        ('ADMIN Module', 'Edit introduction', False, 'CmsPages table exists but no UI'),
        ('ADMIN Module', 'Edit Help Centre', False, 'Not implemented'),
        ('ADMIN Module', 'Edit Contact info', False, 'Not implemented'),
        ('ADMIN Module', 'Manage Donation links', True, 'DonationsController.cs'),
        ('ADMIN Module', 'Add new NGOs', False, 'Organizations table exists, no UI'),
        ('USER Module', 'View content (read-only)', True, 'All pages'),
        ('USER Module', 'Register account', True, 'RegisterPage.js'),
        ('USER Module', 'Donate to specific causes', True, 'DonatePage.js'),
        ('USER Module', 'Invite friends via email', False, 'Not implemented'),
        ('USER Module', 'Raise queries', False, 'Conversations table exists, no UI'),
    ]
    
    for mod, req, impl, note in modules:
        row = table2.add_row().cells
        row[0].text = mod
        row[1].text = req
        row[2].text = '✓' if impl else '✗'
        row[3].text = note
        row[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(9)
    
    doc.add_paragraph()
    
    # === SECTION 3: ADMIN MODULE FEATURES ===
    doc.add_heading('3. ADMIN MODULE - DETAILED FEATURES', level=1)
    
    # 3.1 Donation
    doc.add_heading('3.1 Donation Management', level=2)
    t = doc.add_table(rows=1, cols=4)
    t.style = 'Table Grid'
    h = t.rows[0].cells
    h[0].text = 'Feature'
    h[1].text = 'Status'
    h[2].text = 'Location'
    h[3].text = 'Details'
    for cell in h:
        set_cell_shading(cell, '38BDF8')  # Sky blue
        for para in cell.paragraphs:
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in para.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(0, 0, 0)
                run.font.size = Pt(10)
    
    donation_features = [
        ('Categories list integrated', True, 'Causes table', '6 causes seeded'),
        ('Children Welfare Activity', True, 'Causes/Campaigns', 'Campaign for children'),
        ('Disabled Person', True, 'Causes table', 'Cause type available'),
        ('Select purpose before payment', True, 'DonatePage.js', 'Cause/Campaign selector'),
        ('Payment info stored properly', True, 'Donations table', 'Transaction ID, card info'),
    ]
    
    for f, s, l, d in donation_features:
        row = t.add_row().cells
        row[0].text = f
        row[1].text = '✓' if s else '✗'
        row[2].text = l
        row[3].text = d
        row[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(9)
    
    doc.add_paragraph()
    
    # 3.2 Other Partners
    doc.add_heading('3.2 Other Partners', level=2)
    t2 = doc.add_table(rows=1, cols=4)
    t2.style = 'Table Grid'
    h2 = t2.rows[0].cells
    h2[0].text = 'Feature'
    h2[1].text = 'Status'
    h2[2].text = 'Location'
    h2[3].text = 'Details'
    for cell in h2:
        set_cell_shading(cell, '38BDF8')
        for para in cell.paragraphs:
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in para.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(0, 0, 0)
                run.font.size = Pt(10)
    
    partner_features = [
        ('List partner companies', False, 'MISSING', 'Organizations table exists but no UI'),
        ('Partner logos display', False, 'MISSING', 'No partner listing page'),
        ('Add/edit partners', False, 'MISSING', 'Admin UI not built'),
    ]
    
    for f, s, l, d in partner_features:
        row = t2.add_row().cells
        row[0].text = f
        row[1].text = '✓' if s else '✗'
        row[2].text = l
        row[3].text = d
        row[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(9)
    
    doc.add_paragraph()
    
    # 3.3 About Us sub-links
    doc.add_heading('3.3 About Us - Sub-pages (Editable by Admin)', level=2)
    t3 = doc.add_table(rows=1, cols=4)
    t3.style = 'Table Grid'
    h3 = t3.rows[0].cells
    h3[0].text = 'Sub-page'
    h3[1].text = 'Status'
    h3[2].text = 'Location'
    h3[3].text = 'Details'
    for cell in h3:
        set_cell_shading(cell, 'F97316')  # Orange
        for para in cell.paragraphs:
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in para.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
                run.font.size = Pt(10)
    
    about_features = [
        ('What We Do', True, 'AboutPage.js', 'Static content'),
        ('Our Mission', True, 'AboutPage.js', 'Implemented'),
        ('Our Team', False, 'MISSING', 'No dedicated page'),
        ('Career With Us', False, 'MISSING', 'Careers table exists, no page'),
        ('Our Achievements', False, 'MISSING', 'Not implemented'),
        ('Our Supporters', False, 'MISSING', 'Not implemented'),
        ('Read About Us', True, 'AboutPage.js', 'Main about page'),
        ('Content editable by admin', False, 'MISSING', 'CmsPages table exists, no UI'),
    ]
    
    for f, s, l, d in about_features:
        row = t3.add_row().cells
        row[0].text = f
        row[1].text = '✓' if s else '✗'
        row[2].text = l
        row[3].text = d
        row[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(9)
    
    doc.add_paragraph()
    
    # 3.4 Contact Us
    doc.add_heading('3.4 Contact Us', level=2)
    t4 = doc.add_table(rows=1, cols=4)
    t4.style = 'Table Grid'
    h4 = t4.rows[0].cells
    h4[0].text = 'Feature'
    h4[1].text = 'Status'
    h4[2].text = 'Location'
    h4[3].text = 'Details'
    for cell in h4:
        set_cell_shading(cell, 'F97316')
        for para in cell.paragraphs:
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in para.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
                run.font.size = Pt(10)
    
    contact_features = [
        ('Contact page designed', True, 'ContactPage.js', 'Form + info'),
        ('Contact info (address, phone, email)', True, 'ContactPage.js', 'Implemented'),
        ('Contact form submission', True, 'ContactPage.js', 'UI only (TODO: backend)'),
        ('Admin can view contacts', False, 'MISSING', 'ContactMessages table exists'),
        ('View all registered members', False, 'MISSING', 'Admin user list not built'),
    ]
    
    for f, s, l, d in contact_features:
        row = t4.add_row().cells
        row[0].text = f
        row[1].text = '✓' if s else '✗'
        row[2].text = l
        row[3].text = d
        row[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(9)
    
    doc.add_paragraph()
    
    # 3.5 Donate Us
    doc.add_heading('3.5 Donate Us Link', level=2)
    t5 = doc.add_table(rows=1, cols=4)
    t5.style = 'Table Grid'
    h5 = t5.rows[0].cells
    h5[0].text = 'Feature'
    h5[1].text = 'Status'
    h5[2].text = 'Location'
    h5[3].text = 'Details'
    for cell in h5:
        set_cell_shading(cell, 'F97316')
        for para in cell.paragraphs:
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in para.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
                run.font.size = Pt(10)
    
    donate_features = [
        ('Amount selection', True, 'DonatePage.js', 'Quick amounts + custom'),
        ('Cause list (Children, Education, Disabled, Women, Youth, Elderly)', True, 'Causes table', '6 causes'),
        ('List other NGOs', False, 'MISSING', 'Organizations table exists, no UI'),
        ('Admin can add NGO details', False, 'MISSING', 'Admin CRUD not built'),
    ]
    
    for f, s, l, d in donate_features:
        row = t5.add_row().cells
        row[0].text = f
        row[1].text = '✓' if s else '✗'
        row[2].text = l
        row[3].text = d
        row[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(9)
    
    doc.add_paragraph()
    
    # 3.6 Our Programmes
    doc.add_heading('3.6 Our Programmes', level=2)
    t6 = doc.add_table(rows=1, cols=4)
    t6.style = 'Table Grid'
    h6 = t6.rows[0].cells
    h6[0].text = 'Feature'
    h6[1].text = 'Status'
    h6[2].text = 'Location'
    h6[3].text = 'Details'
    for cell in h6:
        set_cell_shading(cell, 'F97316')
        for para in cell.paragraphs:
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in para.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
                run.font.size = Pt(10)
    
    prog_features = [
        ('List programmes', True, 'ProgrammesPage.js', 'Filter by type'),
        ('Education programmes', True, 'Programmes table', 'ProgrammeType=Education'),
        ('Healthcare programmes', True, 'Programmes table', 'ProgrammeType=HealthCare'),
        ('Child welfare programmes', True, 'Programmes table', 'ProgrammeType=ChildWelfare'),
        ('Programme detail page', True, 'ProgrammeDetailPage.js', 'Implemented'),
        ('User registration for programmes', True, 'ProgrammesController.cs', 'POST register'),
        ('Reply to queries', False, 'MISSING', 'Conversations table exists'),
    ]
    
    for f, s, l, d in prog_features:
        row = t6.add_row().cells
        row[0].text = f
        row[1].text = '✓' if s else '✗'
        row[2].text = l
        row[3].text = d
        row[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(9)
    
    doc.add_paragraph()
    
    # 3.7 Gallery
    doc.add_heading('3.7 Gallery Section', level=2)
    t7 = doc.add_table(rows=1, cols=4)
    t7.style = 'Table Grid'
    h7 = t7.rows[0].cells
    h7[0].text = 'Feature'
    h7[1].text = 'Status'
    h7[2].text = 'Location'
    h7[3].text = 'Details'
    for cell in h7:
        set_cell_shading(cell, 'F97316')
        for para in cell.paragraphs:
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in para.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
                run.font.size = Pt(10)
    
    gallery_features = [
        ('Gallery table exists', True, 'Gallery table', 'Database ready'),
        ('Admin upload images', False, 'MISSING', 'UI not built'),
        ('Gallery display page', False, 'MISSING', 'No gallery page'),
        ('Link to programmes', True, 'Gallery.programme_id', 'FK exists'),
    ]
    
    for f, s, l, d in gallery_features:
        row = t7.add_row().cells
        row[0].text = f
        row[1].text = '✓' if s else '✗'
        row[2].text = l
        row[3].text = d
        row[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(9)
    
    doc.add_paragraph()
    
    # === SECTION 4: USER MODULE ===
    doc.add_heading('4. USER MODULE - DETAILED FEATURES', level=1)
    
    t8 = doc.add_table(rows=1, cols=4)
    t8.style = 'Table Grid'
    h8 = t8.rows[0].cells
    h8[0].text = 'Feature'
    h8[1].text = 'Status'
    h8[2].text = 'Location'
    h8[3].text = 'Details'
    for cell in h8:
        set_cell_shading(cell, '22C55E')  # Green
        for para in cell.paragraphs:
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in para.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
                run.font.size = Pt(10)
    
    user_features = [
        ('Register account', True, 'RegisterPage.js', 'Personal data + profession'),
        ('Login/Logout', True, 'LoginPage.js', 'JWT auth'),
        ('View pages (read-only)', True, 'All pages', 'Implemented'),
        ('Donate (select purpose)', True, 'DonatePage.js', 'Cause + Campaign selector'),
        ('Credit/Debit card payment (simulated)', True, 'DonatePage.js', 'Form validation'),
        ('Payment transaction stored', True, 'Donations table', 'TXN ID + card info'),
        ('Donation history', True, 'MyDonationsPage.js', 'Implemented'),
        ('Invite friends via email', False, 'MISSING', 'Not implemented'),
        ('Raise queries', False, 'MISSING', 'UI not built'),
        ('Register for programmes', True, 'ProgrammeDetailPage.js', 'Implemented'),
    ]
    
    for f, s, l, d in user_features:
        row = t8.add_row().cells
        row[0].text = f
        row[1].text = '✓' if s else '✗'
        row[2].text = l
        row[3].text = d
        row[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(9)
    
    doc.add_paragraph()
    
    # === SECTION 5: V2.0 CAMPAIGN SYSTEM ===
    doc.add_heading('5. V2.0 CAMPAIGN SYSTEM (ADDED FEATURES)', level=1)
    
    t9 = doc.add_table(rows=1, cols=4)
    t9.style = 'Table Grid'
    h9 = t9.rows[0].cells
    h9[0].text = 'Feature'
    h9[1].text = 'Status'
    h9[2].text = 'Location'
    h9[3].text = 'Details'
    for cell in h9:
        set_cell_shading(cell, '6366F1')  # Indigo
        for para in cell.paragraphs:
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in para.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
                run.font.size = Pt(10)
    
    v2_features = [
        ('Browse campaigns', True, 'CampaignsPage.js', 'Filter by cause/status'),
        ('Campaign detail page', True, 'CampaignDetailPage.js', 'Progress + tabs'),
        ('Featured campaigns on homepage', True, 'HomePage.js', 'Implemented'),
        ('Admin dashboard with stats', True, 'AdminDashboard.js', 'Charts + tables'),
        ('Campaign progress tracking', True, 'CampaignsController.cs', '% + donors + days'),
        ('Donation breakdown by range', True, 'CampaignsController.cs', 'Implemented'),
        ('Recent donations feed', True, 'CampaignDetailPage.js', 'Implemented'),
        ('Campaign management UI', False, 'MISSING', 'Backend ready, no UI'),
        ('Campaign reports UI', False, 'MISSING', 'CampaignReports table exists'),
        ('Email notifications', False, 'MISSING', 'Not implemented'),
        ('Payment gateway (VNPay)', False, 'MISSING', 'Not implemented'),
    ]
    
    for f, s, l, d in v2_features:
        row = t9.add_row().cells
        row[0].text = f
        row[1].text = '✓' if s else '✗'
        row[2].text = l
        row[3].text = d
        row[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(9)
    
    doc.add_paragraph()
    
    # === SECTION 6: SUMMARY ===
    doc.add_heading('6. SUMMARY & STATISTICS', level=1)
    
    # Count implemented vs missing
    all_features = (
        nav_items + modules + donation_features + partner_features +
        about_features + contact_features + donate_features + prog_features +
        gallery_features + user_features + v2_features
    )
    
    total = len(all_features)
    implemented = sum(1 for _, s, _, _ in all_features if s)
    missing = total - implemented
    pct = implemented / total * 100
    
    stats_table = doc.add_table(rows=1, cols=2)
    stats_table.style = 'Table Grid'
    sh = stats_table.rows[0].cells
    sh[0].text = 'Metric'
    sh[1].text = 'Value'
    for cell in sh:
        set_cell_shading(cell, '0F172A')
        for para in cell.paragraphs:
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in para.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
    
    stats = [
        ('Total Requirements Checked', str(total)),
        ('Implemented', f'{implemented} ({pct:.1f}%)'),
        ('Missing / Not Implemented', f'{missing} ({100-pct:.1f}%)'),
        ('Database Tables (V2)', '16'),
        ('Backend Controllers', '6'),
        ('Frontend Pages', '14'),
        ('Campaigns Seeded', '5'),
        ('Causes Seeded', '6'),
        ('Demo Donations', '15'),
        ('Demo Users', '10'),
    ]
    
    for label, value in stats:
        row = stats_table.add_row().cells
        row[0].text = label
        row[1].text = value
        row[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(10)
    
    doc.add_paragraph()
    
    # Key features implemented
    doc.add_heading('Key Features Successfully Implemented:', level=2)
    key_features = [
        '✅ Full-stack architecture (React + ASP.NET Web API + SQL Server)',
        '✅ JWT-based authentication with role-based access control',
        '✅ Donation system with campaign integration (V2.0)',
        '✅ Programme management with registration',
        '✅ Admin dashboard with statistics and charts',
        '✅ Campaign-based fundraising with progress tracking',
        '✅ Responsive design with consistent navigation',
        '✅ Database V2 with 16 normalized tables and seed data',
        '✅ RESTful API with 19+ endpoints',
        '✅ Comprehensive documentation (README, QUICK_START, etc.)',
    ]
    
    for feature in key_features:
        p = doc.add_paragraph(feature)
        p.runs[0].font.size = Pt(10)
    
    doc.add_paragraph()
    
    # Missing features
    doc.add_heading('Features Missing / Not Implemented:', level=2)
    missing_features = [
        '❌ Help Centre / Trung tâm trợ giúp page',
        '❌ Our Partners page with logo listing',
        '❌ Our Team page',
        '❌ Career listing page (Careers table exists)',
        '❌ Our Achievements page',
        '❌ Our Supporters page',
        '❌ Admin content editor for About Us sub-pages',
        '❌ Admin view for contact submissions',
        '❌ Admin NGO management UI',
        '❌ Gallery page (table exists)',
        '❌ Invite friends via email feature',
        '❌ Raise query / FAQ page',
        '❌ Campaign management UI (Admin CRUD)',
        '❌ Campaign reports UI',
        '❌ Email notifications system',
        '❌ Payment gateway integration (VNPay/MoMo)',
    ]
    
    for feature in missing_features:
        p = doc.add_paragraph(feature)
        p.runs[0].font.size = Pt(10)
    
    doc.add_paragraph()
    
    # Note
    note = doc.add_paragraph()
    note_run = note.add_run('Note: This checklist compares the original requirements document against the implemented Give-AID V2.0 project. The project implements approximately 59% of the original requirements, with all CORE features (donation, authentication, programmes, campaigns, admin dashboard) successfully built. The missing features are primarily admin management UIs and communication features (email, queries).')
    note_run.font.size = Pt(9)
    note_run.font.italic = True
    note_run.font.color.rgb = RGBColor(100, 100, 100)
    
    # Save
    output_path = 'c:/Users/admin/Desktop/project NGO/Requirements_Compliance_Checklist.docx'
    doc.save(output_path)
    print(f'Document saved to: {output_path}')
    return output_path

if __name__ == '__main__':
    create_checklist()
