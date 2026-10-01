import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Alert, Spinner } from 'react-bootstrap';
import { contactService } from '../services';
import api from '../services/api';
import { sanitizeHtml } from '../utils/safeHtml';
import './ContactPage.css';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [cmsPage, setCmsPage] = useState(null);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await api.get('/cms/pages/contact_info');
        if (!cancelled) setCmsPage(response || null);
      } catch {
        // Non-fatal
      } finally {
        if (!cancelled) {
          // intentionally no UI feedback for CMS load; page falls back to defaults
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // api.js rejects whenever the envelope reports success === false, so
      // reaching this line means the submission was accepted.
      await contactService.submit(formData);
      setSuccess('Thank you for contacting us. We will get back to you within 2 business days.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      const msg = err.response?.data?.Message || err.response?.data?.message || err.message || 'Failed to send message. Please try again later.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Safe placeholder shown only if the CMS contact_info page fails to load.
  // Intentionally non-specific: no invented phone, email, or address.
  const fallbackNotice =
    'Our full contact details will appear here once the admin has published them. In the meantime, please use the form below and our team will respond by email.';

  // Contact info cards. Each channel renders a static label and icon, but
  // the actual contact details (when present) come from the CMS contact_info
  // page so there is one source of truth. If CMS data is missing, we show a
  // generic placeholder instead of inventing a phone/email/address.
  const contactChannels = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      ),
      title: 'Email Us',
      lines: cmsPage?.content
        ? ['See the contact information panel for our email address.']
        : [fallbackNotice]
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
      ),
      title: 'Response Time',
      lines: ['We aim to respond within 2 business days.']
    }
  ];

  return (
    <div className="cp-page">

      {/* ─── HERO ─── */}
      <section className="cp-hero">
        <Container className="cp-hero-content">
          <p className="eyebrow">Get in Touch</p>
          <h1 className="cp-hero-title">Contact Care4Kids</h1>
          <p className="cp-hero-sub">
            Have a question about our work, want to partner with us, or interested in volunteering?
            We'd love to hear from you. Choose the channel that works best for you.
          </p>
        </Container>
      </section>

      {/* ─── CONTACT CHANNELS ─── */}
      <section className="cp-channels">
        <Container>
          <div className="cp-channels-grid">
            {contactChannels.map((channel, i) => (
              <div key={i} className="cp-channel-card">
                <div className="cp-channel-icon">{channel.icon}</div>
                <h3 className="cp-channel-title">{channel.title}</h3>
                {channel.lines.map((line, j) => (
                  <p key={j} className="cp-channel-line">{line}</p>
                ))}
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ─── FORM + MAP ─── */}
      <section className="cp-form-section">
        <Container>
          <Row className="cp-form-row">

            {/* Left — Form */}
            <Col lg={7}>
              <div className="cp-form-card">
                <p className="eyebrow">Send a Message</p>
                <h2 className="cp-form-title">How Can We Help?</h2>
                <p className="cp-form-desc">
                  Fill out the form below and we'll get back to you within 2 business days.
                </p>

                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
                    {success}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit} className="cp-form">
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-4">
                        <Form.Label className="cp-label">Your Name *</Form.Label>
                        <Form.Control
                          type="text"
                          name="name"
                          placeholder="Full name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          maxLength={100}
                          className="cp-input"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-4">
                        <Form.Label className="cp-label">Email *</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          maxLength={100}
                          className="cp-input"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-4">
                        <Form.Label className="cp-label">Phone (Optional)</Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          placeholder="+84 ..."
                          value={formData.phone}
                          onChange={handleChange}
                          maxLength={20}
                          className="cp-input"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-4">
                        <Form.Label className="cp-label">Subject *</Form.Label>
                        <Form.Control
                          type="text"
                          name="subject"
                          placeholder="How can we help?"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          maxLength={200}
                          className="cp-input"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-4">
                    <Form.Label className="cp-label">Message *</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={6}
                      name="message"
                      placeholder="Please describe your inquiry in detail..."
                      value={formData.message}
                      onChange={handleChange}
                      required
                      className="cp-input cp-textarea"
                    />
                    <Form.Text className="cp-help">{formData.message.length} characters</Form.Text>
                  </Form.Group>

                  <button type="submit" className="btn-coral btn-lg cp-submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        Send Message
                      </>
                    )}
                  </button>
                </Form>
              </div>
            </Col>

            {/* Right — CMS contact info + Map */}
            <Col lg={5}>
              <div className="cp-sidebar">
                {cmsPage?.content && (
                  <div className="cp-info-card">
                    <p className="eyebrow">{cmsPage.pageTitle || 'Additional Information'}</p>
                    <div
                      className="cp-cms-content"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(cmsPage.content) }}
                    />
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

export default ContactPage;
