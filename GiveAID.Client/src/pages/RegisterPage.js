import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { STORAGE_KEYS } from '../config';
import './AuthPages.css';

function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    profession: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    agreeTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  /* Redirect if already logged in */
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.TOKEN)) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (alert.message) setAlert({ type: '', message: '' });
  };

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = 'Username is required.';
    else if (form.username.length < 3) errs.username = 'Username must be at least 3 characters.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Password must contain at least one uppercase letter.';
    else if (!/[a-z]/.test(form.password)) errs.password = 'Password must contain at least one lowercase letter.';
    else if (!/[0-9]/.test(form.password)) errs.password = 'Password must contain at least one number.';
    else if (!/[^a-zA-Z0-9]/.test(form.password)) errs.password = 'Password must contain at least one special character.';
    if (form.confirmPassword && form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (!form.agreeTerms) errs.agreeTerms = 'You must agree to the terms.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setAlert({ type: '', message: '' });

    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        profession: form.profession.trim() || undefined,
        address: form.address.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
      });
      setAlert({ type: 'success', message: 'Account created successfully! Redirecting to login…' });
      setTimeout(() => navigate('/login'), 2200);
    } catch (err) {
      const rawMsg = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      const cleanMsg = rawMsg.replace(/^\d+\s+/, ''); // strip leading "400 " etc.
      setAlert({ type: 'danger', message: cleanMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background blobs */}
      <div className="auth-bg-blob auth-bg-blob-1" />
      <div className="auth-bg-blob auth-bg-blob-2" />

      <Container>
        <Row className="justify-content-center">
          <Col md={10} lg={8} xl={7}>
            <div className="auth-card">
              <div className="auth-card-bar" />

              <div className="auth-card-body">
                {/* Header */}
                <div className="auth-header text-center">
                  <div className="auth-logo-wrap mb-3">
                    <img 
                      src="/images/branding/Care4Kids_logo_clean.svg" 
                      alt="Care4Kids" 
                      className="auth-logo-image"
                    />
                  </div>
                  <h1 className="auth-title">Create your account</h1>
                  <p className="auth-subtitle">Join Care4Kids and help make a difference in children's lives</p>
                </div>

                {/* Alert */}
                {alert.message && (
                  <Alert variant={alert.type} className="auth-alert" dismissible onClose={() => setAlert({ type: '', message: '' })}>
                    {alert.type === 'success' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                    )}
                    {alert.message}
                  </Alert>
                )}

                {/* Form */}
                <Form onSubmit={handleSubmit} noValidate>
                  <Row>
                    {/* Username */}
                    <Col md={6}>
                      <Form.Group className="auth-form-group">
                        <Form.Label className="auth-label">Username <span className="auth-required">*</span></Form.Label>
                        <div className="auth-input-wrap">
                          <span className="auth-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                            </svg>
                          </span>
                          <Form.Control
                            type="text"
                            name="username"
                            placeholder="Choose a username"
                            value={form.username}
                            onChange={handleChange}
                            className={`auth-input ${errors.username ? 'is-invalid' : ''}`}
                            autoComplete="username"
                          />
                        </div>
                        {errors.username && <div className="auth-field-error">{errors.username}</div>}
                      </Form.Group>
                    </Col>

                    {/* Email */}
                    <Col md={6}>
                      <Form.Group className="auth-form-group">
                        <Form.Label className="auth-label">Email Address <span className="auth-required">*</span></Form.Label>
                        <div className="auth-input-wrap">
                          <span className="auth-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                            </svg>
                          </span>
                          <Form.Control
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={handleChange}
                            className={`auth-input ${errors.email ? 'is-invalid' : ''}`}
                            autoComplete="email"
                          />
                        </div>
                        {errors.email && <div className="auth-field-error">{errors.email}</div>}
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Full name */}
                  <Form.Group className="auth-form-group">
                    <Form.Label className="auth-label">Full Name <span className="auth-required">*</span></Form.Label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                      </span>
                      <Form.Control
                        type="text"
                        name="fullName"
                        placeholder="Enter your full name"
                        value={form.fullName}
                        onChange={handleChange}
                        className={`auth-input ${errors.fullName ? 'is-invalid' : ''}`}
                        autoComplete="name"
                      />
                    </div>
                    {errors.fullName && <div className="auth-field-error">{errors.fullName}</div>}
                  </Form.Group>

                  <Row>
                    {/* Password */}
                    <Col md={6}>
                      <Form.Group className="auth-form-group">
                        <Form.Label className="auth-label">Password <span className="auth-required">*</span></Form.Label>
                        <div className="auth-input-wrap">
                          <span className="auth-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                          </span>
                          <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            placeholder="At least 8 characters: uppercase, lowercase, number, special"
                            value={form.password}
                            onChange={handleChange}
                            className={`auth-input ${errors.password ? 'is-invalid' : ''}`}
                            autoComplete="new-password"
                          />
                          <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password">
                            {showPassword ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                              </svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                              </svg>
                            )}
                          </button>
                        </div>
                        {errors.password && <div className="auth-field-error">{errors.password}</div>}
                      </Form.Group>
                    </Col>

                    {/* Confirm password */}
                    <Col md={6}>
                      <Form.Group className="auth-form-group">
                        <Form.Label className="auth-label">Confirm Password <span className="auth-required">*</span></Form.Label>
                        <div className="auth-input-wrap">
                          <span className="auth-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                          </span>
                          <Form.Control
                            type={showConfirm ? 'text' : 'password'}
                            name="confirmPassword"
                            placeholder="Repeat your password"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            className={`auth-input ${errors.confirmPassword ? 'is-invalid' : ''}`}
                            autoComplete="new-password"
                          />
                          <button type="button" className="auth-password-toggle" onClick={() => setShowConfirm((v) => !v)} aria-label="Toggle confirm password">
                            {showConfirm ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                              </svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                              </svg>
                            )}
                          </button>
                        </div>
                        {errors.confirmPassword && <div className="auth-field-error">{errors.confirmPassword}</div>}
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    {/* Phone */}
                    <Col md={6}>
                      <Form.Group className="auth-form-group">
                        <Form.Label className="auth-label">Phone Number</Form.Label>
                        <div className="auth-input-wrap">
                          <span className="auth-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                          </span>
                          <Form.Control
                            type="tel"
                            name="phone"
                            placeholder="+84 ..."
                            value={form.phone}
                            onChange={handleChange}
                            className="auth-input"
                            autoComplete="tel"
                          />
                        </div>
                      </Form.Group>
                    </Col>

                    {/* Profession */}
                    <Col md={6}>
                      <Form.Group className="auth-form-group">
                        <Form.Label className="auth-label">Profession</Form.Label>
                        <div className="auth-input-wrap">
                          <span className="auth-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                            </svg>
                          </span>
                          <Form.Control
                            type="text"
                            name="profession"
                            placeholder="e.g. Teacher, Engineer"
                            value={form.profession}
                            onChange={handleChange}
                            className="auth-input"
                          />
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Address */}
                  <Form.Group className="auth-form-group">
                    <Form.Label className="auth-label">Address</Form.Label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                      </span>
                      <Form.Control
                        type="text"
                        name="address"
                        placeholder="Your address"
                        value={form.address}
                        onChange={handleChange}
                        className="auth-input"
                        autoComplete="street-address"
                      />
                    </div>
                  </Form.Group>

                  <Row>
                    {/* Date of birth */}
                    <Col md={6}>
                      <Form.Group className="auth-form-group">
                        <Form.Label className="auth-label">Date of Birth</Form.Label>
                        <div className="auth-input-wrap">
                          <span className="auth-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                          </span>
                          <Form.Control
                            type="date"
                            name="dateOfBirth"
                            value={form.dateOfBirth}
                            onChange={handleChange}
                            className="auth-input"
                          />
                        </div>
                      </Form.Group>
                    </Col>

                    {/* Gender */}
                    <Col md={6}>
                      <Form.Group className="auth-form-group">
                        <Form.Label className="auth-label">Gender</Form.Label>
                        <div className="auth-input-wrap">
                          <span className="auth-input-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                          </span>
                          <Form.Select
                            name="gender"
                            value={form.gender}
                            onChange={handleChange}
                            className="auth-input auth-select"
                          >
                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </Form.Select>
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Terms */}
                  <Form.Group className={`auth-form-group ${errors.agreeTerms ? 'has-error' : ''}`}>
                    <Form.Check
                      type="checkbox"
                      name="agreeTerms"
                      id="agreeTerms"
                      className="auth-checkbox"
                      checked={form.agreeTerms}
                      onChange={handleChange}
                      label={
                        <span className="auth-terms-label">
                          I agree to the{' '}
                          <Link to="/terms" className="auth-terms-link">Terms of Service</Link>
                          {' '}and{' '}
                          <Link to="/privacy" className="auth-terms-link">Privacy Policy</Link>
                        </span>
                      }
                    />
                    {errors.agreeTerms && <div className="auth-field-error mt-1">{errors.agreeTerms}</div>}
                  </Form.Group>

                  {/* Submit */}
                  <Button type="submit" className="auth-btn-submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" aria-hidden="true" />
                        <span>Creating account…</span>
                      </>
                    ) : (
                      <span>Create Account</span>
                    )}
                  </Button>
                </Form>

                {/* Footer link */}
                <div className="auth-footer-link text-center">
                  <span className="auth-footer-text">Already have an account? </span>
                  <Link to="/login" className="auth-footer-link-action">Sign in</Link>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default RegisterPage;
