import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Row, Col, Card, Alert, Button, Badge,
  InputGroup, Form, ProgressBar, Table
} from 'react-bootstrap';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import AdminPageFrame from '../../components/AdminPageFrame';
import '../admin/AdminForm.css';

const CAMPAIGN_STATUSES = ['Active', 'Ongoing', 'Completed', 'Cancelled', 'Upcoming'];
const CAMPAIGN_STATUS_COLORS = {
  Active: 'success', Ongoing: 'primary', Completed: 'secondary',
  Cancelled: 'danger', Upcoming: 'info',
};
const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmtVnd = (n) => n != null
  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)
  : '—';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export default function AdminCampaignReportsPage() {
  const { user } = useAuth();
  const canAccess = user?.role === 'Admin';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [byMonth, setByMonth] = useState([]);
  const [byCampaign, setByCampaign] = useState([]);
  const [byCause, setByCause] = useState([]);
  const [recent, setRecent] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [causes, setCauses] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [causeFilter, setCauseFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  /* ── Fetch all data in parallel ── */
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [stats, recent, camps, caus] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/recent-donations', { params: { count: 50 } }),
        api.get('/campaigns', { params: { pageSize: 100, page: 1 } }),
        api.get('/causes', { params: { activeOnly: false } }),
      ]);
      // api.js unwraps the { success, message, data } envelope, so each entry is
      // already the payload. /admin/stats returns a FLAT DashboardStatsDto and
      // /campaigns returns a paged { items, total, … } result.
      const campaignList = Array.isArray(camps) ? camps : (camps?.items || []);
      const causeList = Array.isArray(caus) ? caus : (caus?.items || []);

      setOverview(stats ? {
        activeCampaigns: stats.activeCampaigns,
        completedCampaigns: Math.max((stats.totalCampaigns || 0) - (stats.activeCampaigns || 0), 0),
        totalDonations: stats.totalDonations,
        recentDonationsAmount: stats.totalRaisedThisMonth,
        totalDonors: stats.totalDonors,
        activeProgrammes: stats.activeCampaigns,
      } : null);
      setByMonth(stats?.donationsByMonth || []);
      // The API has no per-campaign/per-cause donation breakdown, so derive the
      // "Top campaigns" ranking and cause bars from the lists we already have.
      setByCampaign(
        [...campaignList]
          .sort((a, b) => (b.raisedAmount || 0) - (a.raisedAmount || 0))
          .slice(0, 8)
      );
      setByCause(causeList);
      setRecent(Array.isArray(recent) ? recent : []);
      setCampaigns(campaignList);
      setCauses(causeList);
    } catch (err) {
      setError(err.message || 'Failed to load reports data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccess) loadAll();
  }, [canAccess, loadAll]);

  /* ── Derived: filtered campaigns ── */
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const s = search.toLowerCase();
      const matchSearch = !s ||
        c.campaignName?.toLowerCase().includes(s) ||
        c.campaignCode?.toLowerCase().includes(s);
      const matchStatus = !statusFilter || c.status === statusFilter;
      const matchCause = !causeFilter || c.causeId === parseInt(causeFilter);
      return matchSearch && matchStatus && matchCause;
    });
  }, [campaigns, search, statusFilter, causeFilter]);

  /* ── Derived: filtered recent donations (date range) ── */
  const filteredRecent = useMemo(() => {
    return recent.filter((d) => {
      const ts = new Date(d.DonationDate || d.donationDate).getTime();
      const from = fromDate ? new Date(fromDate).getTime() : null;
      const to = toDate ? new Date(toDate).getTime() + 86399999 : null;
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });
  }, [recent, fromDate, toDate]);

  /* ── CSV Export ── */
  const exportCSV = useCallback(() => {
    const rows = [
      ['Donation ID', 'Date', 'Donor', 'Email', 'Cause', 'Campaign', 'Amount (VND)', 'Method', 'Status'],
    ];
    filteredRecent.forEach((d) => {
      rows.push([
        d.DonationId ?? d.donationId ?? '',
        d.DonationDate || d.donationDate || '',
        d.UserName || d.userName || (d.IsAnonymous ? 'Anonymous' : ''),
        d.UserEmail || d.userEmail || '',
        d.CauseName || d.causeName || '',
        d.CampaignName || d.campaignName || '',
        d.Amount ?? d.amount ?? 0,
        d.PaymentMethod || d.paymentMethod || '',
        d.PaymentStatus || d.paymentStatus || '',
      ]);
    });
    const csv = rows.map((r) =>
      r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `giveaid-donations-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredRecent]);

  /* ── Derived: monthly chart data ── */
  const monthlyChartData = useMemo(() => {
    if (!byMonth.length) return null;
    const max = Math.max(...byMonth.map((m) => m.total), 1);
    return byMonth.map((m) => ({
      ...m,
      label: `${MONTH_LABELS[m.month] || m.month}/${m.year}`,
      heightPct: (m.total / max) * 100,
    }));
  }, [byMonth]);

  /* ── Derived: cause breakdown bars ── */
  const causeBars = useMemo(() => {
    if (!byCause.length) return [];
    const max = Math.max(...byCause.map((c) => c.raisedAmount), 1);
    return byCause.map((c) => ({
      ...c,
      barPct: (c.raisedAmount / max) * 100,
      targetPct: c.targetAmount > 0 ? Math.min((c.raisedAmount / c.targetAmount) * 100, 100) : 0,
    }));
  }, [byCause]);

  /* ── Aggregate: total raised across all campaigns, total donors ── */
  const totals = useMemo(() => {
    const totalRaised = campaigns.reduce((acc, c) => acc + (c.raisedAmount || 0), 0);
    const totalGoal = campaigns.reduce((acc, c) => acc + (c.goalAmount || 0), 0);
    const totalDonorsFromCampaigns = campaigns.reduce((acc, c) => acc + (c.donorCount || 0), 0);
    return { totalRaised, totalGoal, totalDonorsFromCampaigns };
  }, [campaigns]);

  if (!canAccess) {
    return (
      <Container className="py-5">
        <Alert variant="danger">You do not have permission to access this page.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <AdminPageFrame
        eyebrow="Fundraising · Reports"
        title="Campaign reports"
        sub="Real-time overview of campaigns, donations and donor activity."
        loading
      >
        <p className="text-muted text-center mt-3">Loading reports…</p>
      </AdminPageFrame>
    );
  }

  return (
    <AdminPageFrame
      eyebrow="Fundraising · Reports"
      title="Campaign reports"
      sub="Real-time overview of campaigns, donations and donor activity."
      error={error}
      actions={
        <button
          type="button"
          className="af-btn af-btn-secondary"
          onClick={() => exportCSV()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 14, height: 14 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Export CSV</span>
        </button>
      }
    >

        {/* ── KPI Cards ── */}
        <Row className="g-3 mb-4">
          <Col xs={6} md={3}>
            <Card className="kpi-card kpi-card-primary">
              <Card.Body>
                <div className="kpi-icon"><i className="bi bi-flag-fill"></i></div>
                <div className="kpi-label">Total Campaigns</div>
                <div className="kpi-value">{campaigns.length}</div>
                <div className="kpi-sub">
                  <Badge bg="success" className="me-1">{overview?.activeCampaigns || 0} Active</Badge>
                  <Badge bg="secondary">{overview?.completedCampaigns || 0} Completed</Badge>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={3}>
            <Card className="kpi-card kpi-card-success">
              <Card.Body>
                <div className="kpi-icon"><i className="bi bi-cash-stack"></i></div>
                <div className="kpi-label">Total Donations</div>
                <div className="kpi-value">{fmtVnd(overview?.totalDonations)}</div>
                <div className="kpi-sub">
                  <small>Last 30 days: {fmtVnd(overview?.recentDonationsAmount)}</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={3}>
            <Card className="kpi-card kpi-card-info">
              <Card.Body>
                <div className="kpi-icon"><i className="bi bi-people-fill"></i></div>
                <div className="kpi-label">Total Donors</div>
                <div className="kpi-value">{overview?.totalDonors || 0}</div>
                <div className="kpi-sub">
                  <small>Active fundraisers: {overview?.activeProgrammes || 0}</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={3}>
            <Card className="kpi-card kpi-card-warning">
              <Card.Body>
                <div className="kpi-icon"><i className="bi bi-graph-up-arrow"></i></div>
                <div className="kpi-label">Avg Campaign Progress</div>
                <div className="kpi-value">
                  {campaigns.length > 0
                    ? (campaigns.reduce((acc, c) => acc + (c.percentageReached || 0), 0) / campaigns.length).toFixed(0)
                    : 0}%
                </div>
                <div className="kpi-sub">
                  <small>Raised: {fmtVnd(totals.totalRaised)}</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ── Filters Bar ── */}
        <Card className="mb-4">
          <Card.Body>
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <Form.Label className="text-light fw-semibold mb-1">Search</Form.Label>
                <InputGroup>
                  <Form.Control type="text" placeholder="Campaign name or code..."
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                  {search && (
                    <InputGroup.Text style={{ cursor: 'pointer' }} onClick={() => setSearch('')}>
                      <i className="bi bi-x-circle"></i>
                    </InputGroup.Text>
                  )}
                </InputGroup>
              </Col>
              <Col md={2}>
                <Form.Label className="text-light fw-semibold mb-1">Status</Form.Label>
                <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  {CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label className="text-light fw-semibold mb-1">Cause</Form.Label>
                <Form.Select value={causeFilter} onChange={(e) => setCauseFilter(e.target.value)}>
                  <option value="">All Causes</option>
                  {causes.map((c) => <option key={c.causeId} value={String(c.causeId)}>{c.causeName}</option>)}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label className="text-light fw-semibold mb-1">From</Form.Label>
                <Form.Control type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </Col>
              <Col md={2}>
                <Form.Label className="text-light fw-semibold mb-1">To</Form.Label>
                <Form.Control type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </Col>
              <Col md={1}>
                <Button variant="outline-secondary" className="w-100" onClick={() => {
                  setSearch(''); setStatusFilter(''); setCauseFilter('');
                  setFromDate(''); setToDate('');
                }}>
                  Clear
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* ── Monthly Donations Chart ── */}
        <Row className="g-3 mb-4">
          <Col lg={7}>
            <Card>
              <Card.Header className="bg-transparent border-bottom" style={{ borderColor: 'var(--border-slate) !important' }}>
                <h5 className="mb-0 text-light">
                  <i className="bi bi-bar-chart-line-fill me-2 text-accent"></i>
                  Monthly Donations (Last 6 months)
                </h5>
              </Card.Header>
              <Card.Body>
                {monthlyChartData?.length ? (
                  <div className="monthly-chart">
                    {monthlyChartData.map((m, i) => (
                      <div key={i} className="monthly-bar-wrap">
                        <div className="monthly-bar-amount">{fmtVnd(m.total)}</div>
                        <div className="monthly-bar-track">
                          <div className="monthly-bar-fill" style={{ height: `${m.heightPct}%` }}>
                            <div className="monthly-bar-count">{m.count}</div>
                          </div>
                        </div>
                        <div className="monthly-bar-label">{m.label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-bar-chart" style={{ fontSize: '2rem' }}></i>
                    <p className="mb-0 mt-2">No donation data in the last 6 months.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
          <Col lg={5}>
            <Card className="h-100">
              <Card.Header className="bg-transparent border-bottom" style={{ borderColor: 'var(--border-slate) !important' }}>
                <h5 className="mb-0 text-light">
                  <i className="bi bi-trophy-fill me-2 text-warning"></i>
                  Top Campaigns
                </h5>
              </Card.Header>
              <Card.Body>
                {byCampaign.length ? (
                  <div className="top-campaign-list">
                    {byCampaign.map((c, i) => (
                      <div key={c.campaignId} className="top-campaign-item">
                        <div className="d-flex align-items-start gap-2">
                          <div className="top-campaign-rank">#{i + 1}</div>
                          <div className="flex-grow-1 min-w-0">
                            <div className="top-campaign-name">{c.campaignName}</div>
                            <div className="top-campaign-cause">
                              <small>{c.causeName}</small>
                            </div>
                            <ProgressBar
                              now={Math.min(c.percentageReached || 0, 100)}
                              variant={c.percentageReached >= 100 ? 'success' : c.percentageReached >= 50 ? 'info' : 'primary'}
                              className="mt-1"
                              style={{ height: 6 }}
                            />
                          </div>
                          <div className="text-end">
                            <div className="fw-bold" style={{ color: 'var(--accent-sky)' }}>{fmtVnd(c.raisedAmount)}</div>
                            <small className="text-muted">{c.donorCount} donors</small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-trophy" style={{ fontSize: '2rem' }}></i>
                    <p className="mb-0 mt-2">No active campaigns yet.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ── Donation Breakdown by Cause ── */}
        <Card className="mb-4">
          <Card.Header className="bg-transparent border-bottom" style={{ borderColor: 'var(--border-slate) !important' }}>
            <h5 className="mb-0 text-light">
              <i className="bi bi-pie-chart-fill me-2 text-accent"></i>
              Donation Breakdown by Cause
            </h5>
          </Card.Header>
          <Card.Body>
            {causeBars.length ? (
              <div className="cause-breakdown">
                {causeBars.map((c) => (
                  <div key={c.causeId} className="cause-bar-item">
                    <div className="d-flex justify-content-between mb-1">
                      <div className="text-light fw-semibold">
                        <span className="cause-code-tag">{c.causeCode || '—'}</span> {c.causeName}
                      </div>
                      <div>
                        <span className="fw-bold" style={{ color: 'var(--accent-sky)' }}>
                          {fmtVnd(c.raisedAmount)}
                        </span>
                        <span className="text-muted small ms-2">/ {fmtVnd(c.targetAmount)}</span>
                        <span className="text-muted small ms-2">({c.donationCount} donations)</span>
                      </div>
                    </div>
                    <div className="cause-bar-track">
                      <div className="cause-bar-fill" style={{ width: `${c.barPct}%` }}></div>
                      <div className="cause-bar-target" style={{ width: `${c.targetPct}%` }}></div>
                    </div>
                    <div className="text-end small text-muted mt-1">
                      {c.targetAmount > 0 ? `${((c.raisedAmount / c.targetAmount) * 100).toFixed(1)}% of target` : 'No target set'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted mb-0 py-3">No cause data available.</p>
            )}
          </Card.Body>
        </Card>

        {/* ── Campaign Statistics Table ── */}
        <Card className="mb-4">
          <Card.Header className="bg-transparent border-bottom" style={{ borderColor: 'var(--border-slate) !important' }}>
            <h5 className="mb-0 text-light">
              <i className="bi bi-table me-2 text-accent"></i>
              Campaign Statistics
              <Badge bg="primary" className="ms-2">{filteredCampaigns.length}</Badge>
            </h5>
          </Card.Header>
          {filteredCampaigns.length === 0 ? (
            <Card.Body className="text-center text-muted py-4">
              <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
              <p className="mb-0 mt-2">No campaigns match the current filters.</p>
            </Card.Body>
          ) : (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Cause</th>
                  <th>Status</th>
                  <th>Raised / Goal</th>
                  <th>Progress</th>
                  <th>Donors</th>
                  <th>Beneficiaries</th>
                  <th>Timeline</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((c) => (
                  <tr key={c.campaignId}>
                    <td>
                      <div className="fw-semibold text-light">{c.campaignName}</div>
                      <small className="text-muted">{c.campaignCode || '—'}</small>
                    </td>
                    <td>
                      <Badge bg="info" style={{ fontSize: '0.7rem' }}>
                        {c.cause?.causeName || '—'}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={CAMPAIGN_STATUS_COLORS[c.status] || 'secondary'}
                        style={{ fontSize: '0.72rem' }}>
                        {c.status || '—'}
                      </Badge>
                    </td>
                    <td>
                      <div className="fw-bold" style={{ color: 'var(--accent-sky)' }}>
                        {fmtVnd(c.raisedAmount)}
                      </div>
                      <small className="text-muted">of {fmtVnd(c.goalAmount)}</small>
                    </td>
                    <td style={{ minWidth: 100 }}>
                      <div className="small mb-1">
                        <span className="fw-bold text-light">{(c.percentageReached || 0).toFixed(0)}%</span>
                      </div>
                      <ProgressBar
                        now={Math.min(c.percentageReached || 0, 100)}
                        variant={c.percentageReached >= 100 ? 'success' : c.percentageReached >= 50 ? 'info' : 'primary'}
                        style={{ height: 5 }}
                      />
                    </td>
                    <td className="text-center">
                      <Badge bg="secondary" pill>{c.donorCount || 0}</Badge>
                    </td>
                    <td className="text-center">
                      <small>{c.beneficiariesCount?.toLocaleString() || '—'}</small>
                    </td>
                    <td>
                      <small className="text-muted d-block">{fmtDate(c.startDate)}</small>
                      <small className="text-muted d-block">→ {c.endDate ? fmtDate(c.endDate) : 'Open'}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {/* ── Recent Donations ── */}
        <Card className="mb-4">
          <Card.Header className="bg-transparent border-bottom" style={{ borderColor: 'var(--border-slate) !important' }}>
            <h5 className="mb-0 text-light">
              <i className="bi bi-clock-history me-2 text-accent"></i>
              Recent Donations
              {filteredRecent.length < recent.length && (
                <small className="text-muted ms-2">
                  ({filteredRecent.length} of {recent.length})
                </small>
              )}
            </h5>
          </Card.Header>
          {filteredRecent.length === 0 ? (
            <Card.Body className="text-center text-muted py-4">
              <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
              <p className="mb-0 mt-2">No donations in the selected date range.</p>
            </Card.Body>
          ) : (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Cause</th>
                  <th>Campaign</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecent.map((d) => (
                  <tr key={d.DonationId || d.donationId}>
                    <td>
                      <span className="text-light">{d.userName || 'Anonymous'}</span>
                      {d.IsAnonymous && <Badge bg="secondary" className="ms-1" style={{ fontSize: '0.6rem' }}>Anon</Badge>}
                    </td>
                    <td><small className="text-muted">{d.causeName || '—'}</small></td>
                    <td><small className="text-muted">{d.campaignName || '—'}</small></td>
                    <td>
                      <span className="fw-bold" style={{ color: 'var(--accent-sky)' }}>
                        {fmtVnd(d.Amount || d.amount)}
                      </span>
                    </td>
                    <td><small className="text-muted">{fmtDateTime(d.DonationDate || d.donationDate)}</small></td>
                    <td><small><code>{d.TransactionId || d.transactionId || '—'}</code></small></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {/* ── Aggregate Footer ── */}
        <Row className="g-3">
          <Col md={4}>
            <Card>
              <Card.Body className="text-center">
                <div className="kpi-footer-label">Total Raised (all campaigns)</div>
                <div className="kpi-footer-value">{fmtVnd(totals.totalRaised)}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card>
              <Card.Body className="text-center">
                <div className="kpi-footer-label">Total Goal (all campaigns)</div>
                <div className="kpi-footer-value">{fmtVnd(totals.totalGoal)}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card>
              <Card.Body className="text-center">
                <div className="kpi-footer-label">Overall Achievement</div>
                <div className="kpi-footer-value">
                  {totals.totalGoal > 0
                    ? `${((totals.totalRaised / totals.totalGoal) * 100).toFixed(1)}%`
                    : '—'}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <p className="text-center text-muted small mt-4 mb-0">
          <i className="bi bi-database-check me-1"></i>
          Data sourced live from <code>/api/admin/stats</code>, <code>/api/admin/recent-donations</code>, <code>/api/campaigns</code>, <code>/api/causes</code>.
        </p>

      <style>{`
        .kpi-card {
          background: var(--bg-card);
          border: 1px solid var(--border-slate);
          border-radius: var(--radius-lg);
          position: relative;
          overflow: hidden;
          transition: all var(--transition-fast);
        }
        .kpi-card:hover { transform: translateY(-2px); }
        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 4px; height: 100%;
        }
        .kpi-card-primary::before { background: var(--accent-sky); }
        .kpi-card-success::before { background: #10B981; }
        .kpi-card-info::before    { background: #6366F1; }
        .kpi-card-warning::before { background: #F59E0B; }
        .kpi-icon {
          position: absolute;
          top: 1rem; right: 1rem;
          font-size: 2rem;
          opacity: 0.18;
        }
        .kpi-card-primary .kpi-icon { color: var(--accent-sky); }
        .kpi-card-success .kpi-icon { color: #10B981; }
        .kpi-card-info .kpi-icon    { color: #6366F1; }
        .kpi-card-warning .kpi-icon { color: #F59E0B; }
        .kpi-label {
          font-size: 0.78rem;
          color: var(--text-gray);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .kpi-value {
          font-size: 1.85rem;
          font-weight: 800;
          color: var(--text-light);
          line-height: 1.1;
        }
        .kpi-sub { margin-top: 0.5rem; }

        /* Monthly Chart */
        .monthly-chart {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          height: 220px;
          padding-top: 1rem;
        }
        .monthly-bar-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
          min-width: 0;
        }
        .monthly-bar-amount {
          font-size: 0.7rem;
          color: var(--text-gray);
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .monthly-bar-track {
          width: 100%;
          height: calc(100% - 50px);
          display: flex;
          align-items: flex-end;
          background: var(--primary-slate);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .monthly-bar-fill {
          width: 100%;
          background: linear-gradient(180deg, var(--accent-sky), rgba(56,189,248,0.5));
          border-radius: var(--radius-sm) var(--radius-sm) 0 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 4px;
          transition: height var(--transition-medium);
        }
        .monthly-bar-count {
          font-size: 0.7rem;
          color: var(--primary-navy);
          font-weight: 800;
        }
        .monthly-bar-label {
          font-size: 0.75rem;
          color: var(--text-light);
          font-weight: 600;
          margin-top: 0.4rem;
        }

        /* Top Campaigns List */
        .top-campaign-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .top-campaign-item {
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-slate);
        }
        .top-campaign-item:last-child { border-bottom: none; }
        .top-campaign-rank {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: rgba(56,189,248,0.15);
          color: var(--accent-sky);
          font-weight: 800;
          font-size: 0.8rem;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .top-campaign-name {
          color: var(--text-light);
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .top-campaign-cause { color: var(--text-gray); }
        .min-w-0 { min-width: 0; }

        /* Cause Breakdown */
        .cause-breakdown {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .cause-bar-track {
          position: relative;
          height: 10px;
          background: var(--primary-slate);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .cause-bar-fill {
          position: absolute;
          top: 0; left: 0;
          height: 100%;
          background: linear-gradient(90deg, var(--accent-sky), #6366F1);
          border-radius: var(--radius-sm);
        }
        .cause-bar-target {
          position: absolute;
          top: -3px; right: 0;
          height: 16px; width: 2px;
          background: var(--accent-sky);
          box-shadow: 0 0 0 2px rgba(56,189,248,0.2);
        }
        .cause-code-tag {
          display: inline-block;
          background: var(--primary-slate);
          color: var(--accent-sky);
          padding: 1px 6px;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 700;
          margin-right: 0.4rem;
        }

        /* Tables */
        .kpi-footer-label {
          font-size: 0.78rem;
          color: var(--text-gray);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }
        .kpi-footer-value {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--accent-sky);
          margin-top: 0.3rem;
        }
      `}</style>
    </AdminPageFrame>
  );
}
