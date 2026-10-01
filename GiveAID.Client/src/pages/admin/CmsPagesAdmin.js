import React, { useState, useEffect, useCallback } from 'react';
import { Card, Alert, Button, Modal, Form, Spinner, Badge, InputGroup } from 'react-bootstrap';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { sanitizeHtml } from '../../utils/safeHtml';

/* ── Validation ────────────────────────────── */
function validate(data) {
  const errs = {};
  if (!data.pageKey?.trim())
    errs.pageKey = 'Page key is required (lowercase, no spaces).';
  else if (!/^[a-z0-9_-]+$/.test(data.pageKey))
    errs.pageKey = 'Only lowercase letters, numbers, hyphens and underscores.';
  if (!data.pageTitle?.trim())
    errs.pageTitle = 'Page title is required.';
  return errs;
}

const EMPTY = {
  pageKey: '',
  pageSlug: '',
  pageTitle: '',
  content: '',
  metaDescription: '',
  metaKeywords: '',
  displayOrder: 100,
  isInMenu: true,
  isActive: true,
};

/* ── CMS Pages Admin ─────────────────────────── */
export default function CmsPagesAdmin() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [content, setContent] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isInMenu, setIsInMenu] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/cms/pages', { params: { includeInactive: true } });
      setPages(Array.isArray(response) ? response : (response?.items || []));
    } catch (err) {
      setError('Failed to load CMS pages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (page) => {
    setEditing(page);
    setPageTitle(page.pageTitle || '');
    setContent(page.content || '');
    setMetaDescription(page.metaDescription || '');
    setMetaKeywords(page.metaKeywords || '');
    setDisplayOrder(page.displayOrder || 0);
    setIsInMenu(page.isInMenu !== false);
    setIsActive(page.isActive !== false);
  };

  const save = async () => {
    if (editing) {
      // Update existing
      setSaving(true);
      try {
        setError(null);
        await api.put(`/cms/pages/${editing.pageId}`, {
          pageTitle, content, metaDescription, metaKeywords,
          displayOrder, isInMenu, isActive,
        });
        setSuccess('Page content saved.');
        setEditing(null);
        load();
      } catch (err) {
        setError(err.message || 'Save failed.');
      } finally {
        setSaving(false);
      }
    } else {
      // Create new (uses CreateModal)
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/cms/pages/${deleteConfirm}`);
      setSuccess('Page deleted.');
    } catch (err) {
      setError('Delete failed. (Admin permission required.)');
    } finally {
      setDeleteConfirm(null);
      load();
    }
  };

  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const filtered = pages.filter((p) => {
    const s = search.toLowerCase();
    return !s ||
      p.pageTitle?.toLowerCase().includes(s) ||
      p.pageKey?.toLowerCase().includes(s);
  });

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="text-light mb-1">About Us Pages Content</h4>
          <p className="text-muted small mb-0">
            Edit the HTML content shown on each About Us sub-page.
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={openCreate}>
            <i className="bi bi-plus-circle me-2"></i>New Page
          </Button>
        )}
      </div>

      <div className="mb-3">
        <InputGroup>
          <InputGroup.Text>
            <i className="bi bi-search"></i>
          </InputGroup.Text>
          <Form.Control
            placeholder="Search pages by title or key..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <InputGroup.Text style={{ cursor: 'pointer' }} onClick={() => setSearch('')}>
              <i className="bi bi-x-circle"></i>
            </InputGroup.Text>
          )}
        </InputGroup>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      ) : filtered.length === 0 ? (
        <Alert variant="info">No CMS pages found.</Alert>
      ) : (
        <div className="cms-pages-grid">
          {filtered.map((p) => (
            <Card key={p.pageId} className={`cms-page-card ${!p.isActive ? 'inactive' : ''}`}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h6 className="mb-1 text-light">{p.pageTitle}</h6>
                    <Badge bg="secondary" className="me-1">{p.pageKey}</Badge>
                    {p.isInMenu && <Badge bg="info">In Menu</Badge>}
                    {!p.isActive && <Badge bg="warning" text="dark" className="ms-1">Inactive</Badge>}
                  </div>
                </div>
                <div
                  className="cms-page-preview"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml((p.content || '<em>(empty)</em>').slice(0, 240) +
                      (p.content && p.content.length > 240 ? '…' : '')),
                  }}
                />
                <div className="mt-3 d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => openEdit(p)}
                  >
                    <i className="bi bi-pencil-square me-1"></i>Edit
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => setDeleteConfirm(p.pageId)}
                    >
                      <i className="bi bi-trash me-1"></i>Delete
                    </Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      <p className="text-muted small mt-3">
        Showing {filtered.length} of {pages.length} page(s)
      </p>

      {/* Edit Modal */}
      <Modal show={!!editing} onHide={() => setEditing(null)} size="lg" centered className="admin-modal-dark">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil-square me-2 text-accent"></i>
            Edit "{editing?.pageTitle}"
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Page Title</Form.Label>
            <Form.Control
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              maxLength={100}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Content (HTML allowed)</Form.Label>
            <Form.Control
              as="textarea"
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
            />
            <Form.Text className="text-muted">
              Tip: use {'<h2>'}, {'<h3>'}, {'<p>'}, {'<ul><li>'}, {'<strong>'}, {'<a href="">'}.
              {content.length} characters
            </Form.Text>
          </Form.Group>
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Meta Description (SEO)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  maxLength={255}
                />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Meta Keywords (comma-separated)</Form.Label>
                <Form.Control
                  value={metaKeywords}
                  onChange={(e) => setMetaKeywords(e.target.value)}
                  placeholder="charity, vietnam, ngo, ..."
                />
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group>
                <Form.Label>Display Order</Form.Label>
                <Form.Control
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                />
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Check
                type="switch"
                label="Active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mt-4"
              />
            </div>
            <div className="col-md-3">
              <Form.Check
                type="switch"
                label="In Navigation Menu"
                checked={isInMenu}
                onChange={(e) => setIsInMenu(e.target.checked)}
                className="mt-4"
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? (
              <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />Saving…</>
            ) : (
              <><i className="bi bi-check-circle me-2"></i>Save Changes</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create Modal */}
      <CreatePageModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => { setShowModal(false); load(); }}
      />

      {/* Delete Confirm */}
      <Modal show={!!deleteConfirm} onHide={() => setDeleteConfirm(null)} centered className="admin-modal-dark">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
            Delete CMS Page
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this CMS page? This is permanent.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .cms-pages-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }
        .cms-page-card {
          background: var(--bg-card);
          border: 1px solid var(--border-slate);
          border-radius: var(--radius-lg);
          color: var(--text-light);
        }
        .cms-page-card.inactive { opacity: 0.55; }
        .cms-page-card:hover { border-color: rgba(56,189,248,0.4); }
        .cms-page-preview {
          color: var(--text-gray);
          font-size: 0.85rem;
          line-height: 1.55;
          max-height: 100px;
          overflow: hidden;
          position: relative;
        }
        .admin-modal-dark .modal-content {
          background: var(--bg-card);
          border: 1px solid var(--border-slate);
          color: var(--text-light);
        }
        .admin-modal-dark .modal-header,
        .admin-modal-dark .modal-footer { border-color: var(--border-slate); }
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
        .admin-modal-dark .form-control:focus {
          border-color: var(--accent-sky);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.15);
          background: var(--primary-slate);
          color: var(--text-light);
        }
      `}</style>
    </div>
  );
}

