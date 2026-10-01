import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Alert, Button,
  Modal, Form, Spinner
} from 'react-bootstrap';
import { achievementsService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import AdminPageFrame from '../../components/AdminPageFrame';
import '../admin/AdminForm.css';

/* ─────────────────────────────────────────────────
 * AdminAchievementsPage
 *   Manage organisation achievements / impact stats.
 * ───────────────────────────────────────────────── */

const CATEGORIES = ['Education', 'Healthcare', 'Community', 'Environment', 'Award', 'Impact'];

function validate(data) {
  const errs = {};
  if (!data.title?.trim()) errs.title = 'Title is required.';
  if (data.metricValue && isNaN(Number(data.metricValue)))
    errs.metricValue = 'Must be a number.';
  return errs;
}

const EMPTY_FORM = {
  title: '',
  category: '',
  description: '',
  metricValue: '',
  metricLabel: '',
  metricSuffix: '',
  achievementDate: '',
  imageUrl: '',
  icon: '',
  awardBy: '',
  location: '',
  beneficiaries: '',
  displayOrder: 0,
  isActive: true,
  isFeatured: false,
};

function AchievementFormModal({ show, editing, initial, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setForm({
        ...EMPTY_FORM,
        ...(editing ? initial : {}),
        achievementDate: initial.achievementDate
          ? String(initial.achievementDate).slice(0, 10)
          : '',
        metricValue: initial.metricValue ?? '',
        beneficiaries: initial.beneficiaries ?? '',
      });
      setErrors({});
    }
  }, [show, editing, initial]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        metricValue: form.metricValue === '' ? null : parseFloat(form.metricValue),
        beneficiaries: form.beneficiaries === '' ? null : parseInt(form.beneficiaries),
        displayOrder: parseInt(form.displayOrder) || 0,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" centered className="admin-modal-dark">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className={`bi ${editing ? 'bi-pencil-square' : 'bi-plus-circle'} me-2 text-accent`}></i>
          {editing ? 'Edit achievement' : 'New achievement'}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label>Title *</Form.Label>
                <Form.Control
                  value={form.title || ''}
                  onChange={set('title')}
                  isInvalid={!!errors.title}
                  placeholder="e.g. Reached 10,000 children with school meals"
                />
                {errors.title && <Form.Control.Feedback type="invalid">{errors.title}</Form.Control.Feedback>}
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Category</Form.Label>
                <Form.Select value={form.category || ''} onChange={set('category')}>
                  <option value="">— Select —</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={form.description || ''}
              onChange={set('description')}
              placeholder="Describe the impact, who it helped, and what changed…"
            />
          </Form.Group>

          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Metric value</Form.Label>
                <Form.Control
                  type="number"
                  value={form.metricValue}
                  onChange={set('metricValue')}
                  isInvalid={!!errors.metricValue}
                  placeholder="10000"
                />
                {errors.metricValue && <Form.Control.Feedback type="invalid">{errors.metricValue}</Form.Control.Feedback>}
              </Form.Group>
            </Col>
            <Col md={5}>
              <Form.Group className="mb-3">
                <Form.Label>Metric label</Form.Label>
                <Form.Control
                  value={form.metricLabel || ''}
                  onChange={set('metricLabel')}
                  placeholder="Children fed annually"
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>Suffix</Form.Label>
                <Form.Control
                  value={form.metricSuffix || ''}
                  onChange={set('metricSuffix')}
                  placeholder="+, %, …"
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>Beneficiaries</Form.Label>
                <Form.Control
                  type="number"
                  value={form.beneficiaries}
                  onChange={set('beneficiaries')}
                  placeholder="500"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Awarded by</Form.Label>
                <Form.Control
                  value={form.awardBy || ''}
                  onChange={set('awardBy')}
                  placeholder="e.g. Ministry of Education"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Location</Form.Label>
                <Form.Control
                  value={form.location || ''}
                  onChange={set('location')}
                  placeholder="Ho Chi Minh City"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Date achieved</Form.Label>
                <Form.Control
                  type="date"
                  value={form.achievementDate || ''}
                  onChange={set('achievementDate')}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Display order</Form.Label>
                <Form.Control
                  type="number"
                  value={form.displayOrder || 0}
                  onChange={set('displayOrder')}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Image URL</Form.Label>
                <Form.Control
                  type="url"
                  value={form.imageUrl || ''}
                  onChange={set('imageUrl')}
                  placeholder="https://..."
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mt-2">
            <Col md={6}>
              <Form.Check
                type="switch"
                id="ach-active"
                label="Active"
                checked={!!form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
            </Col>
            <Col md={6}>
              <Form.Check
                type="switch"
                id="ach-featured"
                label="Featured on home page"
                checked={!!form.isFeatured}
                onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
              />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? (
              <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              Saving…</>
            ) : (
              <><i className={`bi ${editing ? 'bi-check-circle' : 'bi-plus-circle'} me-2`}></i>
              {editing ? 'Update' : 'Create'}</>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function AdminAchievementsPage() {
  const { user } = useAuth();
  const canAccess = user?.role === 'Admin';

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [itemsRes, statsRes] = await Promise.all([
        achievementsService.getAll({ activeOnly: false }),
        achievementsService.getStats().catch(() => null),
      ]);
      setItems(Array.isArray(itemsRes) ? itemsRes : (itemsRes?.items || []));
      if (statsRes) setStats(statsRes);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load achievements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (canAccess) fetchAll(); }, [canAccess, fetchAll]);

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (item) => { setEditing(item); setShowForm(true); };

  const handleSave = async (payload) => {
    if (editing) {
      await achievementsService.update(editing.achievementId, payload);
    } else {
      await achievementsService.create(payload);
    }
    setShowForm(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await achievementsService.remove(deleteConfirm);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete achievement.');
    } finally {
      setDeleteConfirm(null);
      fetchAll();
    }
  };

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  const filtered = items.filter((it) => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      it.title?.toLowerCase().includes(s) ||
      it.description?.toLowerCase().includes(s) ||
      it.metricLabel?.toLowerCase().includes(s);
    const matchCat = !categoryFilter || it.category === categoryFilter;
    return matchSearch && matchCat;
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
      eyebrow="Content · Achievements"
      title="Achievements & impact"
      sub="The milestones, awards, and impact metrics that tell the story of Care4Kids."
      error={errorMsg}
      actions={
        <button type="button" className="af-btn af-btn-primary" onClick={openAdd}>
          <i className="bi bi-plus-circle" aria-hidden="true"></i>
          <span>New achievement</span>
        </button>
      }
    >
      {/* Stat row */}
      {stats && (
        <div className="ad-summary-row">
          <div className="ad-summary-card">
            <span className="ad-summary-lbl">Total achievements</span>
            <span className="ad-summary-val">{stats.totalAchievements ?? items.length}</span>
            <span className="ad-summary-meta">across all categories</span>
          </div>
          <div className="ad-summary-card">
            <span className="ad-summary-lbl">Featured</span>
            <span className="ad-summary-val">{stats.featuredCount ?? items.filter((i) => i.isFeatured).length}</span>
            <span className="ad-summary-meta">shown on home page</span>
          </div>
          <div className="ad-summary-card">
            <span className="ad-summary-lbl">Total beneficiaries</span>
            <span className="ad-summary-val">{(stats.totalBeneficiaries ?? items.reduce((s, i) => s + (i.beneficiaries || 0), 0)).toLocaleString('en-US')}</span>
            <span className="ad-summary-meta">people reached</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="af-toolbar">
        <div className="af-search">
          <span className="af-search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text"
            className="af-search-input"
            placeholder="Search title, description, metric…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="af-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        <select className="af-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {[...CATEGORIES, ...categories.filter((c) => !CATEGORIES.includes(c))].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="af-toolbar-spacer" />
        <span className="af-meta-count">{filtered.length} of {items.length}</span>
      </div>

      {!loading && filtered.length === 0 ? (
        <div className="af-empty">
          <div className="af-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="6"/><polyline points="8.21 13.89 7 22 12 19 17 22 15.79 13.88"/>
            </svg>
          </div>
          <h3 className="af-empty-title">No achievements yet</h3>
          <p className="af-empty-text">
            {search || categoryFilter
              ? 'Try adjusting your filters.'
              : 'Add your first achievement to start telling your impact story.'}
          </p>
          {!search && !categoryFilter && (
            <button type="button" className="af-btn af-btn-primary" onClick={openAdd}>
              <i className="bi bi-plus-circle" aria-hidden="true"></i>
              <span>Add first achievement</span>
            </button>
          )}
        </div>
      ) : (
        <div className="af-panel">
          <div className="af-table-wrap">
            <table className="af-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Metric</th>
                  <th>Awarded by</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr key={it.achievementId}>
                    <td>
                      <div className="af-cell-strong">{it.title}</div>
                      {it.beneficiaries > 0 && (
                        <div className="af-cell-meta">
                          <i className="bi bi-people" aria-hidden="true"></i> {it.beneficiaries.toLocaleString('en-US')} beneficiaries
                        </div>
                      )}
                    </td>
                    <td>
                      {it.category && <span className="af-tag">{it.category}</span>}
                    </td>
                    <td>
                      {it.metricValue != null ? (
                        <div className="af-cell-strong">
                          {Number(it.metricValue).toLocaleString('en-US')}{it.metricSuffix || ''}
                        </div>
                      ) : <span className="af-cell-meta">—</span>}
                      {it.metricLabel && <div className="af-cell-meta">{it.metricLabel}</div>}
                    </td>
                    <td>
                      {it.awardBy ? <span className="af-cell-meta">{it.awardBy}</span> : <span className="af-cell-meta">—</span>}
                      {it.location && <div className="af-cell-meta">{it.location}</div>}
                    </td>
                    <td>
                      <span className="af-cell-meta">
                        {it.achievementDate ? new Date(it.achievementDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        <span className={`af-pill ${it.isActive ? 'af-pill-active' : 'af-pill-completed'}`}>
                          {it.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {it.isFeatured && <span className="af-tag af-tag-accent">★ Featured</span>}
                      </div>
                    </td>
                    <td className="text-end">
                      <div className="af-row-actions">
                        <button type="button" className="af-icon-btn" onClick={() => openEdit(it)} title="Edit" aria-label="Edit">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        {user?.role === 'Admin' && (
                          <button type="button" className="af-icon-btn danger" onClick={() => setDeleteConfirm(it.achievementId)} title="Delete" aria-label="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="af-loading"><Spinner animation="border" /></div>
      )}

      <AchievementFormModal
        show={showForm}
        editing={!!editing}
        initial={editing || EMPTY_FORM}
        onSave={handleSave}
        onClose={() => setShowForm(false)}
      />

      <Modal show={!!deleteConfirm} onHide={() => setDeleteConfirm(null)} centered className="admin-modal-dark">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
            Delete achievement
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure? This will remove the achievement from the public site.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </AdminPageFrame>
  );
}

export default AdminAchievementsPage;
