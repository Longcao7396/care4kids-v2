import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import api from '../services/api';
import '../styles/AboutPages.css';

function formatMetric(value, suffix) {
  if (value === null || value === undefined) return null;
  const formatted = new Intl.NumberFormat('vi-VN').format(value);
  return suffix ? `${formatted}${suffix}` : formatted;
}

function AchievementCard({ item }) {
  const metric = formatMetric(item.metricValue, item.metricSuffix);
  return (
    <div className="achievement-card">
      {item.isFeatured && <span className="achievement-featured-tag">Featured</span>}
      <div className="achievement-icon-wrap">
        <i className={`bi bi-${item.icon || 'trophy-fill'}`}></i>
      </div>
      {item.category && <span className="achievement-category">{item.category}</span>}
      <h5 className="achievement-title">{item.title}</h5>
      {metric && <div className="achievement-metric">{metric}</div>}
      {item.metricLabel && <div className="achievement-metric-label">{item.metricLabel}</div>}
      {item.description && (
        <p className="achievement-description">{item.description}</p>
      )}
      <div className="achievement-meta">
        {item.achievementDate && (
          <span>
            <i className="bi bi-calendar-event me-1"></i>
            {new Date(item.achievementDate).toLocaleDateString('vi-VN')}
          </span>
        )}
        {item.beneficiaries ? (
          <span>
            <i className="bi bi-people-fill me-1"></i>
            {new Intl.NumberFormat('vi-VN').format(item.beneficiaries)} beneficiaries
          </span>
        ) : null}
      </div>
    </div>
  );
}

function AchievementsPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('');

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      const params = { activeOnly: true, pageSize: 100 };
      if (category) params.category = category;
      const response = await api.get('/achievements', { params });
      setItems(Array.isArray(response) ? response : (response?.items || []));
    } catch (err) {
      setError('Failed to load achievements.');
    } finally {
      setLoading(false);
    }
  }, [category]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/achievements/stats');
      setStats(response || null);
    } catch (err) {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
    fetchStats();
  }, [fetchAchievements, fetchStats]);

  // Derive categories for the filter from the loaded items
  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));

  const headline = stats?.headline;

  return (
    <div className="about-subpage">
      <section className="page-header">
        <Container>
          <h1>
            Our <span className="text-accent">Achievements</span>
          </h1>
          <p className="lead">
            A decade of impact in numbers. Every milestone is the result of collective effort
            from our team, partners, donors and the communities we serve.
          </p>
        </Container>
      </section>

      <Container className="pb-5">
        {/* Headline Hero */}
        {headline && headline.MetricValue !== null && headline.MetricValue !== undefined && (
          <div
            className="about-admin-card text-center mb-4"
            style={{ background: 'linear-gradient(135deg, var(--primary-slate) 0%, var(--bg-card) 100%)' }}
          >
            <div style={{ color: 'var(--accent-cyan)', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              {headline.MetricLabel}
            </div>
            <div
              style={{
                fontSize: '4rem',
                fontWeight: 800,
                color: 'var(--accent-sky)',
                margin: '0.5rem 0',
                lineHeight: 1,
              }}
            >
              {new Intl.NumberFormat('vi-VN').format(headline.MetricValue)}
              {headline.MetricSuffix || ''}
            </div>
            <div className="text-light fw-semibold">{headline.Title}</div>
          </div>
        )}

        {/* Stats overview */}
        {stats && (
          <Row className="g-4 mb-4">
            <Col md={4}>
              <div className="achievement-stat-card">
                <div className="achievement-stat-icon">
                  <i className="bi bi-trophy-fill"></i>
                </div>
                <div className="achievement-stat-value">{stats.totalAchievements}</div>
                <p className="achievement-stat-label">Total Achievements</p>
              </div>
            </Col>
            <Col md={4}>
              <div className="achievement-stat-card">
                <div className="achievement-stat-icon">
                  <i className="bi bi-star-fill"></i>
                </div>
                <div className="achievement-stat-value">{stats.featuredAchievements}</div>
                <p className="achievement-stat-label">Featured Milestones</p>
              </div>
            </Col>
            <Col md={4}>
              <div className="achievement-stat-card">
                <div className="achievement-stat-icon">
                  <i className="bi bi-people-fill"></i>
                </div>
                <div className="achievement-stat-value">
                  {new Intl.NumberFormat('vi-VN').format(stats.totalBeneficiaries || 0)}
                </div>
                <p className="achievement-stat-label">Beneficiaries Reached</p>
              </div>
            </Col>
          </Row>
        )}

        {/* Filter */}
        {categories.length > 0 && (
          <div className="supporter-filter-tabs">
            <button
              type="button"
              className={`supporter-filter-tab ${category === '' ? 'active' : ''}`}
              onClick={() => setCategory('')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`supporter-filter-tab ${category === cat ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : items.length === 0 ? (
          <div className="team-empty">
            <i className="bi bi-trophy" style={{ fontSize: '3rem', color: 'var(--text-gray)' }}></i>
            <h5 className="mt-3">No achievements to show yet</h5>
            <p className="text-muted">Check back soon for our latest milestones.</p>
          </div>
        ) : (
          <Row className="g-4">
            {items.map((item) => (
              <Col key={item.achievementId} md={6} lg={4}>
                <AchievementCard item={item} />
              </Col>
            ))}
          </Row>
        )}
      </Container>
    </div>
  );
}

export default AchievementsPage;