/* ── Create New Page Modal ────────────────────── */
function CreatePageModal({ show, onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show) {
      setForm(EMPTY);
      setErrors({});
      setError(null);
    }
  }, [show]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await api.post('/cms/pages', form);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Create failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered className="admin-modal-dark">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-plus-circle me-2 text-accent"></i>
          New CMS Page
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={submit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Page Key * (unique identifier)</Form.Label>
            <Form.Control
              value={form.pageKey}
              onChange={(e) => setForm({ ...form, pageKey: e.target.value.toLowerCase() })}
              isInvalid={!!errors.pageKey}
              placeholder="e.g. about_us, our_team"
            />
            <Form.Text className="text-muted">
              Lowercase letters, numbers, hyphens, underscores only.
            </Form.Text>
            {errors.pageKey && <Form.Control.Feedback type="invalid">{errors.pageKey}</Form.Control.Feedback>}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Page Title *</Form.Label>
            <Form.Control
              value={form.pageTitle}
              onChange={(e) => setForm({ ...form, pageTitle: e.target.value })}
              isInvalid={!!errors.pageTitle}
              maxLength={100}
            />
            {errors.pageTitle && <Form.Control.Feedback type="invalid">{errors.pageTitle}</Form.Control.Feedback>}
          </Form.Group>
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>URL Slug</Form.Label>
                <Form.Control
                  value={form.pageSlug}
                  onChange={(e) => setForm({ ...form, pageSlug: e.target.value.toLowerCase() })}
                  placeholder="auto-derived from key"
                  maxLength={100}
                />
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group>
                <Form.Label>Display Order</Form.Label>
                <Form.Control
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                />
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Check
                type="switch"
                label="In Menu"
                checked={form.isInMenu}
                onChange={(e) => setForm({ ...form, isInMenu: e.target.checked })}
                className="mt-4"
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? (
              <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />Creating…</>
            ) : (
              <><i className="bi bi-check-circle me-2"></i>Create Page</>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
