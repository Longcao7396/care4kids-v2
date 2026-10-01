import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Badge, Alert, Button, Modal, Form, Spinner, ButtonGroup } from 'react-bootstrap';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function TeamAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/team', { params: { activeOnly: false, pageSize: 100 } });
      setItems(Array.isArray(response) ? response : (response?.items || []));
    } catch (err) {
      setError('Failed to load team.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      fullName: '', roleTitle: '', department: '', bio: '',
      photoUrl: '', email: '', linkedInUrl: '', twitterUrl: '', facebookUrl: '',
      displayOrder: 0, isActive: true, isFeatured: false,
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      fullName: item.fullName || '',
      roleTitle: item.roleTitle || '',
      department: item.department || '',
      bio: item.bio || '',
      photoUrl: item.photoUrl || '',
      email: item.email || '',
      linkedInUrl: item.linkedInUrl || '',
      twitterUrl: item.twitterUrl || '',
      facebookUrl: item.facebookUrl || '',
      displayOrder: item.displayOrder || 0,
      isActive: item.isActive !== false,
      isFeatured: !!item.isFeatured,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const payload = { ...form, displayOrder: Number(form.displayOrder) || 0 };
      if (editing) {
        await api.put(`/team/${editing.teamMemberId}`, payload);
      } else {
        await api.post('/team', payload);
      }
      setSuccess(editing ? 'Team member updated.' : 'Team member added.');
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Save failed.');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.fullName}? This cannot be undone.`)) return;
    try {
      await api.delete(`/team/${item.teamMemberId}`);
      setSuccess('Team member deleted.');
      load();
    } catch (err) {
      setError('Delete failed.');
    }
  };

  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="text-light mb-0">Team Members</h4>
        <Button variant="primary" onClick={openCreate}>
          <i className="bi bi-plus-circle me-2"></i>Add Member
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      ) : items.length === 0 ? (
        <Alert variant="info">No team members yet.</Alert>
      ) : (
        <Card>
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Display Order</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.teamMemberId}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <img
                        src={m.photoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.fullName)}
                        alt=""
                        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span className="fw-semibold">{m.fullName}</span>
                    </div>
                  </td>
                  <td>{m.roleTitle}</td>
                  <td>{m.department || '—'}</td>
                  <td>{m.displayOrder}</td>
                  <td>
                    <Badge bg={m.isActive ? 'success' : 'secondary'}>
                      {m.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {m.isFeatured && <Badge bg="warning" className="ms-1">Featured</Badge>}
                  </td>
                  <td className="text-end">
                    <ButtonGroup size="sm">
                      <Button variant="outline-primary" onClick={() => openEdit(m)}>Edit</Button>
                      {isAdmin && (
                        <Button variant="outline-danger" onClick={() => handleDelete(m)}>Delete</Button>
                      )}
                    </ButtonGroup>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered scrollable className="team-admin-modal">
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Edit Team Member' : 'Add Team Member'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <div className="team-admin-form">
              <div className="row g-3">
                {/* Row 1: Full Name | Role Title */}
                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label>Full Name <span className="team-admin-required">*</span></Form.Label>
                    <Form.Control
                      value={form.fullName || ''}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      required
                      maxLength={150}
                      placeholder="Enter full name"
                    />
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label>Role Title <span className="team-admin-required">*</span></Form.Label>
                    <Form.Control
                      value={form.roleTitle || ''}
                      onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
                      required
                      maxLength={150}
                      placeholder="Enter role title"
                    />
                  </Form.Group>
                </div>

                {/* Row 2: Department | Email */}
                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label>Department</Form.Label>
                    <Form.Control
                      value={form.department || ''}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      maxLength={100}
                      placeholder="Enter department"
                    />
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={form.email || ''}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      maxLength={100}
                      placeholder="Enter email address"
                    />
                  </Form.Group>
                </div>

                {/* Row 3: Photo URL (full width) */}
                <div className="col-12">
                  <Form.Group>
                    <Form.Label>Photo URL</Form.Label>
                    <Form.Control
                      value={form.photoUrl || ''}
                      onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                      maxLength={500}
                      placeholder="https://..."
                    />
                  </Form.Group>
                </div>

                {/* Row 4: Bio (full width, 3-4 lines) */}
                <div className="col-12">
                  <Form.Group>
                    <Form.Label>Bio</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={form.bio || ''}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="Enter a short biography..."
                    />
                  </Form.Group>
                </div>

                {/* Row 5: LinkedIn | Twitter | Facebook */}
                <div className="col-md-4">
                  <Form.Group>
                    <Form.Label>LinkedIn URL</Form.Label>
                    <Form.Control
                      value={form.linkedInUrl || ''}
                      onChange={(e) => setForm({ ...form, linkedInUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </Form.Group>
                </div>
                <div className="col-md-4">
                  <Form.Group>
                    <Form.Label>Twitter URL</Form.Label>
                    <Form.Control
                      value={form.twitterUrl || ''}
                      onChange={(e) => setForm({ ...form, twitterUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </Form.Group>
                </div>
                <div className="col-md-4">
                  <Form.Group>
                    <Form.Label>Facebook URL</Form.Label>
                    <Form.Control
                      value={form.facebookUrl || ''}
                      onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </Form.Group>
                </div>

                {/* Row 6: Display Order | Active | Featured */}
                <div className="col-md-4">
                  <Form.Group>
                    <Form.Label>Display Order</Form.Label>
                    <Form.Control
                      type="number"
                      value={form.displayOrder || 0}
                      onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                    />
                  </Form.Group>
                </div>
                <div className="col-md-4">
                  <Form.Group className="team-admin-toggle-field">
                    <Form.Label className="team-admin-toggle-label">Status</Form.Label>
                    <Form.Check
                      type="switch"
                      id="team-admin-is-active"
                      label="Active"
                      checked={!!form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                  </Form.Group>
                </div>
                <div className="col-md-4">
                  <Form.Group className="team-admin-toggle-field">
                    <Form.Label className="team-admin-toggle-label">&nbsp;</Form.Label>
                    <Form.Check
                      type="switch"
                      id="team-admin-is-featured"
                      label="Featured"
                      checked={!!form.isFeatured}
                      onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    />
                  </Form.Group>
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editing ? 'Save Changes' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <style>{`
        /* ──────────────────────────────────────────────
           Team Admin Modal — Form Controls
           High specificity to override any conflicting
           global rules (e.g. AboutPages.css).
           ────────────────────────────────────────────── */

        /* Modal container */
        .team-admin-modal .modal-content {
          border: 0;
          border-radius: 14px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.20);
          overflow: hidden;
        }

        /* Modal header */
        .team-admin-modal .modal-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid #E5E7EB;
          background: #FFFFFF;
        }

        .team-admin-modal .modal-title {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1A1A1A;
          letter-spacing: -0.02em;
        }

        .team-admin-modal .btn-close {
          opacity: 0.55;
        }

        /* Modal body — compact & scrollable */
        .team-admin-modal .modal-body {
          padding: 20px 24px;
          background: #FFFFFF;
        }

        /* Modal footer */
        .team-admin-modal .modal-footer {
          padding: 14px 24px 20px;
          border-top: 1px solid #E5E7EB;
          background: #FFFFFF;
          gap: 10px;
        }

        /* Form container */
        .team-admin-form {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Field group spacing */
        .team-admin-form .form-group {
          margin-bottom: 0;
        }

        /* Labels — placed ABOVE inputs with consistent spacing */
        .team-admin-form .form-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #1A1A1A;
          margin-bottom: 6px;
          letter-spacing: -0.005em;
          line-height: 1.4;
        }

        .team-admin-required {
          color: #B91C1C;
          margin-left: 2px;
        }

        /* Inputs & Textarea — visible borders, light bg, 6px radius, ~40px height */
        .team-admin-form .form-control,
        .team-admin-form .form-control:focus,
        .team-admin-form textarea.form-control,
        .team-admin-form textarea.form-control:focus {
          display: block !important;
          width: 100% !important;
          height: 40px !important;
          min-height: 40px !important;
          padding: 0 12px !important;
          font-family: inherit !important;
          font-size: 0.875rem !important;
          line-height: 1.5 !important;
          color: #1A1A1A !important;
          background-color: #F9FAFB !important;
          border: 1px solid #D1D5DB !important;
          border-radius: 6px !important;
          box-shadow: none !important;
          outline: none !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
        }

        /* Textarea needs slightly different height behavior */
        .team-admin-form textarea.form-control,
        .team-admin-form textarea.form-control:focus {
          height: auto !important;
          min-height: 88px !important;
          padding: 10px 12px !important;
          resize: vertical;
        }

        /* Placeholder */
        .team-admin-form .form-control::placeholder {
          color: #9CA3AF !important;
          opacity: 1 !important;
        }

        /* Focus state */
        .team-admin-form .form-control:focus,
        .team-admin-form .form-control:focus:focus {
          border-color: #0E7490 !important;
          background-color: #FFFFFF !important;
          box-shadow: 0 0 0 3px rgba(14, 116, 144, 0.15) !important;
        }

        /* Hover state */
        .team-admin-form .form-control:hover:not(:focus):not(:disabled) {
          border-color: #9CA3AF;
        }

        /* Disabled state */
        .team-admin-form .form-control:disabled {
          background-color: #F3F4F6 !important;
          color: #6B7280;
          cursor: not-allowed;
        }

        /* Number input — hide spinner buttons for cleaner look */
        .team-admin-form input[type="number"].form-control::-webkit-outer-spin-button,
        .team-admin-form input[type="number"].form-control::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .team-admin-form input[type="number"].form-control {
          -moz-appearance: textfield;
        }

        /* Toggle fields — label alignment */
        .team-admin-toggle-field {
          display: flex;
          flex-direction: column;
        }

        .team-admin-toggle-label {
          display: block !important;
          font-size: 0.8125rem !important;
          font-weight: 600 !important;
          color: #1A1A1A !important;
          margin-bottom: 6px !important;
          line-height: 1.4 !important;
        }

        .team-admin-form .form-check {
          padding-left: 2.5em;
          min-height: 40px;
          display: flex;
          align-items: center;
          margin-top: 0;
          margin-bottom: 0;
        }

        .team-admin-form .form-check-input {
          width: 2.25em;
          height: 1.25em;
          margin-left: -2.5em;
          background-color: #E5E7EB;
          border-color: #D1D5DB;
          cursor: pointer;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }

        .team-admin-form .form-check-input:checked {
          background-color: #0E7490;
          border-color: #0E7490;
        }

        .team-admin-form .form-check-input:focus {
          border-color: #0E7490;
          box-shadow: 0 0 0 3px rgba(14, 116, 144, 0.15);
        }

        .team-admin-form .form-check-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #1A1A1A;
          cursor: pointer;
          padding-top: 2px;
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .team-admin-form .form-control,
          .team-admin-form .form-check-input {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
