import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Spinner, Modal, Form } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { registrationService } from '../../services/registrationService';
import AdminPageFrame from '../../components/AdminPageFrame';
import '../admin/AdminForm.css';

/* ─────────────────────────────────────────────────
 * AdminRegistrationsPage
 *   Review and act on every user registration made
 *   against campaigns and programmes. Approve or
 *   reject pending entries; read-only for resolved.
 * ───────────────────────────────────────────────── */

const STATUS_OPTIONS = [
  { value: '',         label: 'All statuses' },
  { value: 'Pending',  label: 'Pending' },
  { value: 'Registered', label: 'Registered (awaiting review)' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '',          label: 'All types' },
  { value: 'Campaign',  label: 'Campaigns only' },
  { value: 'Programme', label: 'Programmes only' },
];

// Map backend status to display pill class + label.
function pillFor(status) {
  switch ((status || '').toLowerCase()) {
    case 'approved':   return { cls: 'af-pill-active',    label: 'Approved' };
    case 'rejected':   return { cls: 'af-pill-failed',    label: 'Rejected' };
    case 'cancelled':  return { cls: 'af-pill-cancelled', label: 'Cancelled' };
    case 'pending':
    case 'registered':
    default:           return { cls: 'af-pill-pending',   label: status || 'Pending' };
  }
}

