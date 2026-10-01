import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './ProfilePage.css';

const EMPTY_PROFILE = {
  fullName: '',
  phone: '',
  address: '',
  profession: '',
  gender: '',
  dateOfBirth: '',
};

const ProfilePage = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const load = async () => {
      try {
        const u = await api.get('/users/me');
        if (u) {
          setProfile({
            fullName: u.fullName || '',
            phone: u.phone || '',
            address: u.address || '',
            profession: u.profession || '',
            gender: u.gender || '',
            dateOfBirth: u.dateOfBirth ? u.dateOfBirth.slice(0, 10) : '',
          });
        }
      } catch (err) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, navigate]);

  const set = (field) => (e) =>
    setProfile((p) => ({ ...p, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Password validation only if user is trying to change password
    const changingPw = pwNew.length > 0 || pwCurrent.length > 0;
    if (changingPw) {
      if (!pwCurrent) {
        setError('Enter your current password to change it.');
        return;
      }
      if (pwNew.length < 6) {
        setError('New password must be at least 6 characters.');
        return;
      }
      if (pwNew !== pwConfirm) {
        setError('New passwords do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        fullName: profile.fullName,
        phone: profile.phone || null,
        address: profile.address || null,
        profession: profile.profession || null,
        gender: profile.gender || null,
        dateOfBirth: profile.dateOfBirth || null,
        currentPassword: changingPw ? pwCurrent : null,
        newPassword: changingPw ? pwNew : null,
      };
      await api.put('/users/me', payload);
      setSuccess('Profile updated successfully.');
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
      // Refresh local user context if name changed
      if (refreshUser) await refreshUser();
    } catch (err) {
      setError(err.response?.data?.Message || err.response?.data?.message || err.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container className="py-5 profile-page">
      <Row className="justify-content-center">
        <Col lg={8}>
          <div className="text-center mb-4">
            <h2 className="fw-bold">My Profile</h2>
            <p className="text-muted">Update your personal information and password.</p>
          </div>

          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

          <Card className="shadow-sm">
            <Card.Body>
              <Form onSubmit={handleSave}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Username</Form.Label>
                      <Form.Control type="text" value={user?.username || ''} disabled />
                      <Form.Text className="text-muted">Username cannot be changed.</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control type="email" value={user?.email || ''} disabled />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={profile.fullName}
                    onChange={set('fullName')}
                    required
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone</Form.Label>
                      <Form.Control type="tel" value={profile.phone} onChange={set('phone')} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date of Birth</Form.Label>
                      <Form.Control type="date" value={profile.dateOfBirth} onChange={set('dateOfBirth')} />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Profession</Form.Label>
                      <Form.Control type="text" value={profile.profession} onChange={set('profession')} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Gender</Form.Label>
                      <Form.Select value={profile.gender} onChange={set('gender')}>
                        <option value="">Prefer not to say</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control as="textarea" rows={2} value={profile.address} onChange={set('address')} />
                </Form.Group>

                <hr className="my-4" />
                <h5 className="mb-3">Change Password</h5>
                <p className="text-muted small mb-3">Leave blank to keep your current password.</p>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Current Password</Form.Label>
                      <Form.Control
                        type="password"
                        value={pwCurrent}
                        onChange={(e) => setPwCurrent(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>New Password</Form.Label>
                      <Form.Control
                        type="password"
                        value={pwNew}
                        onChange={(e) => setPwNew(e.target.value)}
                        minLength={6}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Confirm New Password</Form.Label>
                      <Form.Control
                        type="password"
                        value={pwConfirm}
                        onChange={(e) => setPwConfirm(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex justify-content-between mt-4">
                  <Button variant="outline-danger" type="button" onClick={() => { logout(); navigate('/'); }}>
                    Log out
                  </Button>
                  <Button variant="primary" type="submit" disabled={saving}>
                    {saving ? (
                      <><Spinner as="span" animation="border" size="sm" className="me-2" />Saving…</>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProfilePage;
