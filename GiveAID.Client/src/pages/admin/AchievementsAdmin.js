import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Badge, Alert, Button, Modal, Form, Spinner, ButtonGroup } from 'react-bootstrap';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AchievementsAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/achievements', { params: { activeOnly: false, pageSize: 100 } });
      setItems(Array.isArray(response) ? response : (response?.items || []));
    } catch (err) {
      setError('Failed to load achievements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: '', category: '', description: '', metricValue: '',
      metricLabel: '', metricSuffix: '', achievementDate: '', imageUrl: '',
      icon: 'trophy-fill', awardBy: '', location: '', beneficiaries: '',
      displayOrder: 0, isActive: true, isFeatured: false,
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || '',
      category: item.category || '',
      description: item.description || '',
      metricValue: item.metricValue ?? '',
      metricLabel: item.metricLabel || '',
      metricSuffix: item.metricSuffix || '',
      achievementDate: item.achievementDate ? item.achievementDate.slice(0, 10) : '',
      imageUrl: item.imageUrl || '',
      icon: item.icon || 'trophy-fill',
      awardBy: item.awardBy || '',
      location: item.location || '',
      beneficiaries: item.beneficiaries ?? '',
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
      const payload = {
        ...form,
        metricValue: form.metricValue === '' ? null : Number(form.metricValue),
        beneficiaries: form.beneficiaries === '' ? null : Number(form.beneficiaries),
        displayOrder: Number(form.displayOrder) || 0,
      };
      if (editing) {
        await api.put(`/achievements/${editing.achievementId}`, payload);
      } else {
        await api.post('/achievements', payload);
      }
      setSuccess(editing ? 'Achievement updated.' : 'Achievement added.');
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Save failed.');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await api.delete(`/achievements/${item.achievementId}`);
      setSuccess('Achievement deleted.');
      load();
    } catch (err) {
      setError('Delete failed.');
    }
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="text-light mb-0">Achievements</h4>
        <Button variant="primary" onClick={openCreate}>
          <i className="bi bi-plus-circle me-2"></i>Add Achievement
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      ) : items.length === 0 ? (
        <Alert variant="info">No achievements yet.</Alert>
      ) : (
        <Card>
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Metric</th>
                <th>Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.achievementId}>
                  <td className="fw-semibold">{a.title}</td>
                  <td>{a.category || '—'}</td>
                  <td>
                    {a.metricValue != null
                      ? `${new Intl.NumberFormat('vi-VN').format(a.metricValue)}${a.metricSuffix || ''} ${a.metricLabel || ''}`
                      : '—'}
                  </td>
                  <td>{a.achievementDate ? new Date(a.achievementDate).toLocaleDateString('vi-VN') : '—'}</td>
                  <td>
                    <Badge bg={a.isActive ? 'success' : 'secondary'}>{a.isActive ? 'Active' : 'Inactive'}</Badge>
                    {a.isFeatured && <Badge bg="warning" className="ms-1">Featured</Badge>}
                  </td>
                  <td className="text-end">
                    <ButtonGroup size="sm">
                      <Button variant="outline-primary" onClick={() => openEdit(a)}>Edit</Button>
                      {isAdmin && (
                        <Button variant="outline-danger" onClick={() => handleDelete(a)}>Delete</Button>
                      )}
                    </ButtonGroup>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Edit Achievement' : 'Add Achievement'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <div className="row g-3">
              <div className="col-md-8">
                <Form.Group>
                  <Form.Label>Title *</Form.Label>
                  <Form.Control value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Control value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={100} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label>Metric Value</Form.Label>
                  <Form.Control type="number" value={form.metricValue ?? ''} onChange={(e) => setForm({ ...form, metricValue: e.target.value })} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label>Metric Suffix</Form.Label>
                  <Form.Control value={form.metricSuffix || ''} onChange={(e) => setForm({ ...form, metricSuffix: e.target.value })} placeholder="e.g. +, %, ..." maxLength={20} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label>Metric Label</Form.Label>
                  <Form.Control value={form.metricLabel || ''} onChange={(e) => setForm({ ...form, metricLabel: e.target.value })} placeholder="e.g. Lives Impacted" maxLength={100} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label>Achievement Date</Form.Label>
                  <Form.Control type="date" value={form.achievementDate || ''} onChange={(e) => setForm({ ...form, achievementDate: e.target.value })} />
                </Form.Group>
              </div>
              <div className="col-12">
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control as="textarea" rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Icon (bootstrap-icons name)</Form.Label>
                  <Form.Control value={form.icon || ''} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="trophy-fill" maxLength={50} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Awarded By</Form.Label>
                  <Form.Control value={form.awardBy || ''} onChange={(e) => setForm({ ...form, awardBy: e.target.value })} maxLength={150} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Location</Form.Label>
                  <Form.Control value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={200} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Beneficiaries</Form.Label>
                  <Form.Control type="number" value={form.beneficiaries ?? ''} onChange={(e) => setForm({ ...form, beneficiaries: e.target.value })} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Display Order</Form.Label>
                  <Form.Control type="number" value={form.displayOrder || 0} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="pt-4">
                  <Form.Check type="switch" label="Active" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  <Form.Check type="switch" label="Featured" checked={!!form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                </Form.Group>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editing ? 'Save Changes' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
