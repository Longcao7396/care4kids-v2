import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Badge, Alert, Button, Modal, Form, Spinner, ButtonGroup } from 'react-bootstrap';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function CareersAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [applications, setApplications] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/careers', { params: { activeOnly: false } });
      setItems(Array.isArray(response) ? response : (response?.items || []));
    } catch (err) {
      setError('Failed to load careers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      positionTitle: '', department: '', description: '', requirements: '',
      responsibilities: '', location: '', employmentType: 'FullTime',
      salaryRange: '', vacancies: 1, postedDate: new Date().toISOString().slice(0, 10),
      closingDate: '', isActive: true,
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      positionTitle: item.positionTitle || '',
      department: item.department || '',
      description: item.description || '',
      requirements: item.requirements || '',
      responsibilities: item.responsibilities || '',
      location: item.location || '',
      employmentType: item.employmentType || 'FullTime',
      salaryRange: item.salaryRange || '',
      vacancies: item.vacancies || 1,
      postedDate: item.postedDate ? item.postedDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      closingDate: item.closingDate ? item.closingDate.slice(0, 10) : '',
      isActive: item.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const payload = {
        ...form,
        vacancies: Number(form.vacancies) || 1,
        postedDate: form.postedDate || new Date().toISOString().slice(0, 10),
        closingDate: form.closingDate || null,
      };
      if (editing) {
        await api.put(`/careers/${editing.careerId}`, payload);
      } else {
        await api.post('/careers', payload);
      }
      setSuccess(editing ? 'Career updated.' : 'Career posted.');
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Save failed.');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Deactivate "${item.positionTitle}"? This is a soft-delete.`)) return;
    try {
      await api.delete(`/careers/${item.careerId}`);
      setSuccess('Career deactivated.');
      load();
    } catch (err) {
      setError('Delete failed.');
    }
  };

  const viewApplications = async (item) => {
    setViewing(item);
    try {
      const response = await api.get(`/careers/${item.careerId}/applications`);
      setApplications(Array.isArray(response) ? response : (response?.items || []));
    } catch (err) {
      setApplications([]);
    }
  };

  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="text-light mb-0">Job Postings</h4>
        <Button variant="primary" onClick={openCreate}>
          <i className="bi bi-plus-circle me-2"></i>Post Job
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      ) : items.length === 0 ? (
        <Alert variant="info">No job postings yet.</Alert>
      ) : (
        <Card>
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th>Position</th>
                <th>Department</th>
                <th>Type</th>
                <th>Closing</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.careerId}>
                  <td className="fw-semibold">{c.positionTitle}</td>
                  <td>{c.department || '—'}</td>
                  <td><Badge bg="info">{c.employmentType}</Badge></td>
                  <td>{c.closingDate ? new Date(c.closingDate).toLocaleDateString('vi-VN') : '—'}</td>
                  <td>
                    <Badge bg={c.isActive ? 'success' : 'secondary'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="text-end">
                    <ButtonGroup size="sm">
                      <Button variant="outline-info" onClick={() => viewApplications(c)}>Applications</Button>
                      <Button variant="outline-primary" onClick={() => openEdit(c)}>Edit</Button>
                      {isAdmin && (
                        <Button variant="outline-danger" onClick={() => handleDelete(c)}>Delete</Button>
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
          <Modal.Title>{editing ? 'Edit Job' : 'Post a Job'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <div className="row g-3">
              <div className="col-md-8">
                <Form.Group>
                  <Form.Label>Position Title *</Form.Label>
                  <Form.Control value={form.positionTitle || ''} onChange={(e) => setForm({ ...form, positionTitle: e.target.value })} required maxLength={150} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Department</Form.Label>
                  <Form.Control value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} maxLength={100} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Location</Form.Label>
                  <Form.Control value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={100} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Employment Type</Form.Label>
                  <Form.Select value={form.employmentType || 'FullTime'} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
                    <option value="FullTime">Full-time</option>
                    <option value="PartTime">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Volunteer">Volunteer</option>
                    <option value="Internship">Internship</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Salary Range</Form.Label>
                  <Form.Control value={form.salaryRange || ''} onChange={(e) => setForm({ ...form, salaryRange: e.target.value })} />
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
                  <Form.Label>Requirements</Form.Label>
                  <Form.Control as="textarea" rows={3} value={form.requirements || ''} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Responsibilities</Form.Label>
                  <Form.Control as="textarea" rows={3} value={form.responsibilities || ''} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label>Vacancies</Form.Label>
                  <Form.Control type="number" min="1" value={form.vacancies || 1} onChange={(e) => setForm({ ...form, vacancies: e.target.value })} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label>Posted Date</Form.Label>
                  <Form.Control type="date" value={form.postedDate || ''} onChange={(e) => setForm({ ...form, postedDate: e.target.value })} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label>Closing Date</Form.Label>
                  <Form.Control type="date" value={form.closingDate || ''} onChange={(e) => setForm({ ...form, closingDate: e.target.value })} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="pt-4">
                  <Form.Check type="switch" label="Active" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                </Form.Group>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editing ? 'Save Changes' : 'Post Job'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!viewing} onHide={() => setViewing(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Applications for "{viewing?.positionTitle}"</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {applications.length === 0 ? (
            <Alert variant="info">No applications received yet.</Alert>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.applicationId}>
                    <td className="fw-semibold">{a.applicantName}</td>
                    <td><a href={`mailto:${a.email}`}>{a.email}</a></td>
                    <td>{a.phone || '—'}</td>
                    <td>{new Date(a.appliedAt).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
