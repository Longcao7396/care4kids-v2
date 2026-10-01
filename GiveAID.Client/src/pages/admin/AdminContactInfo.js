import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Alert, Button, Form, Spinner, Card } from 'react-bootstrap';
import api from '../../services/api';
import { sanitizeHtml } from '../../utils/safeHtml';

/* ── Admin Contact Info ─────────────────────── */
export default function AdminContactInfo({ pageKey = 'contact_info', title = 'Contact Information' }) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form fields
  const [pageTitle, setPageTitle] = useState('');
  const [content, setContent] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Parse content into structured fields (read-only preview + edit-as-HTML mode)
  const [editMode, setEditMode] = useState('structured');

  // GET all CMS pages and find by key (admin gets full list, including inactive)
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/cms/pages', { params: { includeInactive: true } });
      const list = Array.isArray(response) ? response : (response?.items || []);
      const found = list.find((p) => p.pageKey === pageKey);
      if (found) {
        setPage(found);
        setPageTitle(found.pageTitle || title);
        setContent(found.content || '');
        setMetaDescription(found.metaDescription || '');
      } else {
        setError(`No CMS page found with key "${pageKey}". Run the migration script.`);
      }
    } catch (err) {
      setError('Failed to load CMS pages.');
    } finally {
      setLoading(false);
    }
  }, [pageKey, title]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!page?.pageId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.put(`/cms/pages/${page.pageId}`, {
        pageTitle,
        content,
        metaDescription,
      });
      setSuccess('Contact information saved. Visit the Contact page to verify.');
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <Alert variant="warning" dismissible onClose={() => setError(null)}>
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          <i className="bi bi-check-circle me-2"></i>
          {success}
        </Alert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="text-light mb-1">Contact Information</h4>
          <p className="text-muted small mb-0">
            Edits the CMS page with key <code>contact_info</code>. Used by the public Contact page.
          </p>
        </div>
      </div>

      <Form onSubmit={handleSave}>
        <Row>
          <Col lg={8}>
            <Form.Group className="mb-3">
              <Form.Label>Page Title</Form.Label>
              <Form.Control
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                maxLength={100}
              />
            </Form.Group>

            <div className="d-flex justify-content-between align-items-center mb-2">
              <Form.Label className="mb-0">Content (HTML)</Form.Label>
              <div className="d-flex gap-1">
                <button
                  type="button"
                  className={`btn btn-sm ${editMode === 'structured' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setEditMode('structured')}
                >
                  <i className="bi bi-eye me-1"></i>Preview
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${editMode === 'raw' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setEditMode('raw')}
                >
                  <i className="bi bi-code me-1"></i>HTML
                </button>
              </div>
            </div>

            {editMode === 'raw' ? (
              <Form.Control
                as="textarea"
                rows={18}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  background: 'var(--primary-slate)',
                  color: 'var(--text-light)',
                  border: '1px solid var(--border-slate)',
                }}
              />
            ) : (
              <Card style={{ background: 'var(--primary-slate)', border: '1px solid var(--border-slate)' }}>
                <Card.Body>
                  <div
                    className="contact-info-preview"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) || '<em class="text-muted">(empty)</em>' }}
                  />
                </Card.Body>
              </Card>
            )}
            <Form.Text className="text-muted">
              {content.length} characters
            </Form.Text>
          </Col>

          <Col lg={4}>
            <Card style={{ background: 'var(--primary-slate)', border: '1px solid var(--border-slate)' }}>
              <Card.Body>
                <h6 className="text-light">
                  <i className="bi bi-info-circle me-1"></i>
                  Available HTML tags
                </h6>
                <p className="text-muted small mb-2">
                  The following tags are supported. Click "HTML" to edit raw HTML.
                </p>
                <div className="cms-help-tags">
                  <code>&lt;h3&gt;</code><code>&lt;h4&gt;</code>
                  <code>&lt;p&gt;</code><code>&lt;strong&gt;</code>
                  <code>&lt;a href=""&gt;</code><code>&lt;ul&gt;&lt;li&gt;</code>
                  <code>&lt;i class="bi bi-icon-name"&gt;</code>
                </div>
                <hr />
                <h6 className="text-light">
                  <i className="bi bi-bootstrap me-1"></i>
                  Bootstrap Icons
                </h6>
                <p className="text-muted small mb-2">
                  Use bi-icons: <code>bi-geo-alt-fill</code>, <code>bi-telephone-fill</code>, etc.
                </p>
                <a
                  href="https://icons.getbootstrap.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm w-100"
                >
                  <i className="bi bi-box-arrow-up-right me-1"></i>Icon Reference
                </a>
              </Card.Body>
            </Card>

            <Form.Group className="mt-3">
              <Form.Label>Meta Description (SEO)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                maxLength={255}
              />
            </Form.Group>
          </Col>
        </Row>

        <div className="mt-3">
          <Button variant="primary" type="submit" disabled={saving || !page}>
            {saving ? (
              <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />Saving...</>
            ) : (
              <><i className="bi bi-check-circle me-2"></i>Save Contact Info</>
            )}
          </Button>
          <a
            href="/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-secondary ms-2"
          >
            <i className="bi bi-box-arrow-up-right me-1"></i>Preview Public Page
          </a>
        </div>
      </Form>

      <style>{`
        .cms-help-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .cms-help-tags code {
          font-size: 0.7rem;
          padding: 2px 6px;
          background: rgba(56,189,248,0.08);
          color: var(--accent-sky);
          border: 1px solid rgba(56,189,248,0.2);
          border-radius: 4px;
        }
        .contact-info-preview {
          color: var(--text-gray);
          font-size: 0.95rem;
          line-height: 1.7;
        }
        .contact-info-preview h3,
        .contact-info-preview h4 {
          color: var(--text-light);
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .contact-info-preview a {
          color: var(--accent-sky);
        }
        .contact-info-preview .ci-line i {
          color: var(--accent-sky);
          margin-right: 0.5rem;
        }
        .contact-info-preview .ci-meta {
          color: var(--text-gray);
          font-size: 0.85em;
          margin-left: 0.4rem;
        }
        .contact-info-preview .ci-social-list {
          list-style: none;
          padding-left: 0;
        }
        .contact-info-preview .ci-social-list li {
          padding: 0.35rem 0;
        }
        .contact-info-preview .ci-social-list i {
          color: var(--accent-sky);
          margin-right: 0.5rem;
        }
      `}</style>
    </div>
  );
}
