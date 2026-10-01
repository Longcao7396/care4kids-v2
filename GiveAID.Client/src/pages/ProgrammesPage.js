import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { campaignsService } from '../services';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * Programmes / Events page (LEGACY wrapper).
 *
 * Programmes have been merged into Campaigns on the backend. This page
 * reads from the unified /api/campaigns endpoint with `eventsOnly=true`
 * so users still see the same registration-based events (formerly
 * Programmes) in one familiar view.
 *
 * @deprecated Prefer /campaigns (CampaignsPage) — this page exists only as
 * a fallback for any links that still point at /programmes.
 */
const ProgrammesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [registeringId, setRegisteringId] = useState(null);
  const [registerMsg, setRegisterMsg] = useState({ type: '', text: '' }); // 'success' | 'error' | ''

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await campaignsService.getAll({
        eventsOnly: true,
        pageSize: 50
      });
      setEvents(Array.isArray(response) ? response : (response?.items || []));
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Discover available programme types from the data itself so the filter
  // row stays in sync with whatever the admin publishes.
  const availableTypes = useMemo(() => {
    const types = new Set(events.map(e => e.programmeType).filter(Boolean));
    return ['All', ...Array.from(types)];
  }, [events]);

  const filtered = useMemo(() => {
    if (filter === 'All') return events;
    return events.filter(e => e.programmeType === filter);
  }, [events, filter]);

  const getStatusBadge = (status) => {
    const map = {
      Upcoming:  'primary',
      Ongoing:   'success',
      Active:    'success',
      Completed: 'secondary',
      Cancelled: 'danger',
      Paused:    'warning'
    };
    return map[status] || 'info';
  };

  const handleRegister = async (event) => {
    if (!user) {
      navigate('/login', { state: { from: `/campaigns/${event.campaignId}` } });
      return;
    }
    setRegisteringId(event.campaignId);
    setRegisterMsg({ type: '', text: '' });
    try {
      await api.post(`/campaigns/${event.campaignId}/register`, { notes: '' });
      setRegisterMsg({ type: 'success', text: 'Registered! See you there.' });
      loadEvents(); // refresh to update counts
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.Message || err.message || 'Registration failed.';
      setRegisterMsg({ type: 'error', text: msg });
    } finally {
      setRegisteringId(null);
    }
  };

  const canRegister = (event) =>
    event.registrationRequired &&
    (event.status === 'Upcoming' || event.status === 'Active') &&
    (!event.maxParticipants || (event.currentParticipants || 0) < event.maxParticipants);

  return (
    <div className="programmes-page">
      <section className="page-header">
        <Container>
          <h1 className="page-title">Events &amp; Programmes</h1>
          <p className="page-subtitle">
            Join our events and activities — from school visits and community
            days to volunteer programmes. Register to participate and help
            create positive change.
          </p>
        </Container>
      </section>

      <Container className="py-5">

        {/* Filter Buttons (dynamic from data) */}
        <div className="text-center mb-4">
          {availableTypes.map(type => (
            <Button
              key={type}
              variant={filter === type ? 'primary' : 'outline-primary'}
              onClick={() => setFilter(type)}
              className="me-2 mb-2"
            >
              {type === 'All' ? 'All Events' : type}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading…</span>
            </div>
          </div>
        ) : filtered.length > 0 ? (
          <Row className="g-4">
            {filtered.map((event) => (
              <Col key={event.campaignId} md={6} lg={4}>
                <Card className="h-100 programme-card">
                  <div className="programme-image-wrapper">
                    <Card.Img
                      variant="top"
                      src={event.imageUrl || '/images/placeholder-programme.jpg'}
                      alt={event.campaignName}
                      style={{ height: '200px', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <Badge
                      bg={getStatusBadge(event.status)}
                      className="programme-status-badge"
                    >
                      {event.status}
                    </Badge>
                  </div>
                  <Card.Body>
                    {event.programmeType && (
                      <Badge bg="info" className="mb-2">{event.programmeType}</Badge>
                    )}
                    <Card.Title>{event.campaignName}</Card.Title>
                    <Card.Text className="text-muted">
                      {(event.description || '').substring(0, 100)}…
                    </Card.Text>

                    <div className="programme-info mt-3">
                      <div className="d-flex align-items-center mb-2">
                        <i className="bi bi-calendar text-accent me-2"></i>
                        <small>
                          {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBA'}
                        </small>
                      </div>
                      <div className="d-flex align-items-center mb-2">
                        <i className="bi bi-geo-alt text-accent me-2"></i>
                        <small>{event.location || 'TBA'}</small>
                      </div>
                      {event.registrationRequired && (
                        <div className="d-flex align-items-center">
                          <i className="bi bi-people text-accent me-2"></i>
                          <small>
                            {event.currentParticipants || 0}
                            {event.maxParticipants ? ` / ${event.maxParticipants}` : ''} registered
                          </small>
                        </div>
                      )}
                    </div>

                    {/* Registration / feedback message for this card */}
                    {event.registrationRequired && (
                      <div className="mb-2">
                        {registerMsg.type && registeringId !== event.campaignId && (
                          <Alert
                            variant={registerMsg.type === 'success' ? 'success' : 'danger'}
                            className="py-1 px-2"
                            style={{ fontSize: '0.8rem' }}
                          >
                            {registerMsg.text}
                          </Alert>
                        )}
                      </div>
                    )}

                    <div className="d-flex gap-2 mt-auto">
                      {canRegister(event) ? (
                        <Button
                          variant="success"
                          className="flex-grow-1"
                          onClick={() => handleRegister(event)}
                          disabled={registeringId === event.campaignId}
                        >
                          {registeringId === event.campaignId ? (
                            <><span className="spinner-border spinner-border-sm me-1"></span>Registering…</>
                          ) : (
                            <>
                              <i className="bi bi-person-plus me-1"></i>
                              Register
                            </>
                          )}
                        </Button>
                      ) : event.registrationRequired && !canRegister(event) ? (
                        <Button variant="secondary" className="flex-grow-1" disabled>
                          Full
                        </Button>
                      ) : null}

                      <Link
                        to={`/campaigns/${event.campaignId}`}
                        className="btn btn-outline-primary flex-grow-1 text-center"
                      >
                        Details
                      </Link>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <div className="empty-state text-center py-5">
            <i className="bi bi-calendar-event" style={{ fontSize: '4rem', color: 'var(--text-gray)' }}></i>
            <h5 className="mt-3">No events found</h5>
            <p className="text-muted">
              There are no upcoming events at the moment. Please check back soon.
            </p>
            <Button
              variant="outline-primary"
              onClick={() => setFilter('All')}
              className="mt-2"
            >
              View All Events
            </Button>
          </div>
        )}
      </Container>
    </div>
  );
};

export default ProgrammesPage;
