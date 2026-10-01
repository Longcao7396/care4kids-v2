import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_VARIANTS = {
  Pending: 'warning', Sent: 'success', Failed: 'secondary',
  Registered: 'info', Cancelled: 'dark',
};

/* ── validation ── */
function validate(data) {
  const errs = {};
  if (!data.inviteeName?.trim())
    errs.inviteeName = "Friend's name is required.";
  if (!data.inviteeEmail?.trim())
    errs.inviteeEmail = "Friend's email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.inviteeEmail))
    errs.inviteeEmail = 'Please enter a valid email address.';
  if (data.personalMessage && data.personalMessage.length > 500)
    errs.personalMessage = 'Message must be 500 characters or less.';
  return errs;
}

const EMPTY = { inviteeName: '', inviteeEmail: '', personalMessage: '' };

export default function InviteFriendsModal({ show, onHide }) {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [myInvites, setMyInvites] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const fetchMine = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await api.get('/invitations/mine');
      setMyInvites(Array.isArray(res) ? res : (res?.items || []));
    } catch { /* non-fatal */ }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => {
    if (show) {
      setForm(EMPTY);
      setErrors({});
      setSuccess(null);
      setServerError(null);
      fetchMine();
    }
  }, [show, fetchMine]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSending(true);
    setServerError(null);
    setSuccess(null);
    try {
      const res = await api.post('/invitations', form);
      setSuccess({ message: 'Invitation sent successfully.', data: res });
      setForm(EMPTY);
      setErrors({});
      fetchMine();
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Failed to send invitation.');
    } finally {
      setSending(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  if (!user) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className="admin-modal-dark">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-envelope-paper-heart-fill me-2 text-accent"></i>
          Invite Friends
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
            <i className="bi bi-check-circle-fill me-2"></i>
            {success.message}
            {success.data?.emailServiceActive === false && (
              <div className="small mt-1 text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Email service is in mock mode — invite has been recorded but no real email was sent.
              </div>
            )}
          </Alert>
        )}
        {serverError && (
          <Alert variant="danger" dismissible onClose={() => setServerError(null)}>{serverError}</Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Friend's Name *</Form.Label>
            <Form.Control
              value={form.inviteeName} onChange={set('inviteeName')}
              placeholder="e.g. Jane Doe" isInvalid={!!errors.inviteeName}
              autoFocus
            />
            <Form.Control.Feedback type="invalid">{errors.inviteeName}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Friend's Email *</Form.Label>
            <Form.Control
              type="email" value={form.inviteeEmail} onChange={set('inviteeEmail')}
              placeholder="jane@example.org" isInvalid={!!errors.inviteeEmail}
            />
            <Form.Control.Feedback type="invalid">{errors.inviteeEmail}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>
              Personal Message
              <span className="text-muted small ms-2">
                ({form.personalMessage?.length || 0}/500)
              </span>
            </Form.Label>
            <Form.Control
              as="textarea" rows={3} maxLength={500}
              value={form.personalMessage} onChange={set('personalMessage')}
              placeholder={`Hey, join me in supporting Give-AID's mission…`}
              isInvalid={!!errors.personalMessage}
            />
            <Form.Control.Feedback type="invalid">{errors.personalMessage}</Form.Control.Feedback>
          </Form.Group>
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <i className="bi bi-shield-check me-1"></i>
              Inviting as <strong>{user.fullName || user.email}</strong>
            </small>
            <Button variant="primary" type="submit" disabled={sending}>
              {sending ? (
                <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />Sending…</>
              ) : (
                <><i className="bi bi-send-fill me-2"></i>Send Invitation</>
              )}
            </Button>
          </div>
        </Form>

        <hr style={{ borderColor: 'var(--border-slate)' }} className="my-4" />

        <h6 className="text-light mb-3">
          <i className="bi bi-clock-history me-2"></i>Your Sent Invitations
        </h6>
        {loadingList ? (
          <div className="text-center py-3"><Spinner animation="border" size="sm" variant="primary" /></div>
        ) : myInvites.length === 0 ? (
          <p className="text-muted text-center small mb-0 py-3">
            No invitations yet. Send your first invite above!
          </p>
        ) : (
          <div className="invite-list">
            {myInvites.map((i) => (
              <div key={i.invitationId} className="invite-item">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1 min-w-0">
                    <div className="invite-name">{i.inviteeName}</div>
                    <div className="invite-email text-muted small">{i.inviteeEmail}</div>
                    {i.personalMessage && (
                      <div className="invite-msg small text-muted mt-1">
                        "{i.personalMessage.length > 80 ? i.personalMessage.slice(0, 80) + '…' : i.personalMessage}"
                      </div>
                    )}
                    <div className="small text-muted mt-1">
                      <i className="bi bi-calendar3 me-1"></i>{fmtDate(i.createdAt)}
                      {i.sentAt && <><span className="mx-1">·</span>Sent {fmtDate(i.sentAt)}</>}
                    </div>
                    {i.failureReason && (
                      <div className="small text-danger mt-1">
                        <i className="bi bi-exclamation-triangle me-1"></i>{i.failureReason}
                      </div>
                    )}
                  </div>
                  <Badge bg={STATUS_VARIANTS[i.status] || 'secondary'} className="ms-2" style={{ fontSize: '0.7rem' }}>
                    {i.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>

      <style>{`
        .admin-modal-dark .modal-content { background: var(--bg-card); border: 1px solid var(--border-slate); color: var(--text-light); }
        .admin-modal-dark .modal-header, .admin-modal-dark .modal-footer { border-color: var(--border-slate); }
        .admin-modal-dark .btn-close { filter: invert(1); opacity: 0.5; }
        .admin-modal-dark .form-label { color: var(--text-light); font-size: 0.875rem; font-weight: 600; }
        .admin-modal-dark .form-control {
          background: var(--primary-slate); border: 1px solid var(--border-slate); color: var(--text-light);
        }
        .admin-modal-dark .form-control:focus {
          border-color: var(--accent-sky);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.15);
          background: var(--primary-slate); color: var(--text-light);
        }
        .admin-modal-dark hr { border-color: var(--border-slate); opacity: 0.4; }
        .invite-list {
          display: flex; flex-direction: column; gap: 0.5rem;
          max-height: 280px; overflow-y: auto;
        }
        .invite-item {
          padding: 0.65rem 0.85rem;
          background: var(--primary-slate);
          border: 1px solid var(--border-slate);
          border-radius: var(--radius-md);
        }
        .invite-name { color: var(--text-light); font-weight: 600; font-size: 0.9rem; }
        .invite-email { word-break: break-all; }
        .invite-msg { font-style: italic; }
        .min-w-0 { min-width: 0; }
      `}</style>
    </Modal>
  );
}
