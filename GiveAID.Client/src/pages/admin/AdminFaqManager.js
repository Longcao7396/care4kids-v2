import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert, Button, Modal, Form, Spinner, Badge, InputGroup,
} from 'react-bootstrap';
import { faqService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { sanitizeHtml } from '../../utils/safeHtml';

/* ── Validation ────────────────────────────── */
function validate(data) {
  const errs = {};
  if (!data.question?.trim())
    errs.question = 'Question is required.';
  if (!data.answer?.trim())
    errs.answer = 'Answer is required.';
  return errs;
}

const EMPTY = {
  question: '',
  answer: '',
  category: '',
  displayOrder: 0,
  isActive: true,
  isFeatured: false,
};

const CATEGORY_SUGGESTIONS = [
  'Donations', 'Programmes', 'Account', 'Volunteering',
  'Payments', 'General', 'Partners'
];

/* ── Admin FAQ Manager ──────────────────────── */
export default function AdminFaqManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      // activeOnly = false so admin sees inactive FAQs too
      const response = await faqService.getAll();
      setItems(Array.isArray(response) ? response : (response?.items || []));
    } catch (err) {
      setError('Failed to load FAQs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      question: item.question || '',
      answer: item.answer || '',
      category: item.category || '',
      displayOrder: item.displayOrder || 0,
      isActive: item.isActive !== false,
      isFeatured: !!item.isFeatured,
    });
    setErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        displayOrder: parseInt(form.displayOrder) || 0,
      };
      if (editing) {
        await faqService.update(editing.faqId, payload);
      } else {
        await faqService.create(payload);
      }
      setSuccess(editing ? 'FAQ updated.' : 'FAQ added.');
      setShowForm(false);
      load();
    } catch (err) {
      setError('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await faqService.remove(deleteConfirm);
      setSuccess('FAQ deleted.');
    } catch (err) {
      setError('Delete failed.');
    } finally {
      setDeleteConfirm(null);
      load();
    }
  };

  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const filtered = items.filter((item) => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      item.question?.toLowerCase().includes(s) ||
      item.answer?.toLowerCase().includes(s);
    const matchCat = !categoryFilter || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  return (
    <div>
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

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="text-light mb-0">FAQ Management</h4>
        <Button variant="primary" onClick={openAdd}>
          <i className="bi bi-plus-circle me-2"></i>Add FAQ
        </Button>
      </div>

      <div className="team-filter-bar mb-3">
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <Form.Group>
              <Form.Label className="text-light fw-semibold mb-1">Search</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Search questions or answers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <InputGroup.Text style={{ cursor: 'pointer' }} onClick={() => setSearch('')}>
                    <i className="bi bi-x-circle"></i>
                  </InputGroup.Text>
                )}
              </InputGroup>
            </Form.Group>
          </div>
          <div className="col-md-3">
            <Form.Group>
              <Form.Label className="text-light fw-semibold mb-1">Category</Form.Label>
              <Form.Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      ) : filtered.length === 0 ? (
        <Alert variant="info">
          {items.length === 0
            ? 'No FAQs yet. Click "Add FAQ" to create your first one.'
            : 'No FAQs match your filters.'}
        </Alert>
      ) : (
        <div className="faq-admin-list">
          {filtered.map((item) => (
            <div key={item.faqId} className={`faq-admin-item ${!item.isActive ? 'inactive' : ''}`}>
              <div className="faq-admin-question">
                <div className="d-flex align-items-start gap-2">
                  <div className="flex-grow-1">
                    <h6 className="faq-admin-q-text mb-1">{item.question}</h6>
                    <div
                      className="faq-admin-a-text"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml((item.answer || '').slice(0, 180) +
                          ((item.answer || '').length > 180 ? '…' : '')),
                      }}
                    />
                  </div>
                  <div className="d-flex flex-column gap-1 align-items-end" style={{ minWidth: 100 }}>
                    {item.category && (
                      <Badge bg="info" style={{ fontSize: '0.7rem' }}>
                        {item.category}
                      </Badge>
                    )}
                    {item.isFeatured && <Badge bg="warning" text="dark" style={{ fontSize: '0.65rem' }}>★ Featured</Badge>}
                    {!item.isActive && <Badge bg="secondary" style={{ fontSize: '0.65rem' }}>Inactive</Badge>}
                  </div>
                </div>
              </div>
              <div className="faq-admin-actions">
                <Button variant="outline-primary" size="sm" onClick={() => openEdit(item)}>
                  <i className="bi bi-pencil me-1"></i>Edit
                </Button>
                {isAdmin && (
                  <Button variant="outline-danger" size="sm" onClick={() => setDeleteConfirm(item.faqId)}>
                    <i className="bi bi-trash me-1"></i>Delete
                  </Button>
                )}
                <small className="text-muted ms-auto align-self-center">
                  Views: {item.viewCount || 0} · Order: {item.displayOrder}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-muted small mt-3">
        Showing {filtered.length} of {items.length} FAQ(s)
      </p>

      {/* Form Modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} size="lg" centered className="admin-modal-dark">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`bi ${editing ? 'bi-pencil-square' : 'bi-plus-circle'} me-2 text-accent`}></i>
            {editing ? 'Edit FAQ' : 'Add FAQ'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Question *</Form.Label>
              <Form.Control
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                isInvalid={!!errors.question}
                maxLength={500}
                placeholder="e.g. How do I make a donation?"
              />
              {errors.question && (
                <Form.Control.Feedback type="invalid">{errors.question}</Form.Control.Feedback>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Answer * (HTML allowed)</Form.Label>
              <Form.Control
                as="textarea"
                rows={8}
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                isInvalid={!!errors.answer}
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                placeholder="<p>Your answer here...</p>"
              />
              {errors.answer && (
                <Form.Control.Feedback type="invalid">{errors.answer}</Form.Control.Feedback>
              )}
              <Form.Text className="text-muted">
                Use {'<p>'}, {'<ul><li>'}, {'<strong>'} etc. {form.answer.length} characters
              </Form.Text>
            </Form.Group>

            <div className="row g-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Control
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Donations, Programmes, ..."
                    list="faq-cat-suggestions"
                    maxLength={100}
                  />
                  <datalist id="faq-cat-suggestions">
                    {CATEGORY_SUGGESTIONS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label>Display Order</Form.Label>
                  <Form.Control
                    type="number"
                    value={form.displayOrder}
                    onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                  />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="pt-4">
                  <Form.Check
                    type="switch"
                    label="Active"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  <Form.Check
                    type="switch"
                    label="Featured"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  />
                </Form.Group>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? (
                <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />Saving...</>
              ) : (
                <><i className={`bi ${editing ? 'bi-check-circle' : 'bi-plus-circle'} me-2`}></i>
                {editing ? 'Update FAQ' : 'Add FAQ'}</>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirm */}
      <Modal show={!!deleteConfirm} onHide={() => setDeleteConfirm(null)} centered className="admin-modal-dark">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
            Delete FAQ
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this FAQ? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .faq-admin-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .faq-admin-item {
          background: var(--bg-card);
          border: 1px solid var(--border-slate);
          border-radius: var(--radius-lg);
          padding: 1rem 1.25rem;
          transition: all var(--transition-fast);
        }
        .faq-admin-item.inactive { opacity: 0.55; }
        .faq-admin-item:hover { border-color: rgba(56,189,248,0.4); }
        .faq-admin-q-text { color: var(--text-light); font-weight: 600; font-size: 0.95rem; }
        .faq-admin-a-text { color: var(--text-gray); font-size: 0.85rem; line-height: 1.6; }
        .faq-admin-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-slate);
          align-items: center;
        }
        .admin-modal-dark .modal-content {
          background: var(--bg-card);
          border: 1px solid var(--border-slate);
          color: var(--text-light);
        }
        .admin-modal-dark .modal-header,
        .admin-modal-dark .modal-footer {
          border-color: var(--border-slate);
        }
        .admin-modal-dark .btn-close { filter: invert(1); opacity: 0.5; }
        .admin-modal-dark .form-label {
          color: var(--text-light);
          font-size: 0.875rem;
          font-weight: 600;
        }
        .admin-modal-dark .form-control,
        .admin-modal-dark .form-select {
          background: var(--primary-slate);
          border: 1px solid var(--border-slate);
          color: var(--text-light);
        }
        .admin-modal-dark .form-control:focus,
        .admin-modal-dark .form-select:focus {
          border-color: var(--accent-sky);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.15);
          background: var(--primary-slate);
          color: var(--text-light);
        }
      `}</style>
    </div>
  );
}
