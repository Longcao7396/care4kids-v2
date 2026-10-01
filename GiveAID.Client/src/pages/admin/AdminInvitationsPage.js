import React, { useState, useEffect, useCallback } from 'react';
import { Spinner } from 'react-bootstrap';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import AdminPageFrame from '../../components/AdminPageFrame';
import '../admin/AdminForm.css';

/* ─────────────────────────────────────────────────
 * AdminInvitationsPage
 *   View every referral invitation sent by users.
 *   Filter by status (Pending/Sent/Registered/Failed/Cancelled).
 * ───────────────────────────────────────────────── */

const STATUS_OPTIONS = ['Pending', 'Sent', 'Registered', 'Failed', 'Cancelled'];

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function AdminInvitationsPage() {
  const { user } = useAuth();
  const canAccess = user?.role === 'Admin';

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 30, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const params = { page, pageSize: 30 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/invitations', { params });
      // res is { items, page, pageSize, totalCount }
      setItems(res.items || []);
      const total = res.totalCount ?? res.total ?? 0;
      const pageSize = res.pageSize ?? 30;
      setPagination({
        page: res.page ?? page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to load invitations.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  if (!canAccess) {
    return (
      <AdminPageFrame
        eyebrow="Communication · Invitations"
        title="Invitations"
        sub="You do not have permission to access this page."
        error="Admin access required."
      />
    );
  }

  return (
    <AdminPageFrame
      eyebrow="Communication · Invitations"
      title="Invitations"
      sub="Every referral invitation sent by users. See who reached out to whom, and what happened next."
      error={errorMsg}
    >
      {/* Toolbar */}
      <div className="af-toolbar">
        <div className="af-search" style={{ flex: 'none', minWidth: 200 }}>
          <span className="af-search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9 22 2z"/>
            </svg>
          </span>
          <select
            className="af-search-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ paddingLeft: 36, appearance: 'auto' }}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <button type="button" className="af-btn af-btn-secondary" onClick={fetch}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 14, height: 14 }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          <span>Refresh</span>
        </button>

        <div className="af-toolbar-spacer" />
        <span className="af-meta-count">{pagination.total} invitation(s)</span>
      </div>

      {/* Table or empty */}
      {!loading && items.length === 0 ? (
        <div className="af-empty">
          <div className="af-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h3 className="af-empty-title">No invitations found</h3>
          <p className="af-empty-text">
            {statusFilter
              ? 'Try selecting a different status.'
              : 'Users haven\'t sent any referral invitations yet.'}
          </p>
        </div>
      ) : (
        <div className="af-panel">
          <div className="af-table-wrap">
            <table className="af-table">
              <thead>
                <tr>
                  <th>Invitee</th>
                  <th>Inviter</th>
                  <th>Personal message</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.invitationId}>
                    <td>
                      <div className="af-cell-strong">{i.inviteeName}</div>
                      <div className="af-cell-meta">{i.inviteeEmail}</div>
                    </td>
                    <td>
                      <div className="af-cell-strong">{i.inviterName || '—'}</div>
                    </td>
                    <td>
                      {i.personalMessage
                        ? <span className="af-cell-meta" style={{ display: 'block', maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={i.personalMessage}>"{i.personalMessage}"</span>
                        : <span className="af-cell-meta">—</span>}
                    </td>
                    <td>
                      <span className={`af-pill af-pill-${statusPillKey(i.status)}`}>
                        {i.status}
                      </span>
                      {i.failureReason && (
                        <div className="af-cell-meta" style={{ marginTop: 4, color: 'var(--c4k-danger, #B91C1C)' }}>
                          {i.failureReason}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="af-cell-meta">{fmtDate(i.sentAt || i.createdAt)}</span>
                    </td>
                    <td>
                      {i.registeredAt
                        ? <span className="af-cell-strong" style={{ color: 'var(--c4k-success, #166534)' }}>{fmtDate(i.registeredAt)}</span>
                        : <span className="af-cell-meta">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="af-pagination">
              <span>
                Page <strong>{pagination.page}</strong> of {pagination.totalPages}
                <span style={{ marginLeft: 8, color: 'var(--c4k-gray-400, #9CA3AF)' }}>({pagination.total} total)</span>
              </span>
              <div className="af-pagination-pages">
                <button type="button" className="af-page-btn" disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Prev</button>
                <button type="button" className="af-page-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}>Next ›</button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="af-loading"><Spinner animation="border" /></div>
      )}
    </AdminPageFrame>
  );
}

function statusPillKey(s) {
  switch (s) {
    case 'Registered': return 'active';
    case 'Sent':       return 'ongoing';
    case 'Pending':    return 'pending';
    case 'Failed':     return 'failed';
    case 'Cancelled':  return 'cancelled';
    default:           return 'reviewed';
  }
}

export default AdminInvitationsPage;
