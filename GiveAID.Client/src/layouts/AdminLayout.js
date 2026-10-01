import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Dropdown } from 'react-bootstrap';
import './AdminLayout.css';

/* ─────────────────────────────────────────────────
 * AdminLayout
 *   Sidebar  + topbar + content area.
 *   Wraps every /admin/* route. Role guard is enforced
 *   by ProtectedRoute; this component assumes the user
 *   is already Admin.
 * ───────────────────────────────────────────────── */

const NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { to: '/admin', end: true, label: 'Dashboard', icon: 'dashboard' },
    ],
  },
  {
    id: 'fundraising',
    label: 'Fundraising',
    items: [
      { to: '/admin/campaigns', label: 'Campaigns', icon: 'campaign' },
      { to: '/admin/donations', label: 'Donations', icon: 'donate' },
      { to: '/admin/campaign-reports', label: 'Reports', icon: 'report' },
    ],
  },
  {
    id: 'people',
    label: 'People',
    items: [
      { to: '/admin/users', label: 'Users', icon: 'users' },
      { to: '/admin/partners', label: 'Partners & NGOs', icon: 'partners' },
      { to: '/admin/registrations', label: 'Registrations', icon: 'registrations' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { to: '/admin/gallery', label: 'Gallery', icon: 'gallery' },
      { to: '/admin/achievements', label: 'Achievements', icon: 'trophy' },
      { to: '/admin/cms', label: 'CMS Pages', icon: 'cms' },
    ],
  },
  {
    id: 'comms',
    label: 'Communication',
    items: [
      { to: '/admin/queries', label: 'User Queries', icon: 'queries' },
      { to: '/admin/contacts', label: 'Contact Messages', icon: 'contact' },
      { to: '/admin/invitations', label: 'Invitations', icon: 'invite' },
    ],
  },
];

const Icon = ({ name }) => {
  const common = {
    width: 18, height: 18, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9"/>
          <rect x="14" y="3" width="7" height="5"/>
          <rect x="14" y="12" width="7" height="9"/>
          <rect x="3" y="16" width="7" height="5"/>
        </svg>
      );
    case 'campaign':
      return (
        <svg {...common}>
          <path d="M3 11l18-8-8 18-2-8-8-2z"/>
        </svg>
      );
    case 'donate':
      return (
        <svg {...common}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          <line x1="12" y1="8" x2="12" y2="14"/>
          <line x1="9" y1="11" x2="15" y2="11"/>
        </svg>
      );
    case 'report':
      return (
        <svg {...common}>
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
          <line x1="3" y1="20" x2="21" y2="20"/>
        </svg>
      );
    case 'partners':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="4"/>
          <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
          <circle cx="17" cy="9" r="3"/>
          <path d="M17 14a4 4 0 0 1 4 4v2"/>
        </svg>
      );
    case 'gallery':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
      );
    case 'trophy':
      return (
        <svg {...common}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
          <path d="M4 22h16"/>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
        </svg>
      );
    case 'cms':
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
          <line x1="9" y1="17" x2="15" y2="17"/>
        </svg>
      );
    case 'queries':
      return (
        <svg {...common}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      );
    case 'contact':
      return (
        <svg {...common}>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      );
    case 'invite':
      return (
        <svg {...common}>
          <path d="M22 2L11 13"/>
          <path d="M22 2L15 22 11 13 2 9 22 2z"/>
        </svg>
      );
    case 'registrations':
      return (
        <svg {...common}>
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      );
    case 'logout':
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...common}>
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      );
    case 'menu':
      return (
        <svg {...common}>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      );
    case 'bell':
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
      );
    default:
      return null;
  }
};

function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* Close mobile sidebar on route change */
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  /* Lock body scroll when mobile sidebar open */
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleExitAdmin = () => {
    navigate('/dashboard');
  };

  const currentTitle = (() => {
    for (const group of NAV_GROUPS) {
      const item = group.items.find((i) => i.to === location.pathname);
      if (item) return { label: item.label, group: group.label };
    }
    if (location.pathname === '/admin') return { label: 'Dashboard', group: 'Overview' };
    return { label: 'Admin', group: '' };
  })();

  return (
    <div className={`al-shell ${sidebarOpen ? 'is-sidebar-open' : ''}`}>
      {/* ═══ SIDEBAR ═══ */}
      <aside className="al-sidebar" aria-label="Admin navigation">
        <div className="al-brand">
          <img 
            src="/images/branding/Care4Kids_logo_clean.svg" 
            alt="Care4Kids" 
            className="al-brand-logo"
          />
          <span className="al-brand-role">Admin Console</span>
        </div>

        <nav className="al-nav" aria-label="Admin sections">
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="al-nav-group">
              <div className="al-nav-group-label">{group.label}</div>
              <ul className="al-nav-list">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `al-nav-link ${isActive ? 'is-active' : ''}`
                      }
                    >
                      <span className="al-nav-icon"><Icon name={item.icon} /></span>
                      <span className="al-nav-label">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="al-sidebar-foot">
          <button type="button" className="al-side-action" onClick={handleExitAdmin}>
            <span className="al-nav-icon"><Icon name="arrow-right" /></span>
            <span>Back to site</span>
          </button>
        </div>
      </aside>

      {/* ═══ BACKDROP (mobile only) ═══ */}
      {sidebarOpen && (
        <div
          className="al-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ═══ MAIN ═══ */}
      <div className="al-main">
        {/* Topbar */}
        <header className="al-topbar">
          <div className="al-topbar-left">
            <button
              type="button"
              className="al-icon-btn al-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Icon name="menu" />
            </button>
            <div className="al-breadcrumb" aria-label="Current section">
              <span className="al-breadcrumb-group">{currentTitle.group}</span>
              <span className="al-breadcrumb-sep">/</span>
              <span className="al-breadcrumb-current">{currentTitle.label}</span>
            </div>
          </div>

          <div className="al-topbar-right">
            <button type="button" className="al-icon-btn" aria-label="Notifications">
              <Icon name="bell" />
            </button>

            <Dropdown align="end">
              <Dropdown.Toggle as="button" className="al-user-trigger" id="al-user-dd">
                <span className="al-avatar" aria-hidden="true">
                  {(user?.fullName || user?.username || user?.email || 'A')
                    .charAt(0)
                    .toUpperCase()}
                </span>
                <span className="al-user-meta">
                  <span className="al-user-name">{user?.fullName || user?.username || 'Admin'}</span>
                  <span className="al-user-role">{user?.role || 'Admin'}</span>
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu className="al-user-menu">
                <div className="al-user-menu-head">
                  <span className="al-user-name">{user?.fullName || user?.username}</span>
                  <span className="al-user-email">{user?.email}</span>
                </div>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleExitAdmin}>View public site</Dropdown.Item>
                <Dropdown.Item onClick={() => navigate('/dashboard')}>My account</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="al-user-logout">
                  <Icon name="logout" />
                  <span>Sign out</span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </header>

        {/* Content */}
        <main className="al-content">
          <Outlet />
        </main>

        <footer className="al-foot">
          <span>Care4Kids Admin Console · {new Date().getFullYear()}</span>
          <span className="al-foot-sep">·</span>
          <span>v1.0</span>
        </footer>
      </div>
    </div>
  );
}

export default AdminLayout;