function typePillFor(type) {
  return type === 'Programme' ? 'af-pill-programme' : 'af-pill-campaign';
}

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function AdminRegistrationsPage() {
  const { user } = useAuth();
  const canAccess = user?.role === 'Admin';

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  // Data
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1, pageSize: 25, total: 0, totalPages: 1,
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Action modal state (used for both approve and reject)
  const [action, setAction] = useState(null); // { type: 'approve'|'reject', item }
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [reason, setReason] = useState('');

  // ── Fetch list ────────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const params = {
        page: pagination.page,
        pageSize: pagination.pageSize,
      };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter)   params.type = typeFilter;
      if (search.trim()) params.search = search.trim();

      const res = await registrationService.getAll(params);

      // Backend returns { success, message, data: { items, page, pageSize, totalCount } }
      const data = res?.data ?? res;
      const list = data?.items ?? [];
      setItems(list);
      setPagination((p) => ({
        page: data?.page ?? p.page,
        pageSize: data?.pageSize ?? p.pageSize,
        total: data?.totalCount ?? list.length,
        totalPages: Math.max(
          1,
          Math.ceil((data?.totalCount ?? list.length) / ((data?.pageSize ?? p.pageSize) || 25))
        ),
      }));
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || err.response?.data?.message || 'Failed to load registrations.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, statusFilter, typeFilter, search]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await registrationService.getStats();
      const data = res?.data ?? res;
      setStats(data);
    } catch (err) {
      // Non-fatal — page works without stats
      console.warn('Failed to load registration stats', err);
    }
  }, []);

  useEffect(() => {
    if (canAccess) {
      fetchList();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess, pagination.page, pagination.pageSize, statusFilter, typeFilter]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPagination((p) => ({ ...p, page: 1 })); }, [statusFilter, typeFilter, search]);

  // ── Derived helpers ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    // Backend already filters by status/type/search, but the page also keeps
    // a tiny client-side search as a safety net when the user types quickly.
    const s = search.trim().toLowerCase();
    if (!s) return items;
    return items.filter((r) =>
      (r.userName || '').toLowerCase().includes(s) ||
      (r.userEmail || '').toLowerCase().includes(s) ||
      (r.campaignName || '').toLowerCase().includes(s) ||
      (r.programmeName || '').toLowerCase().includes(s)
    );
  }, [items, search]);

  // ── Approve / reject actions ──────────────────────────────────────────────
  const openApprove = (item) => {
    setAction({ type: 'approve', item });
    setReason('');
    setActionError(null);
  };

  const openReject = (item) => {
    setAction({ type: 'reject', item });
    setReason('');
    setActionError(null);
  };

  const closeAction = () => {
    if (actionBusy) return;
    setAction(null);
    setReason('');
    setActionError(null);
  };

  const submitAction = async () => {
    if (!action) return;
    const { type, item } = action;
    setActionBusy(true);
    setActionError(null);
    try {
      const payload = {
        registrationType: item.registrationType,
        registrationId: item.registrationId,
      };
      if (type === 'approve') {
        await registrationService.approve(payload);
        setSuccessMsg(`Approved registration for ${item.userName || 'user'}.`);
      } else {
        await registrationService.reject({ ...payload, reason });
        setSuccessMsg(`Rejected registration for ${item.userName || 'user'}.`);
      }
      setAction(null);
      setReason('');
      // Refresh list and stats; auto-clear success banner after a few seconds
      await Promise.all([fetchList(), fetchStats()]);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setActionError(err.message || err.response?.data?.message || 'Action failed.');
    } finally {
      setActionBusy(false);
    }
  };

  // ── Permission guard ──────────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <AdminPageFrame
        eyebrow="People · Registrations"
        title="Registrations"
        sub="You do not have permission to access this page."
        error="Admin access required."
      />
    );
  }

  return (
    <AdminPageFrame
      eyebrow="People · Registrations"
      title="Registrations"
      sub="Approve, reject, or review every campaign and programme registration submitted by users."
      actions={
        <>
          <button type="button" className="af-btn af-btn-secondary" onClick={() => { fetchList(); fetchStats(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            <span>Refresh</span>
          </button>
        </>
      }
      error={errorMsg}
      success={successMsg}
    >
      {/* KPI chips */}
      {stats && (
        <div className="ar-stats">
          <StatChip tone="pending"  label="Pending"   value={stats.pending} />
          <StatChip tone="approved" label="Approved"  value={stats.approved} />
          <StatChip tone="rejected" label="Rejected"  value={stats.rejected} />
          <StatChip tone="total"    label="Total"     value={stats.total} />
          <div className="ar-stats-split">
            <StatChip tone="campaign"  label="Campaigns"  value={stats.campaignCount} small />
            <StatChip tone="programme" label="Programmes" value={stats.programmeCount} small />
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="af-toolbar">
        <div className="af-search">
          <span className="af-search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text"
            className="af-search-input"
            placeholder="Search by user name, email, or programme/campaign…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="af-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        <select
          className="af-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Status filter"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          className="af-filter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Type filter"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>{o.label}</option>
          ))}
        </select>

        {(statusFilter || typeFilter || search) && (
          <button
            type="button"
            className="af-btn af-btn-ghost af-btn-sm"
            onClick={() => { setStatusFilter(''); setTypeFilter(''); setSearch(''); }}
          >
            Clear
          </button>
        )}

        <div className="af-toolbar-spacer" />
        <span className="af-meta-count">{pagination.total} registration(s)</span>
      </div>

      {/* Table or empty */}
      {!loading && filtered.length === 0 ? (
        <div className="af-empty">
          <div className="af-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <h3 className="af-empty-title">No registrations found</h3>
          <p className="af-empty-text">
            {(statusFilter || typeFilter || search)
              ? 'Try clearing your filters to see more results.'
              : 'Users haven\'t registered for any campaigns or programmes yet.'}
          </p>
        </div>
      ) : (
        <div className="af-panel">
          <div className="af-table-wrap">
            <table className="af-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Target</th>
                  <th>Type</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th>Reviewed</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const pill = pillFor(r.status);
                  const targetName = r.registrationType === 'Programme'
                    ? r.programmeName
                    : r.campaignName;
                  const isPending = !r.status || r.status === 'Pending' || r.status === 'Registered';
                  return (
                    <tr key={`${r.registrationType}-${r.registrationId}`}>
                      <td>
                        <div className="af-cell-strong">{r.userName || `User #${r.userId}`}</div>
                        <div className="af-cell-meta">{r.userEmail || `ID: ${r.userId}`}</div>
                      </td>
                      <td>
                        <div className="af-cell-strong">{targetName || '—'}</div>
                        <div className="af-cell-meta">
                          {r.registrationType === 'Programme'
                            ? `Programme #${r.programmeId}`
                            : `Campaign #${r.campaignId}`}
                        </div>
                      </td>
                      <td>
                        <span className={`af-pill ${typePillFor(r.registrationType)}`}>
                          {r.registrationType}
                        </span>
                      </td>
                      <td>
                        <div className="af-cell-meta">{fmtDateTime(r.registrationDate)}</div>
                        {r.notes && (
                          <div className="af-cell-meta" title={r.notes} style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            “{r.notes}”
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`af-pill ${pill.cls}`}>{pill.label}</span>
                        {r.attendanceConfirmed && (
                          <div className="af-cell-meta" style={{ marginTop: 4, color: 'var(--c4k-success, #166534)' }}>
                            Attendance confirmed
                          </div>
                        )}
                      </td>
                      <td>
                        {r.reviewedAt
                          ? (
                            <>
                              <div className="af-cell-meta">{fmtDate(r.reviewedAt)}</div>
                              <div className="af-cell-meta">by {r.reviewedBy || 'admin'}</div>
                            </>
                          )
                          : <span className="af-cell-meta">—</span>}
                      </td>
                      <td className="text-end">
                        {isPending ? (
                          <div className="d-inline-flex gap-2">
                            <button
                              type="button"
                              className="af-btn af-btn-primary af-btn-sm"
                              onClick={() => openApprove(r)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              className="af-btn af-btn-danger af-btn-sm"
                              onClick={() => openReject(r)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="af-cell-meta">No actions</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="af-pagination">
              <span>
                Page <strong>{pagination.page}</strong> of {pagination.totalPages}
                <span style={{ marginLeft: 8, color: 'var(--c4k-gray-400, #9CA3AF)' }}>
                  ({pagination.total} total)
                </span>
              </span>
              <div className="af-pagination-pages">
                <button
                  type="button"
                  className="af-page-btn"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                >
                  ‹ Prev
                </button>
                <button
                  type="button"
                  className="af-page-btn"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: Math.min(pagination.totalPages, p.page + 1) }))}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && filtered.length === 0 && (
        <div className="af-loading"><Spinner animation="border" /></div>
      )}

      {/* ─── Approve / Reject confirmation modal ─── */}
      <Modal show={!!action} onHide={closeAction} centered className="ar-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            {action?.type === 'approve' ? 'Approve registration' : 'Reject registration'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {action && (
            <>
              <p className="mb-3">
                {action.type === 'approve'
                  ? <>You are about to <strong>approve</strong> the following registration.</>
                  : <>You are about to <strong>reject</strong> the following registration.</>}
              </p>

              <ul className="ar-modal-list">
                <li><span>User</span><strong>{action.item.userName || `User #${action.item.userId}`}</strong></li>
                <li><span>Email</span><strong>{action.item.userEmail || '—'}</strong></li>
                <li>
                  <span>{action.item.registrationType === 'Programme' ? 'Programme' : 'Campaign'}</span>
                  <strong>{action.item.programmeName || action.item.campaignName || '—'}</strong>
                </li>
                <li><span>Registered on</span><strong>{fmtDateTime(action.item.registrationDate)}</strong></li>
              </ul>

              {action.type === 'reject' && (
                <Form.Group className="mt-3">
                  <Form.Label className="small fw-semibold">Reason (optional, sent to user)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Tell the user why this registration was rejected…"
                    maxLength={500}
                  />
                  <Form.Text className="text-muted">{reason.length}/500</Form.Text>
                </Form.Group>
              )}

              {actionError && (
                <div className="af-banner af-banner-error mt-3" role="alert">
                  <span>{actionError}</span>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="af-btn af-btn-secondary" onClick={closeAction} disabled={actionBusy}>
            Cancel
          </button>
          <button
            type="button"
            className={`af-btn ${action?.type === 'approve' ? 'af-btn-primary' : 'af-btn-danger'}`}
            onClick={submitAction}
            disabled={actionBusy}
          >
            {actionBusy ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span>{action?.type === 'approve' ? 'Approving…' : 'Rejecting…'}</span>
              </>
            ) : (
              <>
                {action?.type === 'approve'
                  ? (<><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12"/></svg><span>Confirm approve</span></>)
                  : (<><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 14, height: 14 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>Confirm reject</span></>)}
              </>
            )}
          </button>
        </Modal.Footer>
      </Modal>

      <style>{`
        /* ── Stats chips ── */
        .ar-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 18px;
          align-items: center;
        }
        .ar-stats-split {
          display: flex;
          gap: 12px;
          margin-left: auto;
        }
        .ar-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 16px;
          background: #fff;
          border: 1px solid var(--c4k-gray-200, #E5E7EB);
          border-radius: 10px;
          min-width: 110px;
        }
        .ar-stat-num { font-size: 1.35rem; font-weight: 800; line-height: 1.1; color: var(--c4k-charcoal, #1A1A1A); }
        .ar-stat-label {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--c4k-gray-500, #6B7280);
        }
        .ar-stat.ar-stat-sm { padding: 6px 12px; min-width: 90px; }
        .ar-stat.ar-stat-sm .ar-stat-num { font-size: 1rem; }
        .ar-stat-tone-pending  .ar-stat-num  { color: #B45309; }
        .ar-stat-tone-approved .ar-stat-num  { color: #166534; }
        .ar-stat-tone-rejected .ar-stat-num  { color: #B91C1C; }
        .ar-stat-tone-total    .ar-stat-num  { color: var(--c4k-teal-dark, #0A5C73); }
        .ar-stat-tone-campaign  .ar-stat-num { color: var(--c4k-coral-darker, #9F452F); }
        .ar-stat-tone-programme .ar-stat-num { color: var(--c4k-teal, #0E7490); }

        /* ── Pills used in the table ── */
        .af-pill {
          display: inline-block;
          padding: 3px 9px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border-radius: 99px;
          background: var(--c4k-gray-100, #F3F4F6);
          color: var(--c4k-gray-700, #374151);
          line-height: 1.5;
        }
        .af-pill-active    { background: #DCFCE7; color: #166534; }
        .af-pill-failed    { background: #FEE2E2; color: #B91C1C; }
        .af-pill-cancelled { background: #E5E7EB; color: #4B5563; }
        .af-pill-pending   { background: #FEF3C7; color: #B45309; }
        .af-pill-campaign  { background: #FAE6DD; color: #9F452F; }
        .af-pill-programme { background: #E0F2FE; color: #075985; }

        /* ── Modal polish ── */
        .ar-modal .modal-content {
          border-radius: 14px;
          border: 1px solid var(--c4k-gray-200, #E5E7EB);
        }
        .ar-modal-list {
          list-style: none;
          padding: 12px 14px;
          margin: 0;
          background: var(--c4k-gray-50, #F9FAFB);
          border-radius: 10px;
          border: 1px solid var(--c4k-gray-200, #E5E7EB);
        }
        .ar-modal-list li {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 4px 0;
          font-size: 0.875rem;
        }
        .ar-modal-list li + li { border-top: 1px dashed var(--c4k-gray-200, #E5E7EB); margin-top: 4px; padding-top: 8px; }
        .ar-modal-list span { color: var(--c4k-gray-500, #6B7280); }
        .ar-modal-list strong { color: var(--c4k-charcoal, #1A1A1A); text-align: right; word-break: break-word; }

        .d-inline-flex { display: inline-flex; }
        .gap-2 { gap: 8px; }
      `}</style>
    </AdminPageFrame>
  );
}

function StatChip({ tone, label, value, small }) {
  return (
    <div className={`ar-stat ar-stat-tone-${tone} ${small ? 'ar-stat-sm' : ''}`}>
      <span className="ar-stat-num">{value ?? 0}</span>
      <span className="ar-stat-label">{label}</span>
    </div>
  );
}

export default AdminRegistrationsPage;