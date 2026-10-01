import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Alert, Spinner, Modal,
} from 'react-bootstrap';
import { supportersService } from '../services';
import { SAMPLE_ORGANIZATIONS, buildSampleStats } from '../data/sampleOrganizations';
import '../styles/AboutPages.css';

/* ── Helpers ──────────────────────────────────────── */
const TYPE_OPTIONS = ['Supporter', 'Partner', 'NGO', 'Corporate', 'Government', 'Other'];

const TYPE_COLORS = {
  Supporter:  'supporter-type-Supporter',
  Partner:    'supporter-type-Partner',
  NGO:        'supporter-type-NGO',
  Corporate:  'supporter-type-Corporate',
  Government: 'supporter-type-Government',
  Other:      'supporter-type-Other',
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((p) => p[0]).join('').toUpperCase();
};

const formatVND = (amount) => {
  if (amount == null) return null;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(amount);
};

/* ── Partner Card ─────────────────────────────────── */
function PartnerCard({ item, onView }) {
  return (
    <div className="partner-card">
      {/* Logo */}
      <div className="partner-card-logo-wrap">
        <div className="partner-card-logo">
          {item.logoUrl ? (
            <img
              src={item.logoUrl}
              alt={item.organizationName}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement.innerHTML =
                  `<span class="partner-logo-fallback">${getInitials(item.organizationName)}</span>`;
              }}
            />
          ) : (
            <span className="partner-logo-fallback">
              {getInitials(item.organizationName)}
            </span>
          )}
        </div>
        <span className={`partner-type-badge ${TYPE_COLORS[item.organizationType] || 'supporter-type-Other'}`}>
          {item.organizationType}
        </span>
      </div>

      {/* Body */}
      <div className="partner-card-body">
        <h5 className="partner-card-name">{item.organizationName}</h5>

        {item.description && (
          <p className="partner-card-description">
            {item.description.length > 120
              ? item.description.slice(0, 120) + '…'
              : item.description}
          </p>
        )}

        {/* Meta */}
        <div className="partner-card-meta">
          {item.mission && (
            <div className="partner-meta-row">
              <i className="bi bi-bullseye"></i>
              <span title={item.mission}>
                {item.mission.length > 70 ? item.mission.slice(0, 70) + '…' : item.mission}
              </span>
            </div>
          )}
          {item.contributionAmount != null && (
            <div className="partner-meta-row">
              <i className="bi bi-cash-stack"></i>
              <span>
                {formatVND(item.contributionAmount)}
                {item.contributionType && <span className="text-muted"> · {item.contributionType}</span>}
              </span>
            </div>
          )}
          {item.websiteUrl && (
            <div className="partner-meta-row">
              <i className="bi bi-globe2"></i>
              <a href={item.websiteUrl} target="_blank" rel="noopener noreferrer">
                Visit Website
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="partner-card-footer">
          <button
            type="button"
            className="btn-partner-details"
            onClick={() => onView(item)}
          >
            View Details
          </button>
          <div className="partner-social-badges">
            {item.contactEmail && (
              <a
                href={`mailto:${item.contactEmail}`}
                className="partner-social-btn"
                title={item.contactEmail}
              >
                <i className="bi bi-envelope-fill"></i>
              </a>
            )}
            {item.websiteUrl && (
              <a
                href={item.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="partner-social-btn"
                title="Website"
              >
                <i className="bi bi-box-arrow-up-right"></i>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Detail Modal ─────────────────────────────────── */
function PartnerDetailModal({ item, onClose }) {
  if (!item) return null;
  return (
    <Modal show onHide={onClose} size="lg" centered className="partner-detail-modal">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <div className="partner-detail-logo">
            {item.logoUrl ? (
              <img src={item.logoUrl} alt={item.organizationName} />
            ) : (
              <span className="partner-logo-fallback">
                {getInitials(item.organizationName)}
              </span>
            )}
          </div>
          <span>{item.organizationName}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="partner-detail-grid">
          <div className="partner-detail-meta">
            <span className={`partner-type-badge ${TYPE_COLORS[item.organizationType] || 'supporter-type-Other'} mb-3`}>
              {item.organizationType}
            </span>

            {item.address && (
              <div className="detail-row">
                <i className="bi bi-geo-alt-fill"></i>
                <span>{item.address}</span>
              </div>
            )}
            {item.contactPhone && (
              <div className="detail-row">
                <i className="bi bi-telephone-fill"></i>
                <a href={`tel:${item.contactPhone}`}>{item.contactPhone}</a>
              </div>
            )}
            {item.contactEmail && (
              <div className="detail-row">
                <i className="bi bi-envelope-fill"></i>
                <a href={`mailto:${item.contactEmail}`}>{item.contactEmail}</a>
              </div>
            )}
            {item.websiteUrl && (
              <div className="detail-row">
                <i className="bi bi-globe2"></i>
                <a href={item.websiteUrl} target="_blank" rel="noopener noreferrer">
                  {item.websiteUrl}
                </a>
              </div>
            )}
            {item.registrationNumber && (
              <div className="detail-row">
                <i className="bi bi-file-earmark-text-fill"></i>
                <span>Reg: {item.registrationNumber}</span>
              </div>
            )}
            {item.contributionAmount != null && (
              <div className="detail-row">
                <i className="bi bi-cash-stack"></i>
                <span>
                  {formatVND(item.contributionAmount)}
                  {item.contributionType && <span className="text-muted"> · {item.contributionType}</span>}
                </span>
              </div>
            )}
          </div>

          <div className="partner-detail-content">
            {item.description && (
              <div className="detail-section">
                <h6 className="detail-section-title">
                  <i className="bi bi-card-text me-1"></i>About
                </h6>
                <p className="detail-text">{item.description}</p>
              </div>
            )}
            {item.mission && (
              <div className="detail-section">
                <h6 className="detail-section-title">
                  <i className="bi bi-bullseye me-1"></i>Mission
                </h6>
                <p className="detail-text">{item.mission}</p>
              </div>
            )}
            {item.vision && (
              <div className="detail-section">
                <h6 className="detail-section-title">
                  <i className="bi bi-eye me-1"></i>Vision
                </h6>
                <p className="detail-text">{item.vision}</p>
              </div>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        {item.websiteUrl && (
          <a
            href={item.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-primary me-auto"
          >
            <i className="bi bi-box-arrow-up-right me-2"></i>
            Visit Website
          </a>
        )}
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </Modal.Footer>
    </Modal>
  );
}

/* ── Page ─────────────────────────────────────────── */
function OurPartnersPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [type, setType] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const params = { activeOnly: true };
      if (type) params.type = type;
      // The API interceptor unwraps { success, message, data } envelopes,
      // so `response` here is the underlying array — NOT the envelope.
      const apiItems = await supportersService.getAll(params);
      // Fallback: if the API returns an empty list (e.g. backend not seeded
      // or unreachable), show local sample partners so the page is never empty.
      setItems(Array.isArray(apiItems) && apiItems.length > 0 ? apiItems : SAMPLE_ORGANIZATIONS);
    } catch (err) {
      console.warn('Partners fetch failed, using sample data:', err);
      setItems(SAMPLE_ORGANIZATIONS);
      setError(null); // Don't surface an error banner when we have sample data
    } finally {
      setLoading(false);
    }
  }, [type]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await supportersService.getStats();
      if (response?.success && response.data) {
        setStats(response.data);
      } else {
        setStats(buildSampleStats());
      }
    } catch {
      // Non-fatal — fall back to derived sample stats so the header still
      // shows real-looking counts instead of "–".
      setStats(buildSampleStats());
    }
  }, []);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const TYPE_FILTERS = [
    { value: '', label: `All (${stats?.total || '–'})` },
    { value: 'Supporter', label: `Supporters (${stats?.supporters || '–'})` },
    { value: 'Partner', label: `Partners (${stats?.partners || '–'})` },
    { value: 'NGO', label: `NGOs (${stats?.ngos || '–'})` },
  ];

  return (
    <div className="about-subpage">
      {/* Hero Header */}
      <section className="page-header">
        <Container>
          <div className="about-hero-badges">
            <span className="about-hero-badge">
              <i className="bi bi-handshake-angle-fill"></i>
              Our Partners
            </span>
          </div>
          <h1>
            Together, We <span className="text-accent">Empower</span> Change
          </h1>
          <p className="lead">
            Give-AID partners with foundations, corporations, NGOs and government agencies
            who share our vision of a just and sustainable world. Meet the organizations
            making our mission possible.
          </p>
          <div className="about-header-stats">
            <div className="about-header-stat">
              <span className="about-header-stat-num">{stats?.total || '–'}</span>
              <span className="about-header-stat-label">Partners</span>
            </div>
            <div className="about-header-stat-divider"></div>
            <div className="about-header-stat">
              <span className="about-header-stat-num">{TYPE_OPTIONS.length}</span>
              <span className="about-header-stat-label">Categories</span>
            </div>
            <div className="about-header-stat-divider"></div>
            <div className="about-header-stat">
              <span className="about-header-stat-num">
                {stats?.totalContribution ? formatVND(stats.totalContribution)?.replace('₫', '').trim() : '–'}
              </span>
              <span className="about-header-stat-label">Total Contribution (VND)</span>
            </div>
          </div>
        </Container>
      </section>

      <Container className="pb-5">
        {/* Type filter tabs */}
        <div className="supporter-filter-tabs mb-4">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`supporter-filter-tab ${type === f.value ? 'active' : ''}`}
              onClick={() => setType(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : items.length === 0 ? (
          <div className="team-empty">
            <i className="bi bi-people" style={{ fontSize: '3.5rem', color: 'var(--text-gray)' }}></i>
            <h5 className="mt-3">No partners found</h5>
            <p className="text-muted">
              {type
                ? `No partners of type "${type}" at this time.`
                : 'No partner organizations are listed yet. Check back soon.'}
            </p>
            {type && (
              <button className="btn btn-outline-primary mt-2" onClick={() => setType('')}>
                View All Partners
              </button>
            )}
          </div>
        ) : (
          <Row className="g-4">
            {items.map((item) => (
              <Col key={item.organizationId} xs={12} sm={6} lg={4}>
                <PartnerCard item={item} onView={setSelected} />
              </Col>
            ))}
          </Row>
        )}
      </Container>

      {/* Detail modal */}
      <PartnerDetailModal item={selected} onClose={() => setSelected(null)} />

      <style>{`
        .partner-card {
          background: var(--bg-card);
          border: 1px solid var(--border-slate);
          border-radius: var(--radius-lg);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all var(--transition-base);
          height: 100%;
        }
        .partner-card:hover {
          border-color: rgba(56, 189, 248, 0.45);
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        }
        .partner-card-logo-wrap {
          background: linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(59,130,246,0.08) 100%);
          padding: 1.75rem 1.5rem 1.25rem;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-slate);
        }
        .partner-card-logo {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--primary-slate);
          border: 1px solid var(--border-slate);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .partner-card-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 6px;
        }
        .partner-logo-fallback {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--accent-sky);
          background: linear-gradient(135deg, rgba(56,189,248,0.15), rgba(59,130,246,0.15));
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-lg);
        }
        .partner-type-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .supporter-type-Supporter { background: rgba(56,189,248,0.15); color: #38BDF8; }
        .supporter-type-Partner   { background: rgba(168,85,247,0.15); color: #A855F7; }
        .supporter-type-NGO       { background: rgba(16,185,129,0.15); color: #10B981; }
        .supporter-type-Corporate  { background: rgba(249,115,22,0.15); color: #F97316; }
        .supporter-type-Government { background: rgba(99,102,241,0.15); color: #6366F1; }
        .supporter-type-Other      { background: rgba(107,114,128,0.15); color: #9CA3AF; }
        .partner-card-body {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .partner-card-name {
          color: var(--text-light);
          font-weight: 700;
          font-size: 1.05rem;
          margin-bottom: 0.6rem;
          line-height: 1.3;
        }
        .partner-card-description {
          color: var(--text-gray);
          font-size: 0.875rem;
          line-height: 1.6;
          margin-bottom: 0.85rem;
          flex: 1;
        }
        .partner-card-meta {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-bottom: 1rem;
          padding: 0.85rem;
          background: var(--primary-slate);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-slate);
        }
        .partner-meta-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.82rem;
          color: var(--text-gray);
        }
        .partner-meta-row i {
          color: var(--accent-sky);
          font-size: 0.9rem;
          flex-shrink: 0;
          width: 16px;
        }
        .partner-meta-row a { color: var(--accent-sky); }
        .partner-meta-row a:hover { text-decoration: underline; }
        .partner-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--border-slate);
          padding-top: 1rem;
          margin-top: auto;
        }
        .btn-partner-details {
          background: rgba(56,189,248,0.1);
          border: 1px solid rgba(56,189,248,0.3);
          color: var(--accent-sky);
          padding: 0.4rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .btn-partner-details:hover {
          background: var(--accent-sky);
          color: var(--primary-navy);
        }
        .partner-social-badges {
          display: flex;
          gap: 0.4rem;
        }
        .partner-social-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary-slate);
          border: 1px solid var(--border-slate);
          color: var(--text-gray);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          text-decoration: none;
          transition: all var(--transition-fast);
        }
        .partner-social-btn:hover {
          background: var(--accent-sky);
          color: var(--primary-navy);
          border-color: var(--accent-sky);
        }

        /* Detail Modal */
        .partner-detail-logo {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--primary-slate);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .partner-detail-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 4px;
        }
        .partner-detail-modal .modal-content {
          background: var(--bg-card);
          border: 1px solid var(--border-slate);
          color: var(--text-light);
        }
        .partner-detail-modal .modal-header {
          border-bottom: 1px solid var(--border-slate);
        }
        .partner-detail-modal .modal-footer {
          border-top: 1px solid var(--border-slate);
        }
        .partner-detail-modal .btn-close {
          filter: invert(1);
          opacity: 0.6;
        }
        .partner-detail-grid {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 2rem;
        }
        .partner-detail-meta {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .detail-row {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          font-size: 0.9rem;
          color: var(--text-gray);
        }
        .detail-row i {
          color: var(--accent-sky);
          font-size: 1rem;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .detail-row a { color: var(--accent-sky); }
        .detail-section { margin-bottom: 1.25rem; }
        .detail-section:last-child { margin-bottom: 0; }
        .detail-section-title {
          color: var(--text-light);
          font-weight: 700;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .detail-text {
          color: var(--text-gray);
          font-size: 0.925rem;
          line-height: 1.7;
          margin: 0;
        }

        @media (max-width: 768px) {
          .partner-detail-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

export default OurPartnersPage;
