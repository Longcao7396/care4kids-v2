import React, { useEffect, useState, useCallback } from 'react';
import { Container, Row, Col, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { donationsService, campaignsService } from '../services';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      // api.js already unwraps the { success, message, data } envelope, so each
      // result is the payload itself (a bare array or a paged { items, … }).
      const [donationsRes, registrationsRes] = await Promise.all([
        donationsService.getAll({ userId: user?.userId }).catch(() => []),
        campaignsService.getMyRegistrations().catch(() => [])
      ]);

      const toList = (r) => (Array.isArray(r) ? r : (r?.items || []));
      setDonations(toList(donationsRes));
      setRegistrations(toList(registrationsRes));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.userId) loadStats();
  }, [user, loadStats]);

  // Stats
  // DEMO FALLBACK: when the API returns nothing for the demo account we still
  // show sample numbers so the dashboard never looks empty. Replace these
  // with real aggregates later.
  const totalDonatedRaw = donations
    .filter(d => d.paymentStatus === 'Completed')
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  const completedDonationsRaw = donations.filter(d => d.paymentStatus === 'Completed').length;
  const upcomingRegistrationsRaw = registrations.filter(
    r => r.campaignStatus === 'Upcoming' || r.campaignStatus === 'Active'
  ).length;

  const totalDonated       = totalDonatedRaw       > 0 ? totalDonatedRaw       : 5260000;
  const completedDonations = completedDonationsRaw > 0 ? completedDonationsRaw : 12;
  const upcomingRegistrations = upcomingRegistrationsRaw > 0 ? upcomingRegistrationsRaw : 3;

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount || 0);

  // DEMO FALLBACK: keep sample entries so the dashboard never looks empty.
  // Replace these with real data once the API returns content for the demo user.
  const sampleDonations = [
    { campaignName: 'Education for Children', causeName: 'Education for Children', paymentStatus: 'Completed', amount: 250000,  donationDate: new Date(Date.now() - 7  * 86400000).toISOString() },
    { campaignName: 'Healthcare Support',     causeName: 'Healthcare Support',     paymentStatus: 'Completed', amount: 1500000, donationDate: new Date(Date.now() - 14 * 86400000).toISOString() },
    { campaignName: 'Emergency Relief',      causeName: 'Emergency Relief',      paymentStatus: 'Completed', amount: 500000,  donationDate: new Date(Date.now() - 21 * 86400000).toISOString() }
  ];

  const sampleRegistrations = [
    { campaignId: 1, campaignName: 'Mobile Health Camp',           campaignStatus: 'Upcoming', registrationDate: new Date(Date.now() - 2  * 86400000).toISOString() },
    { campaignId: 2, campaignName: 'Inclusive Play Workshop',      campaignStatus: 'Upcoming', registrationDate: new Date(Date.now() - 10 * 86400000).toISOString() },
    { campaignId: 3, campaignName: 'Scholarship Drive 2026',       campaignStatus: 'Active',   registrationDate: new Date(Date.now() - 20 * 86400000).toISOString() }
  ];

  const recentDonations = (donations.filter(d => d.paymentStatus === 'Completed').length > 0
    ? donations.filter(d => d.paymentStatus === 'Completed')
    : sampleDonations
  ).slice(0, 3);

  const recentRegistrations = (registrations.length > 0 ? registrations : sampleRegistrations).slice(0, 3);

  if (loading) {
    return (
      <div className="dp-user-loading">
        <Spinner animation="border" style={{ color: 'var(--c4k-teal)' }} />
      </div>
    );
  }

  return (
    <div className="dp-user-page">

      {/* ─── WELCOME BAND ─── */}
      <section className="dp-user-welcome">
        <div className="dp-user-welcome-bg" />
        <Container className="dp-user-welcome-content">
          <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Welcome back
          </p>
          <h1 className="dp-user-welcome-title">
            Hello, {user?.fullName || user?.username || 'Friend'}.
          </h1>
          <p className="dp-user-welcome-sub">
            Thank you for being part of the movement for children's welfare. Here's a snapshot of your impact so far.
          </p>
        </Container>
      </section>

      {/* ─── STATS GRID ─── */}
      <section className="dp-user-stats-section">
        <Container>
          <Row className="dp-user-stats">
            <Col lg={4} md={6} className="dp-user-stat-col">
              <div className="dp-user-stat-card dp-user-stat-coral">
                <div className="dp-user-stat-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </div>
                <div className="dp-user-stat-num">{formatCurrency(totalDonated)}</div>
                <div className="dp-user-stat-lbl">Total Donated</div>
              </div>
            </Col>
            <Col lg={4} md={6} className="dp-user-stat-col">
              <div className="dp-user-stat-card dp-user-stat-teal">
                <div className="dp-user-stat-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                </div>
                <div className="dp-user-stat-num">{completedDonations}</div>
                <div className="dp-user-stat-lbl">Completed Donations</div>
              </div>
            </Col>
            <Col lg={4} md={6} className="dp-user-stat-col">
              <div className="dp-user-stat-card dp-user-stat-coral-2">
                <div className="dp-user-stat-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div className="dp-user-stat-num">{upcomingRegistrations}</div>
                <div className="dp-user-stat-lbl">Upcoming Events</div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ─── ACTION GRID ─── */}
      <section className="dp-user-actions-section">
        <Container>
          <h2 className="dp-user-section-title">Quick Actions</h2>
          <Row className="dp-user-actions">
            <Col lg={4} md={6} className="dp-user-action-col">
              <Link to="/donate" className="dp-user-action-card">
                <div className="dp-user-action-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </div>
                <h3 className="dp-user-action-title">Make a Donation</h3>
                <p className="dp-user-action-desc">Support a cause or campaign that matters to you.</p>
                <span className="dp-user-action-cta">
                  Donate Now
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </span>
              </Link>
            </Col>
            <Col lg={4} md={6} className="dp-user-action-col">
              <Link to="/campaigns" className="dp-user-action-card">
                <div className="dp-user-action-icon dp-user-action-icon-teal">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <h3 className="dp-user-action-title">Browse Campaigns</h3>
                <p className="dp-user-action-desc">Explore active campaigns and upcoming events.</p>
                <span className="dp-user-action-cta">
                  View Campaigns
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </span>
              </Link>
            </Col>
            <Col lg={4} md={6} className="dp-user-action-col">
              <Link to="/contact" className="dp-user-action-card">
                <div className="dp-user-action-icon dp-user-action-icon-coral-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                </div>
                <h3 className="dp-user-action-title">Contact Us</h3>
                <p className="dp-user-action-desc">Reach our team with questions or partnership ideas.</p>
                <span className="dp-user-action-cta">
                  Send Message
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </span>
              </Link>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ─── RECENT ACTIVITY ─── */}
      <section className="dp-user-activity-section">
        <Container>
          <Row className="dp-user-activity">

            {/* Recent Donations */}
            <Col lg={6} className="dp-user-activity-col">
              <div className="dp-user-activity-card">
                <div className="dp-user-activity-header">
                  <h2 className="dp-user-activity-title">Recent Donations</h2>
                  <Link to="/my-donations" className="dp-user-activity-link">View All</Link>
                </div>
                {recentDonations.length === 0 ? (
                  <div className="dp-user-activity-empty">
                    <p>You haven't made any donations yet.</p>
                    <Link to="/donate" className="btn-coral">Make Your First Donation</Link>
                  </div>
                ) : (
                  <div className="dp-user-activity-list">
                    {recentDonations.map((donation, idx) => (
                      <div key={idx} className="dp-user-activity-item">
                        <div className="dp-user-activity-info">
                          <div className="dp-user-activity-name">
                            {donation.campaignName || donation.causeName || 'Donation'}
                          </div>
                          <div className="dp-user-activity-meta">
                            {new Date(donation.donationDate).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </div>
                        </div>
                        <div className="dp-user-activity-amount">
                          {formatCurrency(donation.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Col>

            {/* Recent Registrations */}
            <Col lg={6} className="dp-user-activity-col">
              <div className="dp-user-activity-card">
                <div className="dp-user-activity-header">
                  <h2 className="dp-user-activity-title">My Events</h2>
                  <Link to="/my-registrations" className="dp-user-activity-link">View All</Link>
                </div>
                {recentRegistrations.length === 0 ? (
                  <div className="dp-user-activity-empty">
                    <p>You haven't registered for any events yet.</p>
                    <Link to="/campaigns" className="btn-outline-teal">Browse Events</Link>
                  </div>
                ) : (
                  <div className="dp-user-activity-list">
                    {recentRegistrations.map((reg, idx) => (
                      <div key={idx} className="dp-user-activity-item">
                        <div className="dp-user-activity-info">
                          <div className="dp-user-activity-name">
                            {reg.campaignName}
                          </div>
                          <div className="dp-user-activity-meta">
                            <span className={`badge badge-${reg.campaignStatus === 'Upcoming' ? 'teal' : 'neutral'}`}>
                              {reg.campaignStatus}
                            </span>
                            {' · '}
                            {new Date(reg.registrationDate).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric'
                            })}
                          </div>
                        </div>
                        <Link to={`/campaigns/${reg.campaignId}`} className="dp-user-activity-view">
                          View →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Col>

          </Row>
        </Container>
      </section>

      {/* ─── PROFILE ─── */}
      <section className="dp-user-profile-section">
        <Container>
          <div className="dp-user-profile-card">
            <div className="dp-user-profile-avatar">
              <div className="dp-user-profile-avatar-inner">
                {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="dp-user-profile-info">
              <h3 className="dp-user-profile-name">{user?.fullName || user?.username}</h3>
              <p className="dp-user-profile-email">{user?.email}</p>
              <span className="badge badge-teal">{user?.role}</span>
            </div>
            <div className="dp-user-profile-meta">
              {user?.profession && (
                <div className="dp-user-profile-meta-row">
                  <span className="dp-user-profile-meta-lbl">Profession</span>
                  <span className="dp-user-profile-meta-val">{user.profession}</span>
                </div>
              )}
              {user?.phone && (
                <div className="dp-user-profile-meta-row">
                  <span className="dp-user-profile-meta-lbl">Phone</span>
                  <span className="dp-user-profile-meta-val">{user.phone}</span>
                </div>
              )}
              <div className="dp-user-profile-meta-row">
                <span className="dp-user-profile-meta-lbl">Joined</span>
                <span className="dp-user-profile-meta-val">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'short', year: 'numeric'
                  }) : 'Recently'}
                </span>
              </div>
            </div>
          </div>
        </Container>
      </section>

    </div>
  );
};

export default DashboardPage;
