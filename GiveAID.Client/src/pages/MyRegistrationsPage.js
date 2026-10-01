import React, { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { campaignsService } from '../services';
import './MyRegistrationsPage.css';

/**
 * My Event Registrations.
 *
 * Programmes were merged into Campaigns. This page now reads from the
 * unified /api/campaigns/my-registrations endpoint.
 */
const MyRegistrationsPage = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const response = await campaignsService.getMyRegistrations();
      setRegistrations(Array.isArray(response) ? response : (response?.items || []));
    } catch (error) {
      console.error('Error loading registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRegistrations = useMemo(() => {
    if (filter === 'all') return registrations;
    if (filter === 'upcoming') {
      return registrations.filter(r =>
        r.campaignStatus === 'Upcoming' || r.campaignStatus === 'Active'
      );
    }
    if (filter === 'completed') {
      return registrations.filter(r => r.campaignStatus === 'Completed');
    }
    return registrations;
  }, [registrations, filter]);

  const stats = useMemo(() => {
    return {
      total: registrations.length,
      upcoming: registrations.filter(r =>
        r.campaignStatus === 'Upcoming' || r.campaignStatus === 'Active'
      ).length,
      completed: registrations.filter(r => r.campaignStatus === 'Completed').length
    };
  }, [registrations]);

  const getStatusBadge = (status) => {
    const map = {
      Upcoming: 'badge-teal',
      Active: 'badge-success',
      Ongoing: 'badge-success',
      Completed: 'badge-neutral',
      Cancelled: 'badge-error'
    };
    return map[status] || 'badge-neutral';
  };

  if (loading) {
    return (
      <div className="mrp-loading">
        <Spinner animation="border" style={{ color: 'var(--c4k-teal)' }} />
      </div>
    );
  }

  return (
    <div className="mrp-page">

      {/* ─── HERO ─── */}
      <section className="mrp-hero">
        <Container>
          <p className="eyebrow">Your Participation</p>
          <h1 className="mrp-hero-title">My Event Registrations</h1>
          <p className="mrp-hero-sub">
            Track your participation in our events and volunteer programmes.
          </p>
        </Container>
      </section>

      {/* ─── STATS ─── */}
      <section className="mrp-stats-section">
        <Container>
          <Row className="mrp-stats">
            <Col md={4} className="mrp-stat-col">
              <div className="mrp-stat-card">
                <div className="mrp-stat-lbl">Total Registered</div>
                <div className="mrp-stat-num">{stats.total}</div>
              </div>
            </Col>
            <Col md={4} className="mrp-stat-col">
              <div className="mrp-stat-card">
                <div className="mrp-stat-lbl">Upcoming</div>
                <div className="mrp-stat-num mrp-stat-num-coral">{stats.upcoming}</div>
              </div>
            </Col>
            <Col md={4} className="mrp-stat-col">
              <div className="mrp-stat-card">
                <div className="mrp-stat-lbl">Completed</div>
                <div className="mrp-stat-num mrp-stat-num-teal">{stats.completed}</div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ─── FILTERS ─── */}
      <section className="mrp-controls-section">
        <Container>
          <div className="mrp-filters">
            <button
              className={`mrp-filter-btn ${filter === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`mrp-filter-btn ${filter === 'upcoming' ? 'is-active' : ''}`}
              onClick={() => setFilter('upcoming')}
            >
              Upcoming &amp; Active
            </button>
            <button
              className={`mrp-filter-btn ${filter === 'completed' ? 'is-active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              Completed
            </button>
          </div>
        </Container>
      </section>

      {/* ─── LIST ─── */}
      <section className="mrp-list-section">
        <Container>
          {filteredRegistrations.length === 0 ? (
            <Alert variant="info" className="mrp-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <h4>No registrations found</h4>
              <p>
                {registrations.length === 0
                  ? "You haven't registered for any events yet."
                  : 'No registrations match your current filter.'}
              </p>
              <Link to="/campaigns" className="btn-coral">Browse Events</Link>
            </Alert>
          ) : (
            <Row className="mrp-list">
              {filteredRegistrations.map((reg) => (
                <Col key={reg.registrationId} lg={6} className="mb-4">
                  <div className="mrp-item">
                    <div className="mrp-item-header">
                      <div className="mrp-item-tags">
                        {reg.programmeType && (
                          <span className="badge badge-teal">{reg.programmeType}</span>
                        )}
                        <span className={`badge ${getStatusBadge(reg.campaignStatus)}`}>
                          {reg.campaignStatus}
                        </span>
                      </div>
                      <div className="mrp-item-date-registered">
                        Registered {new Date(reg.registrationDate).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </div>
                    </div>

                    <h3 className="mrp-item-title">{reg.campaignName}</h3>

                    <div className="mrp-item-meta">
                      {reg.startDate && (
                        <div className="mrp-item-meta-row">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          <span>
                            {new Date(reg.startDate).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      {reg.location && (
                        <div className="mrp-item-meta-row">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span>{reg.location}</span>
                        </div>
                      )}
                      {reg.attendanceConfirmed && (
                        <div className="mrp-item-meta-row mrp-item-meta-attended">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                          <span>Attendance confirmed</span>
                        </div>
                      )}
                    </div>

                    {reg.notes && (
                      <blockquote className="mrp-item-notes">
                        <span className="mrp-item-notes-lbl">Your note</span>
                        "{reg.notes}"
                      </blockquote>
                    )}

                    <Link to={`/campaigns/${reg.campaignId}`} className="mrp-item-cta">
                      View event details
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </Link>
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </section>

    </div>
  );
};

export default MyRegistrationsPage;
