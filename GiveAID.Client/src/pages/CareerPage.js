import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Alert, Spinner, Modal, Form, Button, Badge
} from 'react-bootstrap';
import api from '../services/api';
import '../styles/AboutPages.css';

const EMPLOYMENT_TYPES = {
  FullTime: { label: 'Full-time', variant: 'primary' },
  PartTime: { label: 'Part-time', variant: 'info' },
  Contract: { label: 'Contract', variant: 'warning' },
  Volunteer: { label: 'Volunteer', variant: 'success' },
  Internship: { label: 'Internship', variant: 'secondary' },
};

function CareerApplyModal({ show, career, onHide, onSuccess }) {
  const [form, setForm] = useState({
    applicantName: '',
    email: '',
    phone: '',
    resumeUrl: '',
    coverLetter: '',
    linkedInUrl: '',
    portfolioUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show) {
      setForm({
        applicantName: '',
        email: '',
        phone: '',
        resumeUrl: '',
        coverLetter: '',
        linkedInUrl: '',
        portfolioUrl: '',
      });
      setError(null);
    }
  }, [show]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!career) return;
    try {
      setSubmitting(true);
      setError(null);
      await api.post(`/careers/${career.careerId}/apply`, form);
      onSuccess && onSuccess();
    } catch (err) {
      setError(err.response?.data?.Message || err.response?.data?.message || err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          Apply for {career?.positionTitle || 'this position'}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Full Name *</Form.Label>
                <Form.Control
                  name="applicantName"
                  value={form.applicantName}
                  onChange={handleChange}
                  required
                  maxLength={100}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Email *</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  maxLength={100}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  maxLength={20}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Resume URL</Form.Label>
                <Form.Control
                  name="resumeUrl"
                  value={form.resumeUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  maxLength={255}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Cover Letter</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  name="coverLetter"
                  value={form.coverLetter}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>LinkedIn URL</Form.Label>
                <Form.Control
                  name="linkedInUrl"
                  value={form.linkedInUrl}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/..."
                  maxLength={200}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Portfolio URL</Form.Label>
                <Form.Control
                  name="portfolioUrl"
                  value={form.portfolioUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  maxLength={200}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function CareerCard({ career, onApply }) {
  const type = EMPLOYMENT_TYPES[career.employmentType] || EMPLOYMENT_TYPES.FullTime;
  return (
    <div className="career-card">
      <div className="career-card-header">
        <div>
          <div className="career-title">{career.positionTitle}</div>
          {career.department && (
            <span className="career-department">{career.department}</span>
          )}
        </div>
        <span className="career-type-badge">{type.label}</span>
      </div>

      <div className="career-meta">
        {career.location && (
          <span className="career-meta-item">
            <i className="bi bi-geo-alt-fill"></i>
            {career.location}
          </span>
        )}
        {career.salaryRange && (
          <span className="career-meta-item">
            <i className="bi bi-cash-stack"></i>
            {career.salaryRange}
          </span>
        )}
        {career.vacancies > 0 && (
          <span className="career-meta-item">
            <i className="bi bi-people-fill"></i>
            {career.vacancies} {career.vacancies > 1 ? 'vacancies' : 'vacancy'}
          </span>
        )}
      </div>

      {career.description && (
        <p className="career-description">{stripHtml(career.description)}</p>
      )}

      <Button variant="primary" onClick={() => onApply(career)}>
        <i className="bi bi-send me-2"></i>
        Apply Now
      </Button>
    </div>
  );
}

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

function CareerPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCareer, setSelectedCareer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/careers', { params: { activeOnly: true } });
      setJobs(Array.isArray(response) ? response : (response?.items || []));
    } catch (err) {
      setError('Failed to load open positions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleApply = (career) => {
    setSelectedCareer(career);
    setShowModal(true);
  };

  const handleSuccess = (response) => {
    setShowModal(false);
    setSuccessMessage(
      response?.message ||
        'Your application has been submitted successfully. We will reach out to you soon.'
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="about-subpage">
      <section className="page-header">
        <Container>
          <h1>
            Career <span className="text-accent">With Us</span>
          </h1>
          <p className="lead">
            Join the Care4Kids team and help us give every child a better tomorrow.
            We welcome passionate people from every background.
          </p>
        </Container>
      </section>

      <Container className="pb-5">
        {successMessage && (
          <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
            <i className="bi bi-check-circle-fill me-2"></i>
            {successMessage}
          </Alert>
        )}

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : jobs.length === 0 ? (
          <div className="team-empty">
            <i className="bi bi-briefcase" style={{ fontSize: '3rem', color: 'var(--text-gray)' }}></i>
            <h5 className="mt-3">No open positions right now</h5>
            <p className="text-muted">
              We don't have any active vacancies, but we are always happy to hear from talented
              people. Send your CV to <a href="mailto:careers@care4kids.org">careers@care4kids.org</a>.
            </p>
          </div>
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="text-light mb-0">
                Open Positions <Badge bg="primary" className="ms-2">{jobs.length}</Badge>
              </h3>
            </div>
            <Row className="g-4">
              {jobs.map((career) => (
                <Col key={career.careerId} md={6} lg={4}>
                  <CareerCard career={career} onApply={handleApply} />
                </Col>
              ))}
            </Row>
          </>
        )}

        <div className="text-center mt-5">
          <p className="text-muted">
            Don't see the right role? Send your CV to{' '}
            <a href="mailto:careers@care4kids.org">careers@care4kids.org</a> and we'll keep it
            on file.
          </p>
        </div>
      </Container>

      <CareerApplyModal
        show={showModal}
        career={selectedCareer}
        onHide={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

export default CareerPage;
