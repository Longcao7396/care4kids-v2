import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Form, Alert, Spinner } from 'react-bootstrap';
import api from '../services/api';
import { sanitizeHtml } from '../utils/safeHtml';
import '../styles/AboutPages.css';

const DEPARTMENTS = [
  { value: '', label: 'All Departments' },
  { value: 'Leadership', label: 'Leadership' },
  { value: 'Programmes', label: 'Programmes' },
  { value: 'Development', label: 'Development' },
  { value: 'Communications', label: 'Communications' },
  { value: 'Operations', label: 'Operations' },
];

function OurTeamPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [department, setDepartment] = useState('');
  const [cmsPage, setCmsPage] = useState(null);

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      const params = { activeOnly: true, pageSize: 100 };
      if (department) params.department = department;
      const response = await api.get('/team', { params });
      // Backend returns either {items,...} or a bare array depending on
      // controller version — normalise both.
      setMembers(Array.isArray(response) ? response : (response?.items || []));
    } catch (err) {
      setError('Failed to load team members.');
    } finally {
      setLoading(false);
    }
  }, [department]);

  const fetchCmsPage = useCallback(async () => {
    try {
      const response = await api.get('/cms/pages/our_team');
      setCmsPage(response || null);
    } catch (err) {
      // Non-fatal — page content is optional.
    }
  }, []);

  useEffect(() => {
    fetchTeam();
    fetchCmsPage();
  }, [fetchTeam, fetchCmsPage]);

  const renderSocials = (m) => (
    <div className="team-socials">
      {m.email && (
        <a className="team-social-link" href={`mailto:${m.email}`} title={m.email} aria-label="Email">
          <i className="bi bi-envelope-fill"></i>
        </a>
      )}
      {m.linkedInUrl && (
        <a className="team-social-link" href={m.linkedInUrl} target="_blank" rel="noopener noreferrer" title="LinkedIn" aria-label="LinkedIn">
          <i className="bi bi-linkedin"></i>
        </a>
      )}
      {m.twitterUrl && (
        <a className="team-social-link" href={m.twitterUrl} target="_blank" rel="noopener noreferrer" title="Twitter" aria-label="Twitter">
          <i className="bi bi-twitter"></i>
        </a>
      )}
      {m.facebookUrl && (
        <a className="team-social-link" href={m.facebookUrl} target="_blank" rel="noopener noreferrer" title="Facebook" aria-label="Facebook">
          <i className="bi bi-facebook"></i>
        </a>
      )}
    </div>
  );

  return (
    <div className="about-subpage">
      <section className="page-header">
        <Container>
          <h1>
            Our <span className="text-accent">Team</span>
          </h1>
          <p className="lead">
            Meet the passionate professionals driving Care4Kids' mission of giving every child a better tomorrow.
          </p>
        </Container>
      </section>

      <Container className="pb-5">
        {cmsPage && cmsPage.content && (
          <Row className="mb-4">
            <Col lg={10} className="mx-auto">
              <div
                className="about-admin-card"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(cmsPage.content) }}
              />
            </Col>
          </Row>
        )}

        <div className="team-filter-bar">
          <Row className="g-2 align-items-center">
            <Col md={6}>
              <Form.Label className="mb-0 me-2 text-light fw-semibold">Filter by department:</Form.Label>
            </Col>
            <Col md={6}>
              <Form.Select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                aria-label="Filter by department"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : members.length === 0 ? (
          <div className="team-empty">
            <i className="bi bi-people" style={{ fontSize: '3rem', color: 'var(--text-gray)' }}></i>
            <h5 className="mt-3">No team members found</h5>
            <p className="text-muted">Try adjusting your filter or check back soon.</p>
          </div>
        ) : (
          <Row className="g-4">
            {members.map((m) => (
              <Col key={m.teamMemberId} md={6} lg={4}>
                <div className="team-card">
                  <div className="team-photo-wrapper">
                    <img
                      src={m.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fullName)}&background=0F172A&color=38BDF8&size=300`}
                      alt={m.fullName}
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fullName)}&background=0F172A&color=38BDF8&size=300`;
                      }}
                    />
                    {m.isFeatured && <span className="team-featured-badge">Featured</span>}
                  </div>
                  <div className="team-card-body">
                    <div className="team-name">{m.fullName}</div>
                    <div className="team-role">{m.roleTitle}</div>
                    {m.department && <span className="team-department">{m.department}</span>}
                    {m.bio && <p className="team-bio">{m.bio}</p>}
                    {(m.email || m.linkedInUrl || m.twitterUrl || m.facebookUrl) && renderSocials(m)}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        )}
      </Container>
    </div>
  );
}

export default OurTeamPage;
