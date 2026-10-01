import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as BsNavbar, Nav, NavDropdown, Container } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

/* ═══════════════════════════════════════════════════════════════
   NAVBAR — Care4Kids
   Dropdown menu:
    • Normal user            → USER menu only (Dashboard, My Donations, etc.)
    • Admin                  → ADMIN menu only (no personal-account items)
   All route protection is handled by ProtectedRoute + backend JWT.
   ═══════════════════════════════════════════════════════════════ */

/* ── Inline SVG icons (consistent stroke style) ── */
const Icon = ({ name, size = 16 }) => {
  const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true };

  switch (name) {
    case 'user':       return <svg {...s}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'donation':   return <svg {...s}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case 'calendar':   return <svg {...s}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case 'chat':       return <svg {...s}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'dashboard':  return <svg {...s}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>;
    case 'shield':     return <svg {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case 'megaphone':  return <svg {...s}><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>;
    case 'chart':      return <svg {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/></svg>;
    case 'wallet':     return <svg {...s}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><path d="M6 16h4"/></svg>;
    case 'org':        return <svg {...s}><circle cx="9" cy="8" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="9" r="3"/><path d="M17 14a4 4 0 0 1 4 4v2"/></svg>;
    case 'image':      return <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>;
    case 'award':      return <svg {...s}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>;
    case 'info':       return <svg {...s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
    case 'mail':       return <svg {...s}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
    case 'file-text':  return <svg {...s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
    case 'message-square': return <svg {...s}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'send':       return <svg {...s}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
    case 'users':      return <svg {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'log-out':    return <svg {...s}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
    case 'settings':   return <svg {...s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case 'chevron-right': return <svg {...s}><polyline points="9 18 15 12 9 6"/></svg>;
    case 'globe':      return <svg {...s}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
    case 'heart':      return <svg {...s}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case 'crown':      return <svg {...s}><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/></svg>;
    default: return null;
  }
};

/* ── Dropdown section header ── */
const SectionHeader = ({ label }) => (
  <div className="c4k-dd-section-header">
    {label}
  </div>
);

/* ── Dropdown item with optional icon ── */
const MenuItem = ({ to, icon, label, badge, onClick, active }) => {
  const className = `c4k-dd-item ${active ? 'is-active' : ''} ${onClick ? 'is-action' : ''}`;
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {icon && <span className="c4k-dd-icon"><Icon name={icon} /></span>}
        <span className="c4k-dd-label">{label}</span>
        {badge && <span className="c4k-dd-badge">{badge}</span>}
      </button>
    );
  }
  return (
    <Link to={to} className={className}>
      {icon && <span className="c4k-dd-icon"><Icon name={icon} /></span>}
      <span className="c4k-dd-label">{label}</span>
      {badge && <span className="c4k-dd-badge">{badge}</span>}
      {icon && <span className="c4k-dd-arrow"><Icon name="chevron-right" size={12} /></span>}
    </Link>
  );
};

/* ── Divider ── */
const Divider = () => <div className="c4k-dd-divider" />;

const Navbar = () => {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await logout(); navigate('/'); }
    catch (e) { console.error('Logout error:', e); }
  };

  const admin = isAdmin; // boolean (was: isAdmin())

  return (
    <BsNavbar expand="lg" className="c4k-navbar" fixed="top">
      <Container className="c4k-navbar-container">

        {/* Brand */}
        <BsNavbar.Brand as={Link} to="/" className="c4k-brand">
          <img 
            src="/images/branding/Care4Kids_logo_clean.svg" 
            alt="Care4Kids" 
            className="c4k-brand-logo"
          />
        </BsNavbar.Brand>

        <BsNavbar.Toggle aria-controls="c4k-nav" className="c4k-toggler" />

        <BsNavbar.Collapse id="c4k-nav">
          <Nav className="ms-auto c4k-nav-list">
            {/* ── Public links ── */}
            <Nav.Link as={Link} to="/" className="c4k-nav-link">Home</Nav.Link>
            <Nav.Link as={Link} to="/campaigns" className="c4k-nav-link">Campaigns</Nav.Link>
            <Nav.Link as={Link} to="/gallery" className="c4k-nav-link">Gallery</Nav.Link>
            <Nav.Link as={Link} to="/about" className="c4k-nav-link">About</Nav.Link>
            <Nav.Link as={Link} to="/about/partners" className="c4k-nav-link">Our Partners</Nav.Link>
            <Nav.Link as={Link} to="/help-centre" className="c4k-nav-link">Help Centre</Nav.Link>
            <Nav.Link as={Link} to="/contact" className="c4k-nav-link">Contact</Nav.Link>

            {/* ── Authenticated — User Menu ── */}
            {isAuthenticated ? (
              <>
                <NavDropdown
                  title={
                    <span className="c4k-dd-trigger-wrap">
                      <span className="c4k-dd-avatar">
                        {(user?.fullName || user?.email || 'A').charAt(0).toUpperCase()}
                      </span>
                      <span className="c4k-dd-trigger-name">
                        {user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Account'}
                      </span>
                    </span>
                  }
                  id="c4k-user-dropdown"
                  className="c4k-nav-dropdown"
                  align="end"
                >
                  {/* ── USER SECTION (only for non-admin users) ── */}
                  {!admin && (
                    <>
                      <SectionHeader label="MY ACCOUNT" />

                      <MenuItem to="/dashboard" icon="dashboard" label="Dashboard" />
                      <MenuItem to="/my-donations" icon="wallet" label="My Donations" />
                      <MenuItem to="/my-registrations" icon="calendar" label="My Registrations" />
                      <MenuItem to="/raise-query" icon="chat" label="Raise a Query" />
                    </>
                  )}

                  {/* ── ADMIN SECTION (only for Admin) ── */}
                  {admin && (
                    <>
                      <Divider />

                      <SectionHeader label="ADMINISTRATION" />
                      <MenuItem to="/admin" icon="shield" label="Admin Dashboard" />

                      <SectionHeader label="CAMPAIGNS" />
                      <MenuItem to="/admin/campaigns" icon="megaphone" label="Campaign Management" />
                      <MenuItem to="/admin/campaign-reports" icon="chart" label="Campaign Reports" />

                      <SectionHeader label="DONATIONS" />
                      <MenuItem to="/admin/donations" icon="donation" label="Donation Management" />

                      <SectionHeader label="ORGANIZATION" />
                      <MenuItem to="/admin/partners" icon="org" label="Partner Management" />
                      <MenuItem to="/admin/users" icon="users" label="User Management" />

                      <SectionHeader label="CONTENT" />
                      <MenuItem to="/admin/gallery" icon="image" label="Gallery Management" />
                      <MenuItem to="/admin/achievements" icon="award" label="Achievements" />
                      <MenuItem to="/admin/contacts" icon="mail" label="Contact Management" />
                      <MenuItem to="/admin/cms" icon="file-text" label="Content Management" />

                      <SectionHeader label="COMMUNICATION" />
                      <MenuItem to="/admin/queries" icon="message-square" label="Queries Management" />
                      <MenuItem to="/admin/invitations" icon="send" label="Invitations" />
                    </>
                  )}

                  <Divider />
                  <MenuItem icon="log-out" label="Logout" onClick={handleLogout} />
                </NavDropdown>

                {/* Donate CTA */}
                <Link to="/donate" className="btn-coral c4k-nav-cta">
                  <Icon name="heart" size={13} />
                  Donate
                </Link>
              </>
            ) : (
              /* ── Guest ── */
              <>
                <Nav.Link as={Link} to="/login" className="c4k-nav-link">Login</Nav.Link>
                <Link to="/register" className="c4k-nav-cta c4k-nav-cta-secondary">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  Register
                </Link>
                <Link to="/donate" className="btn-coral c4k-nav-cta c4k-nav-cta-primary">
                  <Icon name="heart" size={13} />
                  Donate
                </Link>
              </>
            )}
          </Nav>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
};

export default Navbar;
