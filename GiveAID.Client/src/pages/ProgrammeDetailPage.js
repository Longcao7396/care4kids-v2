import React, { useEffect, useState, useCallback } from 'react';
import { Container, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { campaignsService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import './ProgrammeDetailPage.css';

/**
 * Programme Detail (now Event Detail) — LEGACY wrapper.
 *
 * Programmes were merged into Campaigns on the backend. This page reads
 * the unified Campaign record (which may carry programmeType and
 * RegistrationRequired) so the UX stays familiar — but the URL still
 * responds to /programmes/:id for backward compatibility.
 *
 * @deprecated Prefer /campaigns/:id (CampaignDetailPage).
 */
const ProgrammeDetailPage = () => {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await campaignsService.getById(id);
      setEvent(response || null);
    } catch (error) {
      console.error('Error loading event:', error);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setRegistering(true);
    setError('');
    setSuccess('');

    try {
      await campaignsService.register(id, {});
      setSuccess('Successfully registered for this event!');
      loadEvent(); // refresh participant count
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="pdp-loading">
        <Spinner animation="border" style={{ color: 'var(--c4k-teal)' }} />
      </div>
    );
  }

  if (!event) {
    return (
      <Container className="py-5">
        <Alert variant="danger">Event not found</Alert>
      </Container>
    );
  }

  const isEvent = event.registrationRequired;
  const isRegisterable = isEvent && (event.status === 'Upcoming' || event.status === 'Active');
  const isFull = event.maxParticipants && event.currentParticipants >= event.maxParticipants;

  const formatLongDate = (date) => {
    if (!date) return 'TBA';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

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

  return (
    <div className="pdp-page">

      {/* ─── HERO ─── */}
      <section className="pdp-hero">
        <div className="pdp-hero-bg">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.campaignName} onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <img src="https://res.cloudinary.com/mczqcagv/image/upload/v1790337354/giveaid/replacement/thieunhi26-3817-1401532325_hvieu1.webp" alt="" />
          )}
          <div className="pdp-hero-overlay" />
        </div>

        <Container className="pdp-hero-content">
          <Link to="/campaigns" className="pdp-back-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            All Campaigns
          </Link>

          <div className="pdp-hero-tags">
            {event.programmeType && (
              <span className="badge badge-coral">{event.programmeType}</span>
            )}
            <span className={`badge ${getStatusBadge(event.status)}`}>
              {event.status}
            </span>
            {event.isFeatured && <span className="badge badge-teal-light">Featured</span>}
          </div>

          <h1 className="pdp-hero-title">{event.campaignName}</h1>
        </Container>
      </section>

      {/* ─── CONTENT ─── */}
      <section className="pdp-content">
        <Container>
          <Row className="pdp-row">

            {/* Left column — story */}
            <Col lg={8}>
              <div className="pdp-section">
                <p className="eyebrow">About This Event</p>
                <p className="pdp-lead">{event.description}</p>
              </div>

              {event.targetBeneficiaries ? (
                <div className="pdp-section">
                  <p className="eyebrow">Impact</p>
                  <h3 className="pdp-section-title">Target Beneficiaries</h3>
                  <p className="pdp-prose">{event.targetBeneficiaries.toLocaleString('vi-VN')} children will benefit from this event.</p>
                </div>
              ) : null}
            </Col>

            {/* Right column — info + Register */}
            <Col lg={4}>
              <div className="pdp-register-card">

                <p className="eyebrow" style={{ marginBottom: 0 }}>
                  {isEvent ? 'Join This Event' : 'Support This Campaign'}
                </p>

                {/* Capacity progress (event-only) */}
                {isEvent && event.maxParticipants && (
                  <div className="pdp-capacity">
                    <div className="pdp-capacity-num">
                      <span className="pdp-capacity-current">{event.currentParticipants || 0}</span>
                      <span className="pdp-capacity-divider"> / </span>
                      <span className="pdp-capacity-max">{event.maxParticipants}</span>
                    </div>
                    <div className="pdp-capacity-lbl">Registered</div>
                    <div className="pdp-capacity-bar">
                      <div
                        className="pdp-capacity-fill"
                        style={{ width: `${Math.min(((event.currentParticipants || 0) / event.maxParticipants) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* ─── Primary action button ─── */}
                {isRegisterable && !isFull ? (
                  <button
                    type="button"
                    className="pdp-register-btn"
                    onClick={handleRegister}
                    disabled={registering || success}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                    <span>
                      {registering ? 'Registering…' : success ? '✓ Registered!' : 'Register Now'}
                    </span>
                  </button>
                ) : isRegisterable && isFull ? (
                  <div className="pdp-full">This event is full</div>
                ) : !isEvent && event.status === 'Active' ? (
                  <button
                    type="button"
                    className="pdp-register-btn"
                    onClick={() => navigate(`/donate?campaignId=${event.campaignId}`)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    <span>Donate Now</span>
                  </button>
                ) : (
                  <div className="pdp-ended">
                    This event has {event.status === 'Completed' ? 'ended' : 'been closed'}.
                  </div>
                )}

                {!isAuthenticated && (
                  <p className="pdp-login-hint">
                    <Link to="/login">Sign in</Link> to {isEvent ? 'register' : 'donate'}.
                  </p>
                )}

                {error && <Alert variant="danger" className="pdp-alert">{error}</Alert>}
                {success && <Alert variant="success" className="pdp-alert">{success}</Alert>}

                {/* ─── Event details grid ─── */}
                <div className="pdp-info-grid">

                  <div className="pdp-info-item">
                    <div className="pdp-info-icon pdp-info-icon-coral">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <div className="pdp-info-body">
                      <div className="pdp-info-lbl">Status</div>
                      <div className="pdp-info-val">{event.status}</div>
                    </div>
                  </div>

                  <div className="pdp-info-item">
                    <div className="pdp-info-icon pdp-info-icon-teal">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                    <div className="pdp-info-body">
                      <div className="pdp-info-lbl">Start Date</div>
                      <div className="pdp-info-val">{formatLongDate(event.startDate)}</div>
                    </div>
                  </div>

                  {event.endDate && (
                    <div className="pdp-info-item">
                      <div className="pdp-info-icon pdp-info-icon-teal">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </div>
                      <div className="pdp-info-body">
                        <div className="pdp-info-lbl">End Date</div>
                        <div className="pdp-info-val">{formatLongDate(event.endDate)}</div>
                      </div>
                    </div>
                  )}

                  <div className="pdp-info-item">
                    <div className="pdp-info-icon pdp-info-icon-coral">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <div className="pdp-info-body">
                      <div className="pdp-info-lbl">Location</div>
                      <div className="pdp-info-val">{event.location || 'To be announced'}</div>
                    </div>
                  </div>

                  {isEvent && (
                    <div className="pdp-info-item">
                      <div className="pdp-info-icon pdp-info-icon-teal">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      </div>
                      <div className="pdp-info-body">
                        <div className="pdp-info-lbl">Current Registrations</div>
                        <div className="pdp-info-val">
                          <span className="pdp-info-val-num">{event.currentParticipants || 0}</span>
                          {event.maxParticipants && (
                            <span className="pdp-info-val-divider"> / {event.maxParticipants}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {event.campaignCode && (
                  <div className="pdp-code">
                    <div className="pdp-code-lbl">Reference</div>
                    <code className="pdp-code-val">{event.campaignCode}</code>
                  </div>
                )}

              </div>
            </Col>
          </Row>
        </Container>
      </section>

    </div>
  );
};

export default ProgrammeDetailPage;
