import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import api from '../services/api';
import '../styles/AboutPages.css';

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'Supporter', label: 'Supporters' },
  { value: 'Partner', label: 'Partners' },
  { value: 'NGO', label: 'NGOs' },
];

const formatVND = (amount) => {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function SupporterCard({ item }) {
  return (
    <div className="supporter-card">
      <div className="supporter-card-header">
        <div className="supporter-logo">
          {item.logoUrl ? (
            <img
              src={item.logoUrl}
              alt={item.organizationName}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement.innerHTML = `<span class="supporter-logo-fallback">${getInitials(item.organizationName)}</span>`;
              }}
            />
          ) : (
            <span className="supporter-logo-fallback">{getInitials(item.organizationName)}</span>
          )}
        </div>
        <div>
          <div className="supporter-name">{item.organizationName}</div>
          <span className={`supporter-type-badge supporter-type-${item.organizationType}`}>
            {item.organizationType}
          </span>
        </div>
      </div>

      {item.description && <p className="supporter-description">{item.description}</p>}

      <div className="supporter-meta">
        {item.websiteUrl && (
          <span className="supporter-meta-item">
            <i className="bi bi-globe"></i>
            <a href={item.websiteUrl} target="_blank" rel="noopener noreferrer">
              Website
            </a>
          </span>
        )}
        {item.contactEmail && (
          <span className="supporter-meta-item">
            <i className="bi bi-envelope"></i>
            <a href={`mailto:${item.contactEmail}`}>{item.contactEmail}</a>
          </span>
        )}
        {item.contributionAmount !== null && item.contributionAmount !== undefined && (
          <span className="supporter-meta-item">
            <i className="bi bi-cash-coin"></i>
            {formatVND(item.contributionAmount)} ({item.contributionType || 'Contribution'})
          </span>
        )}
      </div>
    </div>
  );
}

function SupportersPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [type, setType] = useState('');

  const fetchSupporters = useCallback(async () => {
    try {
      setLoading(true);
      const params = { activeOnly: true };
      if (type) params.type = type;
      const response = await api.get('/supporters', { params });
      setItems(Array.isArray(response) ? response : (response?.items || []));
    } catch (err) {
      setError('Failed to load supporters.');
    } finally {
      setLoading(false);
    }
  }, [type]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/supporters/stats');
      setStats(response || null);
    } catch (err) {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    fetchSupporters();
    fetchStats();
  }, [fetchSupporters, fetchStats]);

  return (
    <div className="about-subpage">
      <section className="page-header">
        <Container>
          <h1>
            Our <span className="text-accent">Supporters</span>
          </h1>
          <p className="lead">
            Care4Kids is powered by a network of generous foundations, partners and NGOs who
            share our commitment to child welfare.
          </p>
        </Container>
      </section>

      <Container className="pb-5">
        {stats && (
          <Row className="g-3 mb-4">
            <Col md={3}>
              <div className="achievement-stat-card">
                <div className="achievement-stat-icon">
                  <i className="bi bi-buildings-fill"></i>
                </div>
                <div className="achievement-stat-value">{stats.total}</div>
                <p className="achievement-stat-label">Total Partners</p>
              </div>
            </Col>
            <Col md={3}>
              <div className="achievement-stat-card">
                <div className="achievement-stat-icon">
                  <i className="bi bi-heart-fill"></i>
                </div>
                <div className="achievement-stat-value">{stats.supporters}</div>
                <p className="achievement-stat-label">Supporters</p>
              </div>
            </Col>
            <Col md={3}>
              <div className="achievement-stat-card">
                <div className="achievement-stat-icon">
                  <i className="bi bi-link-45deg"></i>
                </div>
                <div className="achievement-stat-value">{stats.partners}</div>
                <p className="achievement-stat-label">Partners</p>
              </div>
            </Col>
            <Col md={3}>
              <div className="achievement-stat-card">
                <div className="achievement-stat-icon">
                  <i className="bi bi-people-fill"></i>
                </div>
                <div className="achievement-stat-value">{stats.ngos}</div>
                <p className="achievement-stat-label">NGO Allies</p>
              </div>
            </Col>
          </Row>
        )}

        <div className="supporter-filter-tabs">
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
            <i className="bi bi-buildings" style={{ fontSize: '3rem', color: 'var(--text-gray)' }}></i>
            <h5 className="mt-3">No supporters to show</h5>
            <p className="text-muted">Check back soon or adjust your filter.</p>
          </div>
        ) : (
          <Row className="g-4">
            {items.map((item) => (
              <Col key={item.organizationId} md={6} lg={4}>
                <SupporterCard item={item} />
              </Col>
            ))}
          </Row>
        )}
      </Container>
    </div>
  );
}

export default SupportersPage;
