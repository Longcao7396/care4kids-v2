import React, { useState, useEffect, useCallback } from 'react';
import { Spinner } from 'react-bootstrap';
import api from '../../services/api';
import AdminPageFrame from '../../components/AdminPageFrame';
import '../admin/AdminForm.css';

/* ----------------------------------------------------------------------
 * AdminDonationsPage
 *   Lists every donation across the platform.
 *   Filters: status (Completed/Pending/Failed/Refunded), search.
 *   Pagination: server-side via page/pageSize.
 *
 * NOTE on encoding:
 *   This file is intentionally pure ASCII. All non-ASCII characters are
 *   written as JavaScript Unicode escapes (\uXXXX) so the source cannot
 *   be corrupted by an editor that saves in a non-UTF-8 encoding.
 *   The visible em-dash, ellipsis, etc. are emitted at runtime by the
 *   JavaScript engine, guaranteeing correct end-to-end UTF-8 behaviour.
 * ---------------------------------------------------------------------- */

const STATUS_OPTIONS = ['Completed', 'Pending', 'Failed', 'Refunded'];

// Unicode characters used in this page, defined once via \uXXXX escapes.
//   EM_DASH  = U+2014 EM DASH
//   ELLIPSIS = U+2026 HORIZONTAL ELLIPSIS
//   MIDDOT   = U+00B7 MIDDLE DOT
//   ANGLE_L  = U+2039 SINGLE LEFT-POINTING ANGLE QUOTATION MARK
//   ANGLE_R  = U+203A SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
const EM_DASH  = '\u2014';
const ELLIPSIS = '\u2026';
const MIDDOT   = '\u00B7';
const ANGLE_L  = '\u2039';
const ANGLE_R  = '\u203A';

const fmtVnd = (n) => n != null
  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)
  : EM_DASH;

const fmtDate = (iso) => {
  if (!iso) return EM_DASH;
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

function AdminDonationsPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, averageAmount: 0 });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [page, setPage] = useState(1);

  /* Fetch campaign list once for the dropdown */
  useEffect(() => {
    api.get('/campaigns', { params: { pageSize: 200 } })
      .then((r) => setCampaigns(Array.isArray(r.items) ? r.items : []))
      .catch(() => {});
  }, []);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const params = { page, pageSize: 20 };
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      if (campaignFilter) params.campaignId = campaignFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.get('/donations', { params });
      // res is { items, page, pageSize, total, totalPages, summary }
      setItems(res.items || []);
      setSummary(res.summary || { totalAmount: 0, averageAmount: 0 });
      setPagination({
        page: res.page,
        pageSize: res.pageSize,
        total: res.total,
        totalPages: res.totalPages || 1,
      });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to load donations.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, campaignFilter, dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [fetch]);

  /* Reset page when filters change */
  useEffect(() => { setPage(1); }, [statusFilter, search, campaignFilter, dateFrom, dateTo]);

  /* Build compact pagination window */
  const pageNumbers = (() => {
    const tp = pagination.totalPages;
    const cur = pagination.page;
    const arr = [];
    for (let i = 1; i <= tp; i++) {
      if (i === 1 || i === tp || Math.abs(i - cur) <= 2) arr.push(i);
      else if (arr[arr.length - 1] !== ELLIPSIS) arr.push(ELLIPSIS);
    }
    return arr;
  })();

  return (
    <AdminPageFrame
      eyebrow={`Fundraising ${MIDDOT} Donations`}
      title="Donations"
      sub={`Every donation that has reached GiveAID ${EM_DASH} track status, donor, and impact.`}
      error={errorMsg}
    >
      {/* Summary KPIs */}
      <div className="ad-summary-row">
        <div className="ad-summary-card">
          <span className="ad-summary-lbl">Showing</span>
          <span className="ad-summary-val">{pagination.total}</span>
          <span className="ad-summary-meta">donation(s)</span>
        </div>
        <div className="ad-summary-card">
          <span className="ad-summary-lbl">Total amount</span>
          <span className="ad-summary-val">{fmtVnd(summary.totalAmount)}</span>
          <span className="ad-summary-meta">across filtered results</span>
        </div>
        <div className="ad-summary-card">
          <span className="ad-summary-lbl">Average gift</span>
          <span className="ad-summary-val">{fmtVnd(summary.averageAmount)}</span>
          <span className="ad-summary-meta">per donation</span>
        </div>
      </div>

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
            placeholder={`Search donor, email, transaction ID, cause${ELLIPSIS}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="af-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        <select className="af-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className="af-filter" value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)}>
          <option value="">All campaigns</option>
          {campaigns.map((c) => <option key={c.campaignId} value={c.campaignId}>{c.campaignName}</option>)}
        </select>

        <input
          type="date"
          className="af-filter"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From"
        />

        <input
          type="date"
          className="af-filter"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To"
        />

        <div className="af-toolbar-spacer" />
        <button type="button" className="af-btn af-btn-secondary" onClick={fetch}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 14, height: 14 }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Table or empty state */}
      {!loading && items.length === 0 ? (
        <div className="af-empty">
          <div className="af-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <h3 className="af-empty-title">No donations found</h3>
          <p className="af-empty-text">
            {search || statusFilter ? 'Try adjusting your filters.' : 'Donations will appear here as supporters give.'}
          </p>
        </div>
      ) : (
        <div className="af-panel">
          <div className="af-table-wrap">
            <table className="af-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Amount</th>
                  <th>Cause / Campaign</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Transaction</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.donationId}>
                    <td>
                      <div className="ad-donor">
                        <div className={`ad-donor-avatar ${d.isAnonymous ? 'is-anon' : ''}`} aria-hidden="true">
                          {d.isAnonymous ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                          ) : (d.userName || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="af-cell-strong">
                            {d.userName}
                            {d.isAnonymous && <span className="ad-anon-tag">hidden</span>}
                          </div>
                          {d.userEmail && <div className="af-cell-meta">{d.userEmail}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="af-cell-strong ad-don-amount">{fmtVnd(d.amount)}</div>
                    </td>
                    <td>
                      <div className="af-cell-strong">{d.causeName}</div>
                      {d.campaignName && <div className="af-cell-meta">{d.campaignName}</div>}
                    </td>
                    <td>
                      <span className="af-cell-meta">{d.paymentMethod || EM_DASH}</span>
                    </td>
                    <td>
                      <span className={`af-pill af-pill-${(d.paymentStatus || '').toLowerCase()}`}>
                        {d.paymentStatus || EM_DASH}
                      </span>
                    </td>
                    <td>
                      <code className="af-code">{d.transactionId || EM_DASH}</code>
                    </td>
                    <td>
                      <span className="af-cell-meta">{fmtDate(d.donationDate)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {`${ANGLE_L} Prev`}
                </button>
                {pageNumbers.map((n, idx) =>
                  n === ELLIPSIS ? (
                    <span key={`gap-${idx}`} className="af-page-btn" style={{ border: 0, background: 'transparent' }} disabled>{ELLIPSIS}</span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      className={`af-page-btn ${pagination.page === n ? 'is-current' : ''}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  )
                )}
                <button
                  type="button"
                  className="af-page-btn"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                >
                  {`Next ${ANGLE_R}`}
                </button>
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

export default AdminDonationsPage;