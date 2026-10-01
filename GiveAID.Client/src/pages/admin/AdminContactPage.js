import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Badge, Alert, Button,
  Modal, Form, Spinner, Pagination, InputGroup
} from 'react-bootstrap';
import { contactService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import AdminPageFrame from '../../components/AdminPageFrame';

const PER_PAGE = 20;

function ContactList({ contacts, total, page, onPageChange, onSelect, onRefresh }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const handleToggleRead = async (id, e) => {
    e.stopPropagation();
    await contactService.toggleRead(id);
    onRefresh();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this contact submission permanently?')) return;
    await contactService.remove(id);
    onRefresh();
  };

  let totalPages = 1;
  if (total) totalPages = Math.ceil(total / PER_PAGE);
  const pageItems = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 2) {
      pageItems.push(i);
    }
  }

  return (
    <div>
      <Table responsive hover className="align-middle">
        <thead className="bg-light">
          <tr>
            <th style={{ width: 32 }}></th>
            <th>Name / Email</th>
            <th>Subject</th>
            <th>Date</th>
            <th>Status</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {contacts.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-muted py-5">
                No contact submissions found.
              </td>
            </tr>
          ) : (
            contacts.map((c) => (
              <tr
                key={c.contactId}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(c)}
                className={!c.isRead ? 'unread-row' : ''}
              >
                <td>
                  {!c.isRead && (
                    <span
                      className="unread-dot"
                      title="Unread"
                    ></span>
                  )}
                </td>
                <td>
                  <div className="fw-semibold">{c.name}</div>
                  <a
                    href={`mailto:${c.email}`}
                    className="text-muted small"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {c.email}
                  </a>
                  {c.phone && (
                    <div className="text-muted small">{c.phone}</div>
                  )}
                </td>
                <td>
                  <span className="fw-medium">{c.subject || '—'}</span>
                  <div className="text-muted small message-preview">
                    {c.messagePreview}
                  </div>
                </td>
                <td>
                  <span className="small text-muted">
                    {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                  <div className="small text-muted">
                    {new Date(c.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </td>
                <td>
                  {!c.isRead ? (
                    <Badge bg="primary">Unread</Badge>
                  ) : c.hasReply ? (
                    <Badge bg="success">Replied</Badge>
                  ) : (
                    <Badge bg="secondary">Read</Badge>
                  )}
                </td>
                <td className="text-end">
                  <div className="d-flex gap-1 justify-content-end">
                    <Button
                      variant={c.isRead ? 'outline-secondary' : 'outline-primary'}
                      size="sm"
                      title={c.isRead ? 'Mark unread' : 'Mark read'}
                      onClick={(e) => handleToggleRead(c.contactId, e)}
                    >
                      <i className={`bi ${c.isRead ? 'bi-envelope' : 'bi-envelope-open'}`}></i>
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        title="Delete"
                        onClick={(e) => handleDelete(c.contactId, e)}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-3">
          <Pagination>
            <Pagination.Prev
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            />
            {pageItems.map((p, idx) => {
              const prevItem = pageItems[idx - 1];
              return (
                <React.Fragment key={p}>
                  {prevItem && p - prevItem > 1 && <Pagination.Ellipsis />}
                  <Pagination.Item
                    active={p === page}
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </Pagination.Item>
                </React.Fragment>
              );
            })}
            <Pagination.Next
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            />
          </Pagination>
        </div>
      )}

      <style>{`
        .unread-row td { background-color: rgba(56, 189, 248, 0.04) !important; }
        .unread-dot {
          display: block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-sky);
          margin: 0 auto;
        }
        /* Override Bootstrap pagination colors to match Care4Kids admin theme (teal) */
        .pagination .page-link {
          color: var(--c4k-charcoal, #1A1A1A);
          background-color: #fff;
          border-color: var(--c4k-gray-200, #E5E7EB);
          transition: all 0.15s ease;
        }
        .pagination .page-link:hover:not(.disabled) {
          color: var(--c4k-teal, #0E7490);
          background-color: var(--c4k-gray-50, #F9FAFB);
          border-color: var(--c4k-gray-300, #D1D5DB);
        }
        .pagination .page-item.active .page-link {
          background-color: var(--c4k-teal, #0E7490);
          border-color: var(--c4k-teal, #0E7490);
          color: #fff;
        }
        .pagination .page-item.disabled .page-link {
          color: var(--c4k-gray-400, #9CA3AF);
          background-color: #fff;
          border-color: var(--c4k-gray-200, #E5E7EB);
          opacity: 0.5;
        }
        .message-preview {
          max-width: 280px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

function ContactDetail({ contact, onClose, onRefresh }) {
  const [replyText, setReplyText] = useState(contact.replyMessage || '');
  const [sending, setSending] = useState(false);
  const [replySent, setReplySent] = useState(!!contact.replyMessage);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await contactService.reply(contact.contactId, { replyMessage: replyText });
      setReplySent(true);
      onRefresh();
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal show onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Contact Submission #{contact.contactId}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Contact info */}
        <Row className="mb-4">
          <Col md={6}>
            <div className="detail-field">
              <span className="detail-label">Name</span>
              <span className="detail-value">{contact.name}</span>
            </div>
          </Col>
          <Col md={6}>
            <div className="detail-field">
              <span className="detail-label">Email</span>
              <a href={`mailto:${contact.email}`} className="detail-value">
                {contact.email}
              </a>
            </div>
          </Col>
          {contact.phone && (
            <Col md={6}>
              <div className="detail-field">
                <span className="detail-label">Phone</span>
                <span className="detail-value">{contact.phone}</span>
              </div>
            </Col>
          )}
          <Col md={6}>
            <div className="detail-field">
              <span className="detail-label">Submitted</span>
              <span className="detail-value">
                {new Date(contact.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
          </Col>
          {contact.subject && (
            <Col md={12}>
              <div className="detail-field">
                <span className="detail-label">Subject</span>
                <span className="detail-value">{contact.subject}</span>
              </div>
            </Col>
          )}
        </Row>

        {/* Original message */}
        <div className="message-block">
          <div className="message-label">Message</div>
          <div className="message-content">
            {contact.message.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i < contact.message.split('\n').length - 1 && <br />}
              </span>
            ))}
          </div>
        </div>

        {/* Reply */}
        <div className="reply-section">
          <div className="reply-label">
            <i className="bi bi-reply me-2"></i>
            Admin Reply
            {replySent && (
              <Badge bg="success" className="ms-2">
                Sent {contact.repliedAt ? new Date(contact.repliedAt).toLocaleString('vi-VN') : ''}
              </Badge>
            )}
          </div>
          {replySent ? (
            <div className="reply-sent">
              {replyText}
            </div>
          ) : (
            <Form onSubmit={handleSendReply}>
              <Form.Group className="mb-3">
                <Form.Label>Your Reply</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply to the contact..."
                  required
                />
              </Form.Group>
              <div className="d-flex justify-content-end">
                <Button
                  variant="primary"
                  type="submit"
                  disabled={sending || !replyText.trim()}
                >
                  {sending ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </Form>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </Modal.Footer>

      <style>{`
        .detail-field {
          display: flex;
          flex-direction: column;
          margin-bottom: 0.75rem;
        }
        .detail-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-gray);
          font-weight: 600;
          margin-bottom: 2px;
        }
        .detail-value {
          color: var(--text-light);
          font-weight: 500;
        }
        .detail-value a { color: var(--accent-sky); }
        .message-block {
          background: var(--primary-slate);
          border: 1px solid var(--border-slate);
          border-radius: var(--radius-md);
          padding: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .message-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-gray);
          font-weight: 600;
          margin-bottom: 0.75rem;
        }
        .message-content {
          color: var(--text-gray);
          font-size: 0.95rem;
          line-height: 1.65;
          white-space: pre-wrap;
        }
        .reply-section {
          background: var(--bg-card);
          border: 1px solid var(--border-slate);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
        }
        .reply-label {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-light);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
        }
        .reply-sent {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: var(--radius-md);
          padding: 1rem;
          color: var(--text-gray);
          font-size: 0.95rem;
          white-space: pre-wrap;
          line-height: 1.65;
        }
      `}</style>
    </Modal>
  );
}

function AdminContactPage() {
  const { user } = useAuth();
  const canAccessAdmin = user?.role === 'Admin';

  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isReadFilter, setIsReadFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize: PER_PAGE };
      if (isReadFilter !== '') params.isRead = isReadFilter === 'read';
      if (search.trim()) params.search = search.trim();
      const response = await contactService.getAll(params);
      // response is { items, page, pageSize, totalCount }
      setContacts(response?.items || []);
      setTotal(response?.totalCount ?? response?.total ?? 0);
    } catch (err) {
      setError('Failed to load contact submissions.');
    } finally {
      setLoading(false);
    }
  }, [page, isReadFilter, search]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await contactService.getStats();
      if (response) setStats(response);
    } catch (err) { /* non-fatal */ }
  }, []);

  useEffect(() => {
    if (canAccessAdmin) {
      fetchContacts();
      fetchStats();
    }
  }, [canAccessAdmin, fetchContacts, fetchStats]);

  const handleSelect = async (c) => {
    try {
      const response = await contactService.getById(c.contactId);
      if (response) setSelectedContact(response);
    } catch (err) {
      setError('Failed to load contact details.');
    }
  };

  if (!canAccessAdmin) {
    return (
      <Container className="py-5">
        <Alert variant="danger">Bạn không có quyền truy cập trang này.</Alert>
      </Container>
    );
  }

  return (
    <AdminPageFrame
      eyebrow="Communication"
      title="Contact Submissions"
      sub="View and respond to messages submitted through the contact form."
      error={error}
      loading={loading && contacts.length === 0}
    >
        {stats && (
          <Row className="g-3 mb-4">
            <Col md={4}>
              <div className="achievement-stat-card">
                <div className="achievement-stat-icon"><i className="bi bi-inbox-fill"></i></div>
                <div className="achievement-stat-value">{stats.total}</div>
                <p className="achievement-stat-label">Total Messages</p>
              </div>
            </Col>
            <Col md={4}>
              <div className="achievement-stat-card">
                <div className="achievement-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
                  <i className="bi bi-envelope-fill"></i>
                </div>
                <div className="achievement-stat-value">{stats.unread}</div>
                <p className="achievement-stat-label">Unread</p>
              </div>
            </Col>
            <Col md={4}>
              <div className="achievement-stat-card">
                <div className="achievement-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
                  <i className="bi bi-check-circle-fill"></i>
                </div>
                <div className="achievement-stat-value">{stats.replied}</div>
                <p className="achievement-stat-label">Replied</p>
              </div>
            </Col>
          </Row>
        )}

        {/* Filters */}
        <div className="team-filter-bar mb-3">
          <Row className="g-3 align-items-end">
            <Col md={5}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Search name, email, subject..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                  {search && (
                    <InputGroup.Text
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setSearch(''); setPage(1); }}
                    >
                      <i className="bi bi-x-circle"></i>
                    </InputGroup.Text>
                  )}
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={isReadFilter}
                  onChange={(e) => { setIsReadFilter(e.target.value); setPage(1); }}
                >
                  <option value="">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Button
                variant="outline-secondary"
                className="w-100"
                onClick={() => {
                  setSearch('');
                  setIsReadFilter('');
                  setPage(1);
                }}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                Reset Filters
              </Button>
            </Col>
          </Row>
        </div>

        <Card>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
              </div>
            ) : (
              <ContactList
                contacts={contacts}
                total={total}
                page={page}
                onPageChange={setPage}
                onSelect={handleSelect}
                onRefresh={() => { fetchContacts(); fetchStats(); }}
              />
            )}
          </Card.Body>
        </Card>

      {selectedContact && (
        <ContactDetail
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onRefresh={() => {
            fetchContacts();
            fetchStats();
            setSelectedContact(null);
          }}
        />
      )}
    </AdminPageFrame>
  );
}

export default AdminContactPage;
