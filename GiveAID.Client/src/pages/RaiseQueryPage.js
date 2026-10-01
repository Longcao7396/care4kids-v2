import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Alert, Button, Form, Spinner, Badge,
  Modal, InputGroup
} from 'react-bootstrap';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_VARIANTS = {
  Open: 'warning', InProgress: 'primary', Closed: 'secondary',
};
const PRIORITY_VARIANTS = { Low: 'secondary', Normal: 'info', High: 'danger' };

function validateCreate(data) {
  const errs = {};
  if (!data.subject?.trim()) errs.subject = 'Please enter a subject.';
  if (!data.message?.trim()) errs.message = 'Please describe your question.';
  if (data.message && data.message.length < 10) errs.message = 'Please provide more detail (min 10 characters).';
  return errs;
}

const EMPTY_FORM = { subject: '', conversationType: 'Query', message: '', priority: 'Normal' };

export default function RaiseQueryPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [myQueries, setMyQueries] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchMine = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await api.get('/conversations/mine', { params: statusFilter ? { status: statusFilter } : {} });
      setMyQueries(Array.isArray(res) ? res : (res?.items || []));
    } catch { /* non-fatal */ }
    finally { setLoadingList(false); }
  }, [statusFilter]);

  useEffect(() => {
    if (user) fetchMine();
  }, [user, fetchMine]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateCreate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    setSubmitSuccess(null);
    try {
      const res = await api.post('/conversations', form);
      setSubmitSuccess({ message: 'Query submitted successfully.', data: res });
      setForm(EMPTY_FORM);
      setErrors({});
      fetchMine();
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || err.message || 'Failed to submit query.' });
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (id) => {
    setDetail({ loading: true, id });
    setDetailLoading(true);
    setReplyText('');
    try {
      const res = await api.get(`/conversations/${id}`);
      setDetail(res || null);
    } catch (err) {
      setDetail({ error: err.response?.data?.message || err.message || 'Failed to load conversation.' });
    } finally {
      setDetailLoading(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !detail?.conversationId) return;
    setSendingReply(true);
    try {
      await api.post(`/conversations/${detail.conversationId}/messages`, { messageText: replyText });
      setReplyText('');
      openDetail(detail.conversationId);
      fetchMine();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const closeConv = async () => {
    if (!detail?.conversationId) return;
    if (!window.confirm('Close this conversation? You will not be able to add new messages.')) return;
    try {
      await api.post(`/conversations/${detail.conversationId}/close`);
      openDetail(detail.conversationId);
      fetchMine();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close conversation.');
    }
  };

  const fmt = (d) => d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const filtered = myQueries.filter((q) => {
    const s = search.toLowerCase();
    return !s || q.subject?.toLowerCase().includes(s);
  });

  if (!user) {
    return (
      <div className="about-subpage">
        <section className="page-header">
          <Container><h1>Raise a <span className="text-accent">Query</span></h1></Container>
        </section>
        <Container className="pb-5">
          <Alert variant="warning">
            Please <Alert.Link href="/login">sign in</Alert.Link> to raise a query and view your conversation history.
          </Alert>
        </Container>
      </div>
    );
  }

  return (
    <div className="about-subpage">
      <section className="page-header">
        <Container>
          <h1>Raise a <span className="text-accent">Query</span></h1>
          <p className="lead">
            Have a question or need help? Submit a query and our team will respond.
          </p>
        </Container>
      </section>

      <Container className="pb-5">
        <Row className="g-4">
          {/* ── Create form ── */}
          <Col lg={5}>
            <Card>
              <Card.Header className="bg-transparent border-bottom"
                style={{ borderColor: 'var(--border-slate) !important' }}>
                <h5 className="mb-0" style={{ color: 'var(--c4k-charcoal, #1A1A1A)', fontWeight: 600 }}>
                  <i className="bi bi-chat-square-text-fill me-2 text-accent"></i>
                  Submit a new query
                </h5>
              </Card.Header>
              <Card.Body>
                {submitSuccess && (
                  <Alert variant="success" dismissible onClose={() => setSubmitSuccess(null)}>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    {submitSuccess.message}
                    <div className="small mt-1">
                      Conversation ID: <code>#{submitSuccess.data?.conversationId}</code>
                    </div>
                  </Alert>
                )}
                {errors.submit && (
                  <Alert variant="danger" dismissible onClose={() => setErrors((e) => ({ ...e, submit: null }))}>
                    {errors.submit}
                  </Alert>
                )}
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Subject *</Form.Label>
                    <Form.Control value={form.subject} onChange={set('subject')}
                      placeholder="e.g. Question about my donation"
                      isInvalid={!!errors.subject} />
                    <Form.Control.Feedback type="invalid">{errors.subject}</Form.Control.Feedback>
                  </Form.Group>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Type</Form.Label>
                        <Form.Select value={form.conversationType} onChange={set('conversationType')}>
                          <option value="Query">General Query</option>
                          <option value="Donation">Donation Issue</option>
                          <option value="Account">Account Help</option>
                          <option value="Campaign">Campaign Question</option>
                          <option value="Feedback">Feedback</option>
                          <option value="Other">Other</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Priority</Form.Label>
                        <Form.Select value={form.priority} onChange={set('priority')}>
                          <option value="Low">Low</option>
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Your Message *
                      <span className="text-muted small ms-2">
                        ({form.message?.length || 0} chars)
                      </span>
                    </Form.Label>
                    <Form.Control as="textarea" rows={5} value={form.message} onChange={set('message')}
                      placeholder="Please describe your question in detail…"
                      isInvalid={!!errors.message} />
                    <Form.Control.Feedback type="invalid">{errors.message}</Form.Control.Feedback>
                  </Form.Group>
                  <div className="d-flex justify-content-end">
                    <Button variant="primary" type="submit" disabled={submitting}>
                      {submitting ? (
                        <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />Submitting…</>
                      ) : (
                        <><i className="bi bi-send-fill me-2"></i>Submit Query</>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* ── My queries list ── */}
          <Col lg={7}>
            <Card>
              <Card.Header className="bg-transparent border-bottom"
                style={{ borderColor: 'var(--border-slate) !important' }}>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <h5 className="mb-0" style={{ color: 'var(--c4k-charcoal, #1A1A1A)', fontWeight: 600 }}>
                    <i className="bi bi-inbox-fill me-2 text-accent"></i>
                    My Queries <Badge bg="primary" className="ms-1">{filtered.length}</Badge>
                  </h5>
                  <div className="d-flex gap-2">
                    <InputGroup size="sm" style={{ width: 200 }}>
                      <Form.Control type="text" placeholder="Search subject…"
                        value={search} onChange={(e) => setSearch(e.target.value)} />
                      {search && (
                        <InputGroup.Text style={{ cursor: 'pointer' }}
                          onClick={() => setSearch('')}>
                          <i className="bi bi-x-circle"></i>
                        </InputGroup.Text>
                      )}
                    </InputGroup>
                    <Form.Select size="sm" value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 130 }}>
                      <option value="">All Status</option>
                      <option value="Open">Open</option>
                      <option value="InProgress">In Progress</option>
                      <option value="Closed">Closed</option>
                    </Form.Select>
                  </div>
                </div>
              </Card.Header>
              {loadingList ? (
                <Card.Body className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                </Card.Body>
              ) : filtered.length === 0 ? (
                <Card.Body className="text-center text-muted py-5">
                  <i className="bi bi-inbox" style={{ fontSize: '2.5rem', opacity: 0.4 }}></i>
                  <p className="mb-0 mt-2">
                    {(search || statusFilter) ? 'No queries match the current filters.' : 'You have not submitted any queries yet.'}
                  </p>
                </Card.Body>
              ) : (
                <div className="query-list">
                  {filtered.map((q) => (
                    <div key={q.conversationId} className="query-item"
                      onClick={() => openDetail(q.conversationId)}>
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="flex-grow-1 min-w-0">
                          <h6 className="query-subject mb-1">{q.subject}</h6>
                          <div className="small text-muted">
                            <i className="bi bi-tag-fill me-1"></i>{q.conversationType}
                            <span className="mx-2">·</span>
                            <i className="bi bi-chat-dots me-1"></i>{q.messageCount} message(s)
                            <span className="mx-2">·</span>
                            <i className="bi bi-clock me-1"></i>{fmt(q.lastMessageAt || q.createdAt)}
                          </div>
                        </div>
                        <div className="d-flex flex-column align-items-end gap-1 ms-2">
                          <Badge bg={STATUS_VARIANTS[q.status] || 'secondary'} style={{ fontSize: '0.7rem' }}>
                            {q.status}
                          </Badge>
                          <Badge bg={PRIORITY_VARIANTS[q.priority] || 'secondary'} style={{ fontSize: '0.65rem' }}>
                            {q.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Container>

      {/* ── Detail Modal ── */}
      <Modal show={!!detail} onHide={() => setDetail(null)} size="lg" centered
        className="admin-modal-dark">
        <Modal.Header closeButton>
          <Modal.Title>
            {detail?.subject || (detailLoading ? 'Loading…' : 'Conversation')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {detailLoading || detail?.loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : detail?.error ? (
            <Alert variant="danger">{detail.error}</Alert>
          ) : detail ? (
            <>
              <div className="d-flex flex-wrap gap-2 mb-3">
                <Badge bg={STATUS_VARIANTS[detail.status] || 'secondary'}>{detail.status}</Badge>
                <Badge bg={PRIORITY_VARIANTS[detail.priority] || 'secondary'}>{detail.priority}</Badge>
                <Badge bg="info">{detail.conversationType}</Badge>
                <span className="text-muted small ms-auto">
                  Opened {fmt(detail.createdAt)}{detail.closedAt && ` · Closed ${fmt(detail.closedAt)}`}
                </span>
              </div>

              <div className="message-thread">
                {detail.messages?.map((m) => (
                  <div key={m.messageId} className={`message-bubble ${m.isFromAdmin ? 'admin' : 'user'}`}>
                    <div className="message-meta">
                      <strong>{m.senderName}</strong>
                      {m.isFromAdmin && <Badge bg="primary" className="ms-1" style={{ fontSize: '0.6rem' }}>Admin</Badge>}
                      <span className="ms-2 small text-muted">{fmt(m.createdAt)}</span>
                    </div>
                    <div className="message-text">{m.messageText}</div>
                  </div>
                ))}
              </div>

              {detail.status !== 'Closed' && (
                <div className="mt-3">
                  <Form.Group>
                    <Form.Label className="small text-muted">Add reply</Form.Label>
                    <Form.Control as="textarea" rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your message…"
                    />
                  </Form.Group>
                </div>
              )}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          {detail && !detail.loading && !detail.error && detail.status !== 'Closed' && (
            <>
              <Button variant="outline-danger" onClick={closeConv}>
                <i className="bi bi-x-circle me-1"></i>Close
              </Button>
              <Button variant="primary" onClick={sendReply} disabled={!replyText.trim() || sendingReply}>
                {sendingReply ? (
                  <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />Sending…</>
                ) : (
                  <><i className="bi bi-send-fill me-2"></i>Send Reply</>
                )}
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
        </Modal.Footer>
      </Modal>

      <style>{`
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
        .query-list { display: flex; flex-direction: column; }
        .query-item {
          padding: 0.85rem 1rem;
          border-bottom: 1px solid var(--border-slate);
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        .query-item:last-child { border-bottom: none; }
        .query-item:hover { background: rgba(56,189,248,0.05); }
        .query-subject {
          color: var(--text-light);
          font-weight: 600;
          font-size: 0.95rem;
          margin: 0;
        }
        .min-w-0 { min-width: 0; }

        /* Message thread */
        .message-thread {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .message-bubble {
          padding: 0.7rem 0.9rem;
          border-radius: var(--radius-md);
          max-width: 80%;
        }
        .message-bubble.user {
          background: var(--primary-slate);
          border: 1px solid var(--border-slate);
          align-self: flex-start;
        }
        .message-bubble.admin {
          background: rgba(56,189,248,0.12);
          border: 1px solid rgba(56,189,248,0.3);
          align-self: flex-end;
          margin-left: auto;
        }
        .message-meta { margin-bottom: 0.3rem; font-size: 0.82rem; }
        .message-text {
          color: var(--text-light);
          white-space: pre-wrap;
          font-size: 0.9rem;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
