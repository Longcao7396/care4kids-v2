import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Alert, Button, Form, Spinner, Badge,
  Modal, InputGroup, Table
} from 'react-bootstrap';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import AdminPageFrame from '../../components/AdminPageFrame';

const STATUS_VARIANTS = { Open: 'warning', InProgress: 'primary', Closed: 'secondary' };
const PRIORITY_VARIANTS = { Low: 'secondary', Normal: 'info', High: 'danger' };

export default function AdminQueriesPage() {
  const { user } = useAuth();
  const canAccess = user?.role === 'Admin';

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/conversations', {
        params: {
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          type: typeFilter || undefined,
          page: pagination.page,
          pageSize: pagination.pageSize,
        },
      });
      // res is { items, page, pageSize, total }
      setItems(res.items || []);
      setPagination((p) => ({ ...p, page: res.page, pageSize: res.pageSize, total: res.total }));
    } catch {
      setError('Failed to load queries.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, typeFilter, pagination.page, pagination.pageSize]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/conversations/stats');
      if (res) setStats(res);
    } catch { /* non-fatal */ }
  }, []);

  // Load list of admins for the Assign dropdown.
  const fetchAdmins = useCallback(async () => {
    try {
      const res = await api.get('/admin/users', { params: { role: 'Admin', pageSize: 100 } });
      // res is { items, page, pageSize, total }
      const list = res.items || [];
      setAdmins(list.filter((u) => u.isActive));
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    if (canAccess) { fetchItems(); fetchStats(); fetchAdmins(); }
  }, [canAccess, fetchItems, fetchStats, fetchAdmins]);

  const openDetail = async (id) => {
    setDetail({ loading: true, id });
    setDetailLoading(true);
    setReplyText('');
    try {
      const res = await api.get(`/conversations/${id}`);
      setDetail(res);
    } catch (err) {
      setDetail({ error: err.response?.data?.message || 'Failed to load conversation.' });
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
      fetchItems();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const closeConv = async () => {
    if (!detail?.conversationId) return;
    if (!window.confirm('Close this conversation?')) return;
    try {
      await api.post(`/conversations/${detail.conversationId}/close`);
      openDetail(detail.conversationId);
      fetchItems();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close conversation.');
    }
  };

  const assignConv = async (userId) => {
    if (!detail?.conversationId) return;
    setAssigning(true);
    try {
      await api.post(`/conversations/${detail.conversationId}/assign`, { assignedTo: userId || null });
      openDetail(detail.conversationId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign conversation.');
    } finally {
      setAssigning(false);
    }
  };

  const fmt = (d) => d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const filtered = items.filter((q) => {
    const s = search.toLowerCase();
    return !s ||
      q.subject?.toLowerCase().includes(s) ||
      q.userName?.toLowerCase().includes(s);
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
      eyebrow="Communication"
      title="User Queries"
      sub="Manage user-submitted queries and respond in-thread."
      actions={
        <Button variant="outline-light" size="sm" onClick={() => { fetchItems(); fetchStats(); }}>
          <i className="bi bi-arrow-clockwise me-1"></i>Refresh
        </Button>
      }
      error={error}
      loading={loading && filtered.length === 0}
    >
        {stats && (
          <Row className="g-3 mb-4">
            <Col xs={6} md={2}>
              <Card className="stat-card-sm"><Card.Body>
                <div className="stat-sm-num">{stats.total}</div>
                <p className="stat-sm-label">Total</p>
              </Card.Body></Card>
            </Col>
            <Col xs={6} md={2}>
              <Card className="stat-card-sm"><Card.Body>
                <div className="stat-sm-num text-warning">{stats.open}</div>
                <p className="stat-sm-label">Open</p>
              </Card.Body></Card>
            </Col>
            <Col xs={6} md={2}>
              <Card className="stat-card-sm"><Card.Body>
                <div className="stat-sm-num">{stats.inProgress}</div>
                <p className="stat-sm-label">In Progress</p>
              </Card.Body></Card>
            </Col>
            <Col xs={6} md={2}>
              <Card className="stat-card-sm"><Card.Body>
                <div className="stat-sm-num text-success">{stats.closed}</div>
                <p className="stat-sm-label">Closed</p>
              </Card.Body></Card>
            </Col>
            <Col xs={6} md={2}>
              <Card className="stat-card-sm"><Card.Body>
                <div className="stat-sm-num text-danger">{stats.highPriority}</div>
                <p className="stat-sm-label">High Priority</p>
              </Card.Body></Card>
            </Col>
            <Col xs={6} md={2}>
              <Card className="stat-card-sm"><Card.Body>
                <div className="stat-sm-num">{stats.last7Days}</div>
                <p className="stat-sm-label">Last 7 days</p>
              </Card.Body></Card>
            </Col>
          </Row>
        )}

        {/* Filters */}
        <div className="team-filter-bar mb-3">
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <Form.Control type="text" placeholder="Subject or user name…"
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                  {search && (
                    <InputGroup.Text style={{ cursor: 'pointer' }} onClick={() => setSearch('')}>
                      <i className="bi bi-x-circle"></i>
                    </InputGroup.Text>
                  )}
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
                  <option value="">All</option>
                  <option value="Open">Open</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Closed">Closed</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Priority</Form.Label>
                <Form.Select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
                  <option value="">All</option>
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                  <option value="Low">Low</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Type</Form.Label>
                <Form.Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
                  <option value="">All</option>
                  <option value="Query">Query</option>
                  <option value="Donation">Donation</option>
                  <option value="Account">Account</option>
                  <option value="Campaign">Campaign</option>
                  <option value="Feedback">Feedback</option>
                  <option value="Other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Button variant="outline-secondary" className="w-100"
                onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); setTypeFilter(''); setPagination((p) => ({ ...p, page: 1 })); }}>
                Clear
              </Button>
            </Col>
          </Row>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="team-empty">
            <i className="bi bi-chat-square" style={{ fontSize: '3rem', color: 'var(--text-gray)' }}></i>
            <h5 className="mt-3">No queries found</h5>
            <p className="text-muted">Try adjusting your filters.</p>
          </div>
        ) : (
          <Card>
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Messages</th>
                  <th>Updated</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.conversationId} className={q.status === 'Closed' ? 'inactive-row' : ''}>
                    <td>
                      <div className="fw-semibold">{q.subject}</div>
                      <small className="text-muted">#{q.conversationId} · {fmt(q.createdAt)}</small>
                    </td>
                    <td>
                      <div>{q.userName}</div>
                      <small className="text-muted">ID: {q.userId || '—'}</small>
                    </td>
                    <td><Badge bg="info" style={{ fontSize: '0.7rem' }}>{q.conversationType}</Badge></td>
                    <td>
                      <Badge bg={STATUS_VARIANTS[q.status] || 'secondary'} style={{ fontSize: '0.72rem' }}>
                        {q.status}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={PRIORITY_VARIANTS[q.priority] || 'secondary'} style={{ fontSize: '0.7rem' }}>
                        {q.priority}
                      </Badge>
                    </td>
                    <td className="text-center"><Badge bg="secondary" pill>{q.messageCount}</Badge></td>
                    <td><small className="text-muted">{fmt(q.updatedAt)}</small></td>
                    <td className="text-end">
                      <Button variant="outline-primary" size="sm" onClick={() => openDetail(q.conversationId)}>
                        <i className="bi bi-eye me-1"></i>Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-muted">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </small>
            <div className="d-flex gap-1">
              <Button variant="outline-secondary" size="sm" disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>
                <i className="bi bi-chevron-left"></i>
              </Button>
              <Button variant="outline-secondary" size="sm" disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>
                <i className="bi bi-chevron-right"></i>
              </Button>
            </div>
          </div>
        )}

      {/* Detail modal */}
      <Modal show={!!detail} onHide={() => setDetail(null)} size="lg" centered className="admin-modal-dark">
        <Modal.Header closeButton>
          <Modal.Title>{detail?.subject || (detailLoading ? 'Loading…' : 'Conversation')}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {detailLoading || detail?.loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : detail?.error ? (
            <Alert variant="danger">{detail.error}</Alert>
          ) : detail ? (
            <>
              <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
                <Badge bg={STATUS_VARIANTS[detail.status] || 'secondary'}>{detail.status}</Badge>
                <Badge bg={PRIORITY_VARIANTS[detail.priority] || 'secondary'}>{detail.priority}</Badge>
                <Badge bg="info">{detail.conversationType}</Badge>
                <span className="text-muted small ms-2">
                  From <strong>{detail.userName}</strong> · Opened {fmt(detail.createdAt)}
                </span>
                <span className="text-muted small ms-auto">
                  {detail.assignedTo ? (
                    <>Assigned to <strong>{detail.assignedToName || `User #${detail.assignedTo}`}</strong></>
                  ) : (
                    'Unassigned'
                  )}
                </span>
              </div>

              <div className="message-thread">
                {detail.messages?.map((m) => (
                  <div key={m.messageId} className={`message-bubble ${m.isFromAdmin ? 'admin' : 'user'}`}>
                    <div className="message-meta">
                      <strong>{m.senderName}</strong>
                      {m.isFromAdmin && <Badge bg="primary" className="ms-1" style={{ fontSize: '0.6rem' }}>Admin</Badge>}
                      {!m.isFromAdmin && m.senderId === detail.userId && <Badge bg="secondary" className="ms-1" style={{ fontSize: '0.6rem' }}>User</Badge>}
                      <span className="ms-2 small text-muted">{fmt(m.createdAt)}</span>
                    </div>
                    <div className="message-text">{m.messageText}</div>
                  </div>
                ))}
              </div>

              {detail.status !== 'Closed' && (
                <div className="mt-3">
                  <Form.Label className="small text-muted">Reply</Form.Label>
                  <Form.Control as="textarea" rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply…"
                  />
                </div>
              )}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          {detail && !detail.loading && !detail.error && detail.status !== 'Closed' && (
            <>
              <div className="me-auto d-flex align-items-center gap-2">
                <Form.Label className="mb-0 small text-muted">Assign to</Form.Label>
                <Form.Select
                  size="sm"
                  style={{ minWidth: 160 }}
                  value={detail.assignedTo || ''}
                  disabled={assigning}
                  onChange={(e) => assignConv(e.target.value ? parseInt(e.target.value, 10) : null)}
                >
                  <option value="">Unassigned</option>
                  {admins.map((a) => (
                    <option key={a.userId} value={a.userId}>
                      {a.fullName || a.username}
                    </option>
                  ))}
                </Form.Select>
              </div>
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
        .stat-card-sm {
          background: var(--bg-card); border: 1px solid var(--border-slate);
          border-radius: var(--radius-md); text-align: center;
        }
        .stat-card-sm .card-body { padding: 0.75rem; }
        .stat-sm-num { font-size: 1.6rem; font-weight: 800; color: var(--accent-sky); line-height: 1.2; }
        .stat-sm-num.text-warning { color: #F59E0B; }
        .stat-sm-num.text-success { color: #10B981; }
        .stat-sm-num.text-danger { color: #EF4444; }
        .stat-sm-label { font-size: 0.7rem; color: var(--text-gray); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
        .inactive-row td { opacity: 0.55; }
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
        .message-thread { display: flex; flex-direction: column; gap: 0.65rem; }
        .message-bubble {
          padding: 0.7rem 0.9rem; border-radius: var(--radius-md);
          max-width: 80%;
        }
        .message-bubble.user {
          background: var(--primary-slate); border: 1px solid var(--border-slate);
          align-self: flex-start;
        }
        .message-bubble.admin {
          background: rgba(56,189,248,0.12); border: 1px solid rgba(56,189,248,0.3);
          align-self: flex-end; margin-left: auto;
        }
        .message-meta { margin-bottom: 0.3rem; font-size: 0.82rem; }
        .message-text {
          color: var(--text-light); white-space: pre-wrap;
          font-size: 0.9rem; line-height: 1.5;
        }
      `}</style>
    </AdminPageFrame>
  );

}
