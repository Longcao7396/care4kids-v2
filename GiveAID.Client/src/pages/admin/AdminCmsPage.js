import React, { useState } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import AdminPageFrame from '../../components/AdminPageFrame';

import TeamAdmin from './TeamAdmin';
import CareersAdmin from './CareersAdmin';
import AchievementsAdmin from './AchievementsAdmin';
import SupportersAdmin from './SupportersAdmin';
import CmsPagesAdmin from './CmsPagesAdmin';
import AdminFaqManager from './AdminFaqManager';
import AdminContactInfo from './AdminContactInfo';
import '../../styles/AboutPages.css';

const TABS = [
  { key: 'overview',     label: 'Overview',          icon: 'bi-speedometer2' },
  { key: 'team',         label: 'Team',              icon: 'bi-people-fill' },
  { key: 'careers',      label: 'Careers',           icon: 'bi-briefcase-fill' },
  { key: 'achievements', label: 'Achievements',      icon: 'bi-trophy-fill' },
  { key: 'supporters',   label: 'Supporters',        icon: 'bi-buildings-fill' },
  { key: 'faqs',         label: 'FAQs',              icon: 'bi-question-circle-fill' },
  { key: 'cms',          label: 'About Pages',       icon: 'bi-file-text-fill' },
  { key: 'contact',      label: 'Contact Info',      icon: 'bi-envelope-fill' },
];

/* ── Overview Tab ────────────────────────────── */
function OverviewTab() {
  return (
    <div>
      <h4 className="text-light mb-3">Content Management Overview</h4>
      <p className="text-muted">
        Welcome to the unified Content Management Center. Use the tabs above to manage
        every editable section of the public website.
      </p>

      <div className="cms-overview-grid">
        {TABS.filter((t) => t.key !== 'overview').map((tab) => (
          <a key={tab.key} href={`#${tab.key}`} className="cms-overview-card" onClick={(e) => {
            e.preventDefault();
            document.dispatchEvent(new CustomEvent('cms-tab-change', { detail: tab.key }));
          }}>
            <div className="cms-overview-icon">
              <i className={`bi ${tab.icon}`}></i>
            </div>
            <div className="cms-overview-title">{tab.label}</div>
            <div className="cms-overview-hint">
              {tab.key === 'team' && 'Add / edit team member profiles'}
              {tab.key === 'careers' && 'Manage job postings and applications'}
              {tab.key === 'achievements' && 'Showcase organisational milestones'}
              {tab.key === 'supporters' && 'Manage partners and supporters'}
              {tab.key === 'faqs' && 'Add / edit Help Centre FAQs'}
              {tab.key === 'cms' && 'Edit About Us main pages content'}
              {tab.key === 'contact' && 'Edit public contact information'}
            </div>
          </a>
        ))}
      </div>

      <style>{`
        .cms-overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .cms-overview-card {
          background: var(--bg-card);
          border: 1px solid var(--border-slate);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          text-decoration: none;
          transition: all var(--transition-base);
          color: var(--text-light);
        }
        .cms-overview-card:hover {
          border-color: rgba(56,189,248,0.4);
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        }
        .cms-overview-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(56,189,248,0.12);
          color: var(--accent-sky);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          margin-bottom: 0.75rem;
        }
        .cms-overview-title {
          font-weight: 700;
          color: var(--text-light);
          margin-bottom: 0.25rem;
        }
        .cms-overview-hint {
          color: var(--text-gray);
          font-size: 0.82rem;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

/* ── Main Admin CMS Page ──────────────────────── */
function AdminCmsPage() {
  const { user } = useAuth();
  const canAccessAdmin = user?.role === 'Admin';
  const [activeTab, setActiveTab] = useState('overview');

  React.useEffect(() => {
    const handler = (e) => setActiveTab(e.detail);
    document.addEventListener('cms-tab-change', handler);
    return () => document.removeEventListener('cms-tab-change', handler);
  }, []);

  if (!canAccessAdmin) {
    return (
      <Container className="py-5">
        <Alert variant="danger">You do not have permission to access this page.</Alert>
      </Container>
    );
  }

  return (
    <AdminPageFrame
      eyebrow="Settings"
      title="Content Management"
      sub="Unified admin panel for every editable section of the public website — About Us, Team, Careers, Achievements, Supporters, FAQs, Contact Info and more."
      tabs={TABS.map((t) => ({ id: t.key, label: t.label, icon: t.icon }))}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
        <div className="cms-tab-content">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'team' && <TeamAdmin />}
          {activeTab === 'careers' && <CareersAdmin />}
          {activeTab === 'achievements' && <AchievementsAdmin />}
          {activeTab === 'supporters' && <SupportersAdmin />}
          {activeTab === 'faqs' && <AdminFaqManager />}
          {activeTab === 'cms' && <CmsPagesAdmin />}
          {activeTab === 'contact' && <AdminContactInfo />}
        </div>

      <style>{`
        .cms-tabs-bar {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem;
          background: var(--bg-card);
          border: 1px solid var(--border-slate);
          border-radius: var(--radius-lg);
          margin-bottom: 1.5rem;
          overflow-x: auto;
          flex-wrap: wrap;
        }
        .cms-tab {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.55rem 1rem;
          border-radius: var(--radius-md);
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-gray);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }
        .cms-tab:hover {
          background: rgba(56,189,248,0.08);
          color: var(--accent-sky);
        }
        .cms-tab.active {
          background: var(--accent-sky);
          color: var(--primary-navy);
        }
        .cms-tab-content {
          min-height: 400px;
        }
      `}</style>
    </AdminPageFrame>
  );
}

export default AdminCmsPage;
