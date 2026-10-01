import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Badge, Alert, Button, Modal, Form, Spinner, ButtonGroup } from 'react-bootstrap';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function SupportersAdmin() {
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
      const response = await api.get('/supporters', { params: { activeOnly: false } });
      setItems(Array.isArray(response) ? response : (response?.items || []));
    } catch (err) {
      setError('Failed to load supporters.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      organizationName: '', organizationType: 'Supporter', description: '', logoUrl: '',
      websiteUrl: '', contactEmail: '', contactPhone: '', address: '',
      contributionAmount: '', contributionType: 'Financial',
      isActive: true, isFeatured: false, displayOrder: 0,
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      organizationName: item.organizationName || '',
      organizationType: item.organizationType || 'Supporter',
      description: item.description || '',
      logoUrl: item.logoUrl || '',
      websiteUrl: item.websiteUrl || '',
      contactEmail: item.contactEmail || '',
      contactPhone: item.contactPhone || '',
      address: item.address || '',
      contributionAmount: item.contributionAmount ?? '',
      contributionType: item.contributionType || 'Financial',
      isActive: item.isActive !== false,
      isFeatured: !!item.isFeatured,
      displayOrder: item.displayOrder || 0,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const payload = {
        ...form,
        contributionAmount: form.contributionAmount === '' ? null : Number(form.contributionAmount),
        displayOrder: Number(form.displayOrder) || 0,
      };
      if (editing) {
        await api.put(`/supporters/${editing.organizationId}`, payload);
      } else {
        await api.post('/supporters', payload);
      }
      setSuccess(editing ? 'Supporter updated.' : 'Supporter added.');
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Save failed.');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Deactivate "${item.organizationName}"?`)) return;
    try {
      await api.delete(`/supporters/${item.organizationId}`);
      setSuccess('Supporter deactivated.');
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
        <h4 className="text-light mb-0">Supporters & Partners</h4>
        <Button variant="primary" onClick={openCreate}>
          <i className="bi bi-plus-circle me-2"></i>Add Supporter
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      ) : items.length === 0 ? (
        <Alert variant="info">No supporters yet.</Alert>
      ) : (
        <Card>
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Email</th>
                <th>Display Order</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.organizationId}>
                  <td className="fw-semibold">{o.organizationName}</td>
                  <td><Badge bg="info">{o.organizationType}</Badge></td>
                  <td>{o.contactEmail || '—'}</td>
                  <td>{o.displayOrder}</td>
                  <td>
                    <Badge bg={o.isActive ? 'success' : 'secondary'}>{o.isActive ? 'Active' : 'Inactive'}</Badge>
                    {o.isFeatured && <Badge bg="warning" className="ms-1">Featured</Badge>}
                  </td>
                  <td className="text-end">
                    <ButtonGroup size="sm">
                      <Button variant="outline-primary" onClick={() => openEdit(o)}>Edit</Button>
                      {isAdmin && (
                        <Button variant="outline-danger" onClick={() => handleDelete(o)}>Delete</Button>
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
          <Modal.Title>{editing ? 'Edit Supporter' : 'Add Supporter'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <div className="row g-3">
              <div className="col-md-8">
                <Form.Group>
                  <Form.Label>Organization Name *</Form.Label>
                  <Form.Control value={form.organizationName || ''} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} required maxLength={150} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Type</Form.Label>
                  <Form.Select value={form.organizationType || 'Supporter'} onChange={(e) => setForm({ ...form, organizationType: e.target.value })}>
                    <option value="Supporter">Supporter</option>
                    <option value="Partner">Partner</option>
                    <option value="NGO">NGO</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-12">
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control as="textarea" rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Logo URL</Form.Label>
                  <Form.Control value={form.logoUrl || ''} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} maxLength={255} />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Website URL</Form.Label>
                  <Form.Control value={form.websiteUrl || ''} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} maxLength={200} />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Contact Email</Form.Label>
                  <Form.Control type="email" value={form.contactEmail || ''} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} maxLength={100} />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Contact Phone</Form.Label>
                  <Form.Control value={form.contactPhone || ''} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} maxLength={20} />
                </Form.Group>
              </div>
              <div className="col-12">
                <Form.Group>
                  <Form.Label>Address</Form.Label>
                  <Form.Control value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={255} />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Contribution Type</Form.Label>
                  <Form.Select value={form.contributionType || 'Financial'} onChange={(e) => setForm({ ...form, contributionType: e.target.value })}>
                    <option value="Financial">Financial</option>
                    <option value="InKind">In-kind</option>
                    <option value="Volunteer">Volunteer</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Contribution Amount (VND)</Form.Label>
                  <Form.Control type="number" value={form.contributionAmount ?? ''} onChange={(e) => setForm({ ...form, contributionAmount: e.target.value })} />
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
