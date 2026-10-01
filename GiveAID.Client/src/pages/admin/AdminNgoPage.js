import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Alert, Button, Modal, Form,
  Spinner, Badge, InputGroup
} from 'react-bootstrap';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import AdminPageFrame from '../../components/AdminPageFrame';
import '../admin/AdminForm.css';

const ORG_TYPES = ['NGO', 'Partner', 'Supporter', 'Corporate', 'Government', 'Other'];
const CONTRIB_TYPES = ['Financial', 'In-Kind', 'Volunteering', 'Sponsorship', 'Other'];

/* ── Validation ────────────────────────────── */
function validate(data, isUpdate = false) {
  const errs = {};
  if (!isUpdate && !data.organizationName?.trim())
    errs.organizationName = 'Organization name is required.';
  if (!isUpdate && !data.organizationType?.trim())
    errs.organizationType = 'Organization type is required.';
  if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail))
    errs.contactEmail = 'Invalid email address.';
  if (data.websiteUrl && !/^https?:\/\/.+/.test(data.websiteUrl))
    errs.websiteUrl = 'Website must start with http:// or https://';
  if (data.contributionAmount && isNaN(Number(data.contributionAmount)))
    errs.contributionAmount = 'Must be a valid number.';
  return errs;
}

const EMPTY_FORM = {
  organizationName: '', organizationType: 'NGO', description: '',
  logoUrl: '', websiteUrl: '', contactEmail: '', contactPhone: '',
  address: '', registrationNumber: '', mission: '', vision: '',
  contributionAmount: '', contributionType: '',
  isActive: true, isFeatured: false, displayOrder: 0,
};

const TYPE_COLORS = {
  NGO: 'supporter-type-NGO',
  Partner: 'supporter-type-Partner',
  Supporter: 'supporter-type-Supporter',
  Corporate: 'supporter-type-Corporate',
  Government: 'supporter-type-Government',
  Other: 'supporter-type-Other',
};

