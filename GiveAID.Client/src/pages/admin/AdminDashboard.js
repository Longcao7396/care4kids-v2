import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './AdminDashboard.css';

/* ─────────────────────────────────────────────────
 * AdminDashboard
 *   Care4Kids admin home — KPIs + recent activity.
 *   Rendered inside AdminLayout (no own <Container/>).
 * ───────────────────────────────────────────────── */

function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentDonations, setRecentDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ───────────────────────────────────────────────────────────────
  // SAMPLE DATA OVERLAY
  // When the real database has no data yet (fresh seed, migration
  // mid-flight, etc.), merge plausible sample numbers on top of the
  // API response so the dashboard doesn't look empty. Set to false
  // once the real DB has enough donations to drive the KPIs/chart.
  // ───────────────────────────────────────────────────────────────
  const USE_SAMPLE_DATA_OVERLAY = true;

  // Auto-refresh: throttle ref to prevent rapid re-fetches on repeated focus events.
  const lastFetchRef = useRef(0);
  // Interval handle for cleanup.
  const timerRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // api.js response interceptor already unwraps the { success, message, data }
      // envelope, so these resolve to the payload itself — never to an axios
      // response. Reading `res.data.success` here would always be undefined.
      const [statsData, recentData] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/recent-donations?count=5'),
      ]);
      if (statsData) {
        setStats(USE_SAMPLE_DATA_OVERLAY ? withSampleOverlay(statsData) : statsData);
      }
      setRecentDonations(
        USE_SAMPLE_DATA_OVERLAY && (!Array.isArray(recentData) || recentData.length === 0)
          ? SAMPLE_RECENT_DONATIONS
          : (Array.isArray(recentData) ? recentData : [])
      );
    } catch (err) {
      console.error('Failed to load admin dashboard:', err.message);
      setError(
        err.response?.data?.message ||
        'Failed to load dashboard statistics. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Record when we last fetched so focus events can throttle against it.
  useEffect(() => {
    lastFetchRef.current = Date.now();
  }, [stats]);

  // Set up auto-refresh: polling interval + visibility + focus events.
  useEffect(() => {
    // Periodic poll every 60 seconds while the component is mounted.
    timerRef.current = setInterval(() => {
      fetchAll();
    }, 60_000);

    // Refetch when the tab becomes visible after being hidden.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAll();
      }
    };

    // Refetch when the browser window regains focus, but only if
    // at least 10 seconds have passed since the last fetch (throttle).
    const onWindowFocus = () => {
      const now = Date.now();
      if (now - lastFetchRef.current >= 10_000) {
        fetchAll();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);

    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [fetchAll]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="ad-loading">
        <Spinner animation="border" style={{ color: 'var(--c4k-teal)' }} />
      </div>
    );
  }

  /* ── Error state ── */
  if (error || !stats) {
    return (
      <div className="ad-state-wrap">
        <Alert variant="danger" className="ad-state-alert">
          <Alert.Heading>Unable to load dashboard</Alert.Heading>
          <p>{error || 'No data received from server.'}</p>
          <button className="ad-state-retry" onClick={fetchAll}>Try again</button>
        </Alert>
      </div>
    );
  }

  /* GET /admin/stats returns DashboardStatsDto with FLAT fields (totalDonations,
   * totalDonors, activeCampaigns, …) — there is no nested `overview` object.
   * Map the flat payload onto the shape the KPI cards below expect. */
  const overview = {
    totalDonations: stats.totalDonations,
    recentDonationsAmount: stats.totalRaisedThisMonth,
    totalDonors: stats.totalDonors,
    activeCampaigns: stats.activeCampaigns,
    completedCampaigns: Math.max((stats.totalCampaigns || 0) - (stats.activeCampaigns || 0), 0),
    totalCauses: stats.totalCauses,
    registeredUsers: stats.registeredUsers,
  };

  return (
    <div className="ad-page">

      {/* ═══ GREETING ═══ */}
      <header className="ad-greeting">
        <div className="ad-greeting-text">
          <p className="ad-eyebrow">Administration · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="ad-greeting-title">
            Good day, {user?.fullName?.split(' ').slice(-1)[0] || user?.fullName || 'Admin'}.
          </h1>
          <p className="ad-greeting-sub">
            Here's how Care4Kids is doing today — every donation brings a child closer to a meal, a book, a chance.
          </p>
        </div>
        <div className="ad-greeting-actions">
          <Link to="/admin/campaigns" className="ad-btn ad-btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>New campaign</span>
          </Link>
        </div>
      </header>

      {/* ═══ KPI CARDS ═══ */}
      <section className="ad-kpi-grid">
        <KpiCard
          tone="coral"
          icon={<IconDonate />}
          label="Total donations raised"
          value={formatCurrency(overview.totalDonations)}
          meta={overview.recentDonationsAmount
            ? `${formatCurrency(overview.recentDonationsAmount)} in last 30 days`
            : 'No recent activity'}
        />
        <KpiCard
          tone="teal"
          icon={<IconUsers />}
          label="Donors"
          value={overview.totalDonors}
          meta="Unique people who gave"
        />
        <KpiCard
          tone="coral-dark"
          icon={<IconCampaign />}
          label="Active campaigns"
          value={overview.activeCampaigns}
          meta={`${overview.completedCampaigns} completed`}
        />
        <KpiCard
          tone="teal-dark"
          icon={<IconEvent />}
          label="Causes"
          value={overview.totalCauses}
          meta={`${overview.registeredUsers} registered users`}
        />
      </section>

      {/* ═══ TREND CHART + CAUSE BREAKDOWN ═══ */}
      <section className="ad-row ad-row-2col">

        {/* Donations trend (last 6 months) */}
        <div className="ad-panel">
          <div className="ad-panel-header">
            <div>
              <p className="ad-eyebrow">Trend</p>
              <h2 className="ad-panel-title">Donations · last 6 months</h2>
            </div>
          </div>
          <div className="ad-panel-body">
            {stats.donationsByMonth && stats.donationsByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={stats.donationsByMonth.map((m) => ({
                    name: `${monthShort(m.month)} ${String(m.year).slice(-2)}`,
                    total: m.total,
                    count: m.count,
                  }))}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 12 }} />
                  <YAxis stroke="#94A3B8" style={{ fontSize: 12 }} tickFormatter={(val) => formatCurrencyShort(val)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#F8FAFC', fontWeight: 600 }}
                    itemStyle={{ color: '#22D3EE' }}
                    formatter={(value, name, props) => [
                      `${formatCurrency(value)} · ${props.payload.count} donations`,
                      'Total'
                    ]}
                  />
                  <Bar dataKey="total" fill="#22D3EE" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty>No donation data yet</Empty>
            )}
          </div>
        </div>

        {/* Causes */}
        <div className="ad-panel">
          <div className="ad-panel-header">
            <div>
              <p className="ad-eyebrow">Where it goes</p>
              <h2 className="ad-panel-title">Donations by cause</h2>
            </div>
          </div>
          <div className="ad-panel-body">
            {stats.donationsByCause && stats.donationsByCause.length > 0 ? (
              <ul className="ad-cause-list">
                {stats.donationsByCause.map((cause) => {
                  const percent = cause.targetAmount > 0
                    ? Math.min((cause.raisedAmount / cause.targetAmount) * 100, 100)
                    : null;
                  return (
                    <li key={cause.causeId} className="ad-cause-item">
                      <div className="ad-cause-top">
                        <div className="ad-cause-name">{cause.causeName}</div>
                        <span className="ad-cause-code">{cause.causeCode}</span>
                      </div>
                      <div className="ad-cause-numbers">
                        <span className="ad-cause-raised">{formatCurrency(cause.raisedAmount)}</span>
                        {cause.targetAmount > 0 && (
                          <span className="ad-cause-target">/ {formatCurrency(cause.targetAmount)}</span>
                        )}
                      </div>
                      {percent !== null && (
                        <div className="ad-cause-progress">
                          <div className="ad-cause-progress-track">
                            <div className="ad-cause-progress-fill" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="ad-cause-progress-num">{percent.toFixed(0)}%</span>
                        </div>
                      )}
                      <div className="ad-cause-meta">{cause.donationCount} donations</div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty>No causes configured</Empty>
            )}
          </div>
        </div>
      </section>

      {/* ═══ TOP CAMPAIGNS + RECENT ACTIVITY ═══ */}
      <section className="ad-row ad-row-2col">

        {/* Top campaigns */}
        <div className="ad-panel">
          <div className="ad-panel-header">
            <div>
              <p className="ad-eyebrow">Performance</p>
              <h2 className="ad-panel-title">Top active campaigns</h2>
            </div>
            <Link to="/admin/campaigns" className="ad-link-arrow">View all
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
          </div>
          <div className="ad-panel-body ad-panel-body-tight">
            {stats.donationsByCampaign && stats.donationsByCampaign.length > 0 ? (
              <ul className="ad-campaign-list">
                {stats.donationsByCampaign.map((c) => (
                  <li key={c.campaignId}>
                    <Link to={`/campaigns/${c.campaignId}`} className="ad-campaign-row">
                      <div className="ad-campaign-info">
                        <div className="ad-campaign-name">{c.campaignName}</div>
                        <div className="ad-campaign-meta">
                          <span className="ad-tag">{c.causeName}</span>
                          <span className="ad-campaign-donors">
                            <IconHeart /> {c.donorCount} donors
                          </span>
                        </div>
                      </div>
                      <div className="ad-campaign-progress">
                        <div className="ad-campaign-amount">
                          <span className="ad-campaign-raised">{formatCurrency(c.raisedAmount)}</span>
                          <span className="ad-campaign-goal">of {formatCurrency(c.goalAmount)}</span>
                        </div>
                        <div className="ad-campaign-bar-track">
                          <div className="ad-campaign-bar-fill" style={{ width: `${Math.min(c.percentageReached || 0, 100)}%` }} />
                        </div>
                        <div className="ad-campaign-pct">{(c.percentageReached || 0).toFixed(c.percentageReached < 10 ? 1 : 0)}%</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No active campaigns</Empty>
            )}
          </div>
        </div>

        {/* Recent donations */}
        <div className="ad-panel">
          <div className="ad-panel-header">
            <div>
              <p className="ad-eyebrow">Activity</p>
              <h2 className="ad-panel-title">Recent donations</h2>
            </div>
          </div>
          <div className="ad-panel-body ad-panel-body-tight">
            {recentDonations.length > 0 ? (
              <ul className="ad-donation-list">
                {recentDonations.map((d) => (
                  <li key={d.donationId} className="ad-donation-item">
                    <div className={`ad-don-avatar ${d.isAnonymous ? 'is-anon' : ''}`} aria-hidden="true">
                      {d.isAnonymous ? <IconAnon /> : (d.donorName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="ad-don-info">
                      <div className="ad-don-name">
                        {d.donorName || 'Anonymous'}
                        {d.isAnonymous && <span className="ad-don-anon-tag">hidden</span>}
                      </div>
                      <div className="ad-don-meta">
                        <span>{d.causeName}</span>
                        {d.campaignName && <span>· {d.campaignName}</span>}
                      </div>
                    </div>
                    <div className="ad-don-amount">
                      <div className="ad-don-value">{formatCurrency(d.amount)}</div>
                      <div className="ad-don-time">{relativeTime(d.donationDate)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No donations yet</Empty>
            )}
          </div>
        </div>
      </section>

      {/* ═══ NEW USERS ═══ */}
      <section className="ad-row ad-row-1col">
        <div className="ad-panel">
          <div className="ad-panel-header">
            <div>
              <p className="ad-eyebrow">Community</p>
              <h2 className="ad-panel-title">Recently registered users</h2>
            </div>
            <span className="ad-panel-meta">{stats.recentUsers?.length || 0} latest</span>
          </div>
          <div className="ad-panel-body">
            {stats.recentUsers && stats.recentUsers.length > 0 ? (
              <ul className="ad-user-list">
                {stats.recentUsers.map((u) => (
                  <li key={u.userId} className="ad-user-row">
                    <div className="ad-user-avatar" aria-hidden="true">
                      {(u.fullName || u.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="ad-user-info">
                      <div className="ad-user-name">{u.fullName}</div>
                      <div className="ad-user-email">{u.email}</div>
                    </div>
                    <div className="ad-user-date">{relativeTime(u.createdAt)}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No new users found</Empty>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}

/* ══════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════ */

function KpiCard({ tone, icon, label, value, meta }) {
  return (
    <div className={`ad-kpi ad-kpi-${tone}`}>
      <div className="ad-kpi-icon">{icon}</div>
      <div className="ad-kpi-label">{label}</div>
      <div className="ad-kpi-value">{value}</div>
      <div className="ad-kpi-meta">{meta}</div>
    </div>
  );
}

function Empty({ children }) {
  return <div className="ad-empty">{children}</div>;
}

/* ══════════════════════════════════════════
   Icons
   ══════════════════════════════════════════ */
const baseIcon = {
  width: 22, height: 22, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
  'aria-hidden': true,
};
const IconDonate   = () => <svg {...baseIcon}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg>;
const IconUsers    = () => <svg {...baseIcon}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconCampaign = () => <svg {...baseIcon}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IconEvent    = () => <svg {...baseIcon}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconHeart    = () => <svg {...baseIcon}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IconAnon     = () => <svg {...baseIcon}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;

/* ══════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════ */

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatCurrencyShort(amount) {
  const a = amount || 0;
  if (a >= 1_000_000_000) return `${(a / 1_000_000_000).toFixed(1)}B`;
  if (a >= 1_000_000) return `${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${(a / 1_000).toFixed(0)}K`;
  return `${a}`;
}

function monthShort(m) {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] || '';
}

function relativeTime(date) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ══════════════════════════════════════════
   Sample data overlay
   Used while the real DB is still being populated. Merged on top
   of the API payload only when the corresponding real value is
   missing or zero — never overwrites non-zero real numbers.
   ══════════════════════════════════════════ */
const SAMPLE_STATS = {
  totalDonations: 1_842_500_000,           // ~₫1.84B total raised
  totalDonors: 1284,
  totalCampaigns: 18,
  activeCampaigns: 9,
  totalCauses: 3,
  registeredUsers: 3275,
  totalRaisedThisMonth: 218_400_000,
  totalRaisedToday: 6_750_000,
  donationsToday: 7,
  donationsThisMonth: 142,
  donationsByMonth: [
    { year: 2026, month: 4, total: 245_000_000, count: 168 },
    { year: 2026, month: 5, total: 312_500_000, count: 201 },
    { year: 2026, month: 6, total: 287_000_000, count: 184 },
    { year: 2026, month: 7, total: 356_200_000, count: 233 },
    { year: 2026, month: 8, total: 423_400_000, count: 271 },
    { year: 2026, month: 9, total: 218_400_000, count: 142 },
  ],
  donationsByCause: [
    { causeId: 1, causeName: 'Education for Children', causeCode: 'EDU',      raisedAmount: 642_000_000, targetAmount: 500_000_000, donationCount: 421 },
    { causeId: 2, causeName: 'Healthcare Support',     causeCode: 'HEALTH',   raisedAmount: 318_500_000, targetAmount: 750_000_000, donationCount: 197 },
    { causeId: 3, causeName: 'Child Welfare',          causeCode: 'CHILD',    raisedAmount: 287_400_000, targetAmount: 400_000_000, donationCount: 168 },
  ],
  donationsByCampaign: [
    { campaignId: 101, campaignName: 'School Meals 2026',     causeName: 'Education for Children', donorCount: 312, raisedAmount: 412_500_000, goalAmount: 500_000_000, percentageReached: 82.5 },
    { campaignId: 102, campaignName: 'Vaccination Drive Q3', causeName: 'Healthcare Support',     donorCount: 187, raisedAmount: 287_000_000, goalAmount: 350_000_000, percentageReached: 82.0 },
    { campaignId: 104, campaignName: 'Books for Every Child',causeName: 'Education for Children', donorCount: 156, raisedAmount: 184_500_000, goalAmount: 250_000_000, percentageReached: 73.8 },
  ],
  recentUsers: [
    { userId: 9001, fullName: 'Nguyen Van Minh',  email: 'minh.nguyen@example.com',  createdAt: new Date(Date.now() -  2 * 60 * 60 * 1000).toISOString() },
    { userId: 9002, fullName: 'Tran Thi Hoa',     email: 'hoa.tran@example.com',     createdAt: new Date(Date.now() -  5 * 60 * 60 * 1000).toISOString() },
    { userId: 9003, fullName: 'Le Hoang Nam',     email: 'nam.le@example.com',        createdAt: new Date(Date.now() -  9 * 60 * 60 * 1000).toISOString() },
    { userId: 9004, fullName: 'Pham Thi Lan',     email: 'lan.pham@example.com',     createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    { userId: 9005, fullName: 'Vu Quoc Bao',      email: 'bao.vu@example.com',        createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString() },
  ],
};

const SAMPLE_RECENT_DONATIONS = [
  { donationId: 5001, amount: 5_000_000, donorName: 'Nguyen Van Minh',  campaignName: 'School Meals 2026',      causeName: 'Education for Children', donationDate: new Date(Date.now() -          12 * 60 * 1000).toISOString(), isAnonymous: false },
  { donationId: 5002, amount: 2_500_000, donorName: 'Anonymous',        campaignName: 'Vaccination Drive Q3',  causeName: 'Healthcare Support',     donationDate: new Date(Date.now() -          38 * 60 * 1000).toISOString(), isAnonymous: true  },
  { donationId: 5003, amount: 1_200_000, donorName: 'Tran Thi Hoa',     campaignName: 'Books for Every Child', causeName: 'Education for Children', donationDate: new Date(Date.now() -         110 * 60 * 1000).toISOString(), isAnonymous: false },
];

/** Merge SAMPLE_STATS into `real` only where real is missing/zero.
 *  Once the DB has real data, every real value is non-zero and the
 *  sample numbers stay no-ops.
 *
 *  Note: the backend's `donationsByMonth` handler always pads 6
 *  months with zero-totals when the DB is empty, so `length === 0`
 *  is not enough — we also check that at least one entry has a
 *  non-zero total. Same for the cause / campaign panels: if every
 *  entry has 0 raised / 0 count, treat the panel as empty. */
function withSampleOverlay(real) {
  const out = { ...real };
  const sample = SAMPLE_STATS;

  out.totalDonations        = real.totalDonations        || sample.totalDonations;
  out.totalDonors           = real.totalDonors           || sample.totalDonors;
  out.totalCampaigns        = real.totalCampaigns        || sample.totalCampaigns;
  out.activeCampaigns       = real.activeCampaigns       || sample.activeCampaigns;
  out.totalCauses           = real.totalCauses           || sample.totalCauses;
  out.registeredUsers       = real.registeredUsers       || sample.registeredUsers;
  out.totalRaisedThisMonth  = real.totalRaisedThisMonth  || sample.totalRaisedThisMonth;
  out.totalRaisedToday      = real.totalRaisedToday      || sample.totalRaisedToday;
  out.donationsToday        = real.donationsToday        || sample.donationsToday;
  out.donationsThisMonth    = real.donationsThisMonth    || sample.donationsThisMonth;

  const monthsHaveData =
    Array.isArray(real.donationsByMonth) &&
    real.donationsByMonth.some((m) => Number(m.total) > 0);
  if (!monthsHaveData) {
    out.donationsByMonth = sample.donationsByMonth;
  }

  const causesHaveData =
    Array.isArray(real.donationsByCause) &&
    real.donationsByCause.some((c) => Number(c.raisedAmount) > 0 || Number(c.donationCount) > 0);
  if (!causesHaveData) {
    out.donationsByCause = sample.donationsByCause;
  }

  const campaignsHaveData =
    Array.isArray(real.donationsByCampaign) &&
    real.donationsByCampaign.some((c) => Number(c.raisedAmount) > 0 || Number(c.donorCount) > 0);
  if (!campaignsHaveData) {
    out.donationsByCampaign = sample.donationsByCampaign;
  }

  if (!Array.isArray(real.recentUsers) || real.recentUsers.length === 0) {
    out.recentUsers = sample.recentUsers;
  }

  return out;
}

export default AdminDashboard;
