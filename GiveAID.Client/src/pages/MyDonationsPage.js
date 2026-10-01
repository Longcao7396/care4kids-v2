import React, { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { donationsService } from '../services';
import './MyDonationsPage.css';

const MyDonationsPage = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    loadDonations();
  }, []);

  const loadDonations = async () => {
    try {
      setLoading(true);
      const response = await donationsService.getAll();
      setDonations(Array.isArray(response) ? response : (response?.items || []));
    } catch (error) {
      console.error('Error loading donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount || 0);

  // Filtered + sorted list
  const filteredDonations = useMemo(() => {
    let list = [...donations];
    if (filter === 'completed') {
      list = list.filter(d => d.paymentStatus === 'Completed');
    } else if (filter === 'pending') {
      list = list.filter(d => d.paymentStatus === 'Pending' || d.paymentStatus === 'Failed');
    }
    if (sort === 'newest') {
      list.sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate));
    } else if (sort === 'oldest') {
      list.sort((a, b) => new Date(a.donationDate) - new Date(b.donationDate));
    } else if (sort === 'highest') {
      list.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    } else if (sort === 'lowest') {
      list.sort((a, b) => (a.amount || 0) - (b.amount || 0));
    }
    return list;
  }, [donations, filter, sort]);

  // Stats
  const stats = useMemo(() => {
    const completed = donations.filter(d => d.paymentStatus === 'Completed');
    const totalAmount = completed.reduce((sum, d) => sum + (d.amount || 0), 0);
    const causes = new Set(completed.map(d => d.causeName).filter(Boolean));
    return {
      total: donations.length,
      completed: completed.length,
      totalAmount,
      causeCount: causes.size
    };
  }, [donations]);

  const getStatusBadge = (status) => {
    const map = {
      Completed: 'badge-success',
      Pending: 'badge-warning',
      Failed: 'badge-error',
      Refunded: 'badge-neutral'
    };
    return map[status] || 'badge-neutral';
  };

  if (loading) {
    return (
      <div className="mdp-loading">
        <Spinner animation="border" style={{ color: 'var(--c4k-teal)' }} />
      </div>
    );
  }

  return (
    <div className="mdp-page">

      {/* ─── HERO ─── */}
      <section className="mdp-hero">
        <Container>
          <p className="eyebrow">Your Giving</p>
          <h1 className="mdp-hero-title">My Donations</h1>
          <p className="mdp-hero-sub">
            Thank you for your generosity. Every donation creates real impact in a child's life.
          </p>
        </Container>
      </section>

      {/* ─── STATS ─── */}
      <section className="mdp-stats-section">
        <Container>
          <Row className="mdp-stats">
            <Col md={3} sm={6} className="mdp-stat-col">
              <div className="mdp-stat-card">
                <div className="mdp-stat-lbl">Total Donated</div>
                <div className="mdp-stat-num">{formatCurrency(stats.totalAmount)}</div>
              </div>
            </Col>
            <Col md={3} sm={6} className="mdp-stat-col">
              <div className="mdp-stat-card">
                <div className="mdp-stat-lbl">Completed</div>
                <div className="mdp-stat-num">{stats.completed}</div>
              </div>
            </Col>
            <Col md={3} sm={6} className="mdp-stat-col">
              <div className="mdp-stat-card">
                <div className="mdp-stat-lbl">All Donations</div>
                <div className="mdp-stat-num">{stats.total}</div>
              </div>
            </Col>
            <Col md={3} sm={6} className="mdp-stat-col">
              <div className="mdp-stat-card">
                <div className="mdp-stat-lbl">Causes Supported</div>
                <div className="mdp-stat-num">{stats.causeCount}</div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ─── CONTROLS ─── */}
      <section className="mdp-controls-section">
        <Container>
          <div className="mdp-controls">
            <div className="mdp-filters">
              <button
                className={`mdp-filter-btn ${filter === 'all' ? 'is-active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`mdp-filter-btn ${filter === 'completed' ? 'is-active' : ''}`}
                onClick={() => setFilter('completed')}
              >
                Completed
              </button>
              <button
                className={`mdp-filter-btn ${filter === 'pending' ? 'is-active' : ''}`}
                onClick={() => setFilter('pending')}
              >
                Pending / Failed
              </button>
            </div>

            <div className="mdp-sort">
              <label className="mdp-sort-label">Sort by</label>
              <select
                className="mdp-sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest amount</option>
                <option value="lowest">Lowest amount</option>
              </select>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── LIST ─── */}
      <section className="mdp-list-section">
        <Container>
          {filteredDonations.length === 0 ? (
            <Alert variant="info" className="mdp-empty">
              <h4>No donations found</h4>
              <p>
                {donations.length === 0
                  ? "You haven't made any donations yet."
                  : 'No donations match your current filters.'}
              </p>
              <Link to="/donate" className="btn-coral">Make Your First Donation</Link>
            </Alert>
          ) : (
            <div className="mdp-list">
              {filteredDonations.map((donation) => (
                <div key={donation.donationId} className="mdp-item">
                  <div className="mdp-item-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                  </div>

                  <div className="mdp-item-body">
                    <div className="mdp-item-top">
                      <h3 className="mdp-item-name">
                        {donation.campaignName || donation.causeName || 'General Donation'}
                      </h3>
                      <span className={`badge ${getStatusBadge(donation.paymentStatus)}`}>
                        {donation.paymentStatus || 'Unknown'}
                      </span>
                    </div>

                    <div className="mdp-item-meta">
                      <span className="mdp-item-meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {new Date(donation.donationDate).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </span>
                      <span className="mdp-item-meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                        {donation.paymentMethod}
                        {donation.cardLastFour && ` •••• ${donation.cardLastFour}`}
                      </span>
                      {donation.campaignId && (
                        <Link to={`/campaigns/${donation.campaignId}`} className="mdp-item-meta-link">
                          View campaign →
                        </Link>
                      )}
                    </div>

                    {donation.message && (
                      <blockquote className="mdp-item-msg">"{donation.message}"</blockquote>
                    )}
                  </div>

                  <div className="mdp-item-amount">
                    {formatCurrency(donation.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>
      </section>

    </div>
  );
};

export default MyDonationsPage;