/* ── Organization Form Modal ────────────────── */
function OrgFormModal({ show, editing, initial, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setForm(editing ? {
        ...EMPTY_FORM,
        ...initial,
        contributionAmount: initial.contributionAmount ?? '',
      } : EMPTY_FORM);
      setErrors({});
    }
  }, [show, editing, initial]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form, !!editing);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        contributionAmount: form.contributionAmount ? parseFloat(form.contributionAmount) : null,
        displayOrder: parseInt(form.displayOrder) || 0,
      });
    } finally {
      setSaving(false);
    }
  };

  const field = (label, field, as = 'text', placeholder = '') => (
    <Form.Group className="mb-3">
      <Form.Label>{label}</Form.Label>
      <Form.Control
        type={as} value={form[field]} onChange={set(field)}
        placeholder={placeholder} isInvalid={!!errors[field]}
      />
      {errors[field] && <Form.Control.Feedback type="invalid">{errors[field]}</Form.Control.Feedback>}
    </Form.Group>
  );

  return (
    <Modal show={show} onHide={onClose} size="lg" centered className="admin-modal-dark">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className={`bi ${editing ? 'bi-pencil-square' : 'bi-plus-circle'} me-2 text-accent`}></i>
          {editing ? 'Edit Organization' : 'Add Organization'}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <Col md={8}>
              {field('Organization Name *', 'organizationName', 'text', 'Give-AID Foundation')}
              {field('Registration Number', 'registrationNumber', 'text', 'REG-XXXXXX')}
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Organization Type *</Form.Label>
                <Form.Select
                  value={form.organizationType} onChange={set('organizationType')}
                  isInvalid={!!errors.organizationType}
                >
                  {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Form.Select>
                {errors.organizationType && (
                  <Form.Control.Feedback type="invalid">{errors.organizationType}</Form.Control.Feedback>
                )}
              </Form.Group>
            </Col>
          </Row>
          {field('Description', 'description', 'textarea', 'Brief organization description...')}
          <Row>
            <Col md={6}>{field('Logo URL', 'logoUrl', 'url', 'https://...')}</Col>
            <Col md={6}>{field('Website URL', 'websiteUrl', 'url', 'https://example.org')}</Col>
          </Row>
          <Row>
            <Col md={6}>{field('Contact Email', 'contactEmail', 'email', 'contact@example.org')}</Col>
            <Col md={6}>{field('Contact Phone', 'contactPhone', 'text', '+84...')}</Col>
          </Row>
          {field('Address', 'address', 'text', '123 Street, District, City')}
          <Row>
            <Col md={6}>{field('Mission', 'mission', 'textarea', 'Our mission is...')}</Col>
            <Col md={6}>{field('Vision', 'vision', 'textarea', 'Our vision is...')}</Col>
          </Row>
          <Row>
            <Col md={4}>
              {field('Contribution Amount (VND)', 'contributionAmount', 'number', '10000000')}
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Contribution Type</Form.Label>
                <Form.Select value={form.contributionType} onChange={set('contributionType')}>
                  <option value="">— Select —</option>
                  {CONTRIB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>{field('Display Order', 'displayOrder', 'number', '0')}</Col>
          </Row>
          <Row className="mt-2">
            <Col md={4}>
              <Form.Check type="switch" id="org-is-active" label="Active"
                checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            </Col>
            <Col md={4}>
              <Form.Check type="switch" id="org-is-featured" label="Featured"
                checked={form.isFeatured} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))} />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? (
              <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />Saving...</>
            ) : (
              <><i className={`bi ${editing ? 'bi-check-circle' : 'bi-plus-circle'} me-2`}></i>
              {editing ? 'Update' : 'Add Organization'}</>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

/* ── Detail Modal ──────────────────────────── */
function OrgDetailModal({ org, onClose }) {
  if (!org) return null;
  return (
    <Modal show onHide={onClose} size="lg" centered className="admin-modal-dark">
      <Modal.Header closeButton>
        <Modal.Title>{org.organizationName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={5}>
            <div className="org-detail-logo">
              {org.logoUrl ? (
                <img src={org.logoUrl} alt={org.organizationName}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <div className="org-logo-placeholder">
                  {org.organizationName?.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="mt-3">
              <span className={`partner-type-badge ${TYPE_COLORS[org.organizationType] || 'supporter-type-Other'}`}
                style={{ fontSize: '0.85rem', padding: '5px 14px' }}>
                {org.organizationType}
              </span>
              {org.isFeatured && (
                <Badge bg="warning" text="dark" className="ms-2">★ Featured</Badge>
              )}
            </div>
            <div className="org-detail-meta mt-3">
              {org.websiteUrl && (
                <div><i className="bi bi-globe2"></i>
                  <a href={org.websiteUrl} target="_blank" rel="noopener noreferrer">{org.websiteUrl}</a>
                </div>
              )}
              {org.contactEmail && (
                <div><i className="bi bi-envelope-fill"></i>
                  <a href={`mailto:${org.contactEmail}`}>{org.contactEmail}</a>
                </div>
              )}
              {org.contactPhone && (
                <div><i className="bi bi-telephone-fill"></i>
                  <a href={`tel:${org.contactPhone}`}>{org.contactPhone}</a>
                </div>
              )}
              {org.address && (
                <div><i className="bi bi-geo-alt-fill"></i>{org.address}</div>
              )}
              {org.registrationNumber && (
                <div><i className="bi bi-file-earmark-text-fill"></i>Reg: {org.registrationNumber}</div>
              )}
            </div>
          </Col>
          <Col md={7}>
            {org.description && (
              <div className="mb-3">
                <h6>Description</h6>
                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>{org.description}</p>
              </div>
            )}
            {org.mission && (
              <div className="mb-3">
                <h6><i className="bi bi-bullseye me-1 text-accent"></i>Mission</h6>
                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>{org.mission}</p>
              </div>
            )}
            {org.vision && (
              <div className="mb-3">
                <h6><i className="bi bi-eye me-1 text-accent"></i>Vision</h6>
                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>{org.vision}</p>
              </div>
            )}
            {org.contributionAmount != null && (
              <div>
                <h6><i className="bi bi-cash-stack me-1 text-accent"></i>Contribution</h6>
                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
                    .format(org.contributionAmount)}
                  {org.contributionType && <span className="text-muted"> · {org.contributionType}</span>}
                </p>
              </div>
            )}
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ── Admin NGO Page ─────────────────────────── */
export default function AdminNgoPage() {
  const { user } = useAuth();
  const canAccess = user?.role === 'Admin';

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailOrg, setDetailOrg] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/organizations');
      // res can be array or { items }
      setItems(Array.isArray(res) ? res : (res.items || []));
    } catch {
      setError('Failed to load organizations.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/organizations/stats');
      if (res) setStats(res);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    if (canAccess) { fetchItems(); fetchStats(); }
  }, [canAccess, fetchItems, fetchStats]);

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (item) => { setEditing(item); setShowForm(true); };
  const openDetail = (item) => {
    setDetailOrg(item);
    api.get(`/organizations/${item.organizationId}`).then((res) => {
      setDetailOrg(res);
    }).catch(() => {});
  };

  const handleSave = async (payload) => {
    if (editing) {
      await api.put(`/organizations/${editing.organizationId}`, payload);
    } else {
      await api.post('/organizations', payload);
    }
    setShowForm(false);
    fetchItems();
    fetchStats();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/organizations/${deleteConfirm}`);
      setSuccess('Organization deactivated.');
    } catch {
      setError('Delete failed.');
    } finally {
      setDeleteConfirm(null);
      fetchItems();
      fetchStats();
    }
  };

  const filtered = items.filter((o) => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      o.organizationName?.toLowerCase().includes(s) ||
      o.contactEmail?.toLowerCase().includes(s);
    const matchType = !typeFilter || o.organizationType === typeFilter;
    const matchStatus = !statusFilter ||
      (statusFilter === 'active' && o.isActive) ||
      (statusFilter === 'inactive' && !o.isActive);
    return matchSearch && matchType && matchStatus;
  });

  if (!canAccess) {
    return (
      <Container className="py-5">
        <Alert variant="danger">You do not have permission to access this page.</Alert>
      </Container>
    );
  }

  return (
    <AdminPageFrame
      eyebrow="Content · Organizations"
      title="Organization management"
      sub="Manage NGOs, partners, corporate sponsors and other organizations."
      error={error}
      success={success}
      actions={
        <button type="button" className="af-btn af-btn-primary" onClick={openAdd}>
          <i className="bi bi-plus-circle" aria-hidden="true"></i>
          <span>New organization</span>
        </button>
      }
    >

        {/* Stats Row */}
        {stats && (
          <Row className="g-3 mb-4">
            <Col md={2}>
              <Card className="stat-card-sm">
                <Card.Body>
                  <div className="stat-sm-num">{stats.total}</div>
                  <p className="stat-sm-label">Total</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={2}>
              <Card className="stat-card-sm">
                <Card.Body>
                  <div className="stat-sm-num text-success">{stats.active}</div>
                  <p className="stat-sm-label">Active</p>
                </Card.Body>
              </Card>
            </Col>
            {Object.entries(stats.byType || {}).map(([type, count]) => (
              <Col key={type} md={2}>
                <Card className="stat-card-sm">
                  <Card.Body>
                    <div className="stat-sm-num">{count}</div>
                    <p className="stat-sm-label">{type}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Toolbar */}
        <div className="team-filter-bar mb-3">
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Group>
                <Form.Label className="text-light fw-semibold mb-1">Search</Form.Label>
                <InputGroup>
                  <Form.Control type="text" placeholder="Name or email..."
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                  {search && (
                    <InputGroup.Text style={{ cursor: 'pointer' }} onClick={() => setSearch('')}>
                      <i className="bi bi-x-circle"></i>
                    </InputGroup.Text>
                  )}
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="text-light fw-semibold mb-1">Type</Form.Label>
                <Form.Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">All Types</option>
                  {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="text-light fw-semibold mb-1">Status</Form.Label>
                <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Button variant="primary" className="w-100" onClick={openAdd}>
                <i className="bi bi-plus-circle me-2"></i>Add Org
              </Button>
            </Col>
          </Row>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="team-empty">
            <i className="bi bi-buildings" style={{ fontSize: '3rem', color: 'var(--text-gray)' }}></i>
            <h5 className="mt-3">No organizations found</h5>
            <p className="text-muted">{(search || typeFilter || statusFilter) ? 'Try adjusting your filters.' : 'Click "Add Org" to create your first organization.'}</p>
          </div>
        ) : (
          <Row className="g-3">
            {filtered.map((o) => (
              <Col key={o.organizationId} xs={12} sm={6} lg={4}>
                <div className={`org-admin-card ${!o.isActive ? 'inactive' : ''}`}>
                  <div className="org-admin-card-header">
                    <div className="org-admin-logo">
                      {o.logoUrl ? (
                        <img src={o.logoUrl} alt={o.organizationName}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <span className="org-logo-placeholder">
                          {o.organizationName?.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="org-admin-meta">
                      <h6 className="org-admin-name">{o.organizationName}</h6>
                      <span className={`partner-type-badge ${TYPE_COLORS[o.organizationType] || 'supporter-type-Other'}`}
                        style={{ fontSize: '0.65rem' }}>
                        {o.organizationType}
                      </span>
                      {o.isFeatured && <Badge bg="warning" text="dark" className="ms-1" style={{ fontSize: '0.6rem' }}>★</Badge>}
                    </div>
                  </div>
                  <div className="org-admin-body">
                    {o.description && (
                      <p className="org-admin-desc">
                        {o.description.length > 90 ? o.description.slice(0, 90) + '…' : o.description}
                      </p>
                    )}
                    <div className="org-admin-contrib">
                      {o.contributionAmount != null ? (
                        <>
                          <i className="bi bi-cash-stack"></i>
                          <span>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
                              .format(o.contributionAmount)}
                          </span>
                          {o.contributionType && <span className="text-muted"> · {o.contributionType}</span>}
                        </>
                      ) : (
                        <span className="text-muted">No contribution recorded</span>
                      )}
                    </div>
                  </div>
                  <div className="org-admin-actions">
                    <Button variant="outline-primary" size="sm" onClick={() => openDetail(o)} title="View">
                      <i className="bi bi-eye"></i>
                    </Button>
                    <Button variant="outline-primary" size="sm" onClick={() => openEdit(o)} title="Edit">
                      <i className="bi bi-pencil"></i>
                    </Button>
                    {user?.role === 'Admin' && (
                      <Button variant="outline-danger" size="sm"
                        onClick={() => setDeleteConfirm(o.organizationId)} title="Deactivate">
                        <i className="bi bi-trash"></i>
                      </Button>
                    )}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        )}

        <p className="text-muted small mt-3">Showing {filtered.length} of {items.length} organization(s)</p>

      <OrgFormModal
        show={showForm}
        editing={!!editing}
        initial={editing || EMPTY_FORM}
        onSave={handleSave}
        onClose={() => setShowForm(false)}
      />
      <OrgDetailModal org={detailOrg} onClose={() => setDetailOrg(null)} />

      <Modal show={!!deleteConfirm} onHide={() => setDeleteConfirm(null)} centered className="admin-modal-dark">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
            Deactivate Organization
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure? The organization will be hidden from the public website.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Deactivate</Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .stat-card-sm {
          background: var(--bg-card);
          border: 1px solid var(--border-slate);
          border-radius: var(--radius-md);
          text-align: center;
        }
        .stat-card-sm .card-body { padding: 0.75rem; }
        .stat-sm-num { font-size: 1.6rem; font-weight: 800; color: var(--accent-sky); line-height: 1.2; }
        .stat-sm-num.text-success { color: #10B981; }
        .stat-sm-label { font-size: 0.7rem; color: var(--text-gray); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
        .org-admin-card {
          background: var(--bg-card);
          border: 1px solid var(--border-slate);
          border-radius: var(--radius-lg);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: all var(--transition-fast);
        }
        .org-admin-card:hover { border-color: rgba(56,189,248,0.4); transform: translateY(-2px); }
        .org-admin-card.inactive { opacity: 0.55; }
        .org-admin-card-header {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          border-bottom: 1px solid var(--border-slate);
          background: rgba(56,189,248,0.04);
          align-items: flex-start;
        }
        .org-admin-logo {
          width: 52px; height: 52px;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--primary-slate);
          border: 1px solid var(--border-slate);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .org-admin-logo img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
        .org-logo-placeholder {
          font-size: 1.1rem; font-weight: 800;
          color: var(--accent-sky);
          background: linear-gradient(135deg, rgba(56,189,248,0.15), rgba(59,130,246,0.15));
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
        }
        .org-admin-meta { flex: 1; min-width: 0; }
        .org-admin-name { color: var(--text-light); font-weight: 700; font-size: 0.9rem; margin-bottom: 0.3rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .org-admin-body { padding: 0.75rem 1rem; flex: 1; }
        .org-admin-desc { color: var(--text-gray); font-size: 0.82rem; line-height: 1.5; margin-bottom: 0.5rem; }
        .org-admin-contrib { font-size: 0.8rem; color: var(--text-gray); display: flex; align-items: center; gap: 0.4rem; }
        .org-admin-contrib i { color: var(--accent-sky); }
        .org-admin-actions {
          display: flex;
          gap: 0.4rem;
          padding: 0.75rem 1rem;
          border-top: 1px solid var(--border-slate);
          justify-content: flex-end;
        }
        .org-detail-logo {
          width: 100%; aspect-ratio: 4/3;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--primary-slate);
          border: 1px solid var(--border-slate);
          display: flex; align-items: center; justify-content: center;
        }
        .org-detail-logo img { width: 100%; height: 100%; object-fit: contain; }
        .org-detail-meta { display: flex; flex-direction: column; gap: 0.5rem; }
        .org-detail-meta > div { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-gray); }
        .org-detail-meta i { color: var(--accent-sky); width: 16px; }
        .org-detail-meta a { color: var(--accent-sky); }
        .admin-modal-dark .modal-content { background: var(--bg-card); border: 1px solid var(--border-slate); color: var(--text-light); }
        .admin-modal-dark .modal-header, .admin-modal-dark .modal-footer { border-color: var(--border-slate); }
        .admin-modal-dark .btn-close { filter: invert(1); opacity: 0.5; }
        .admin-modal-dark .form-label { color: var(--text-light); font-size: 0.875rem; font-weight: 600; }
        .admin-modal-dark .form-control, .admin-modal-dark .form-select {
          background: var(--primary-slate); border: 1px solid var(--border-slate); color: var(--text-light);
        }
        .admin-modal-dark .form-control:focus, .admin-modal-dark .form-select:focus {
          border-color: var(--accent-sky);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.15);
          background: var(--primary-slate); color: var(--text-light);
        }
        .supporter-type-Supporter { background: rgba(56,189,248,0.15); color: #38BDF8; }
        .supporter-type-Partner   { background: rgba(168,85,247,0.15); color: #A855F7; }
        .supporter-type-NGO       { background: rgba(16,185,129,0.15); color: #10B981; }
        .supporter-type-Corporate  { background: rgba(249,115,22,0.15); color: #F97316; }
        .supporter-type-Government { background: rgba(99,102,241,0.15); color: #6366F1; }
        .supporter-type-Other      { background: rgba(107,114,128,0.15); color: #9CA3AF; }
      `}</style>
    </AdminPageFrame>
  );
}
