import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Form, Button, InputGroup } from 'react-bootstrap';
import api from '../services/api';
import './CampaignsPage.css';

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [causes, setCauses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCause, setSelectedCause] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  // Page size 12 = 4 rows x 3 cols on desktop grid. Matches backend default.
  const pageSize = 12;
  // Featured campaign for the hero pull-out is fetched separately (via
  // /campaigns/featured) so it does not steal an item from the grid below.
  // Without this, filtering the featured campaign out of the paged list would
  // leave 11 cards on a 12-slot grid and the last row would have only 2.
  const [featuredCampaign, setFeaturedCampaign] = useState(null);

  const fetchCauses = useCallback(async () => {
    try {
      // api.js unwraps the envelope; response is the plain array of CauseDto
      const response = await api.get('/causes');
      if (Array.isArray(response)) {
        setCauses(response);
      } else {
        setCauses([]);
      }
    } catch (err) {
      console.error('Error fetching causes:', err.message, err._raw);
      // If causes fail to load, just set empty array — the filter dropdown
      // will show "All Categories" only, which is acceptable degradation.
      setCauses([]);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, pageSize };
      if (selectedStatus && selectedStatus !== 'All') params.status = selectedStatus;
      if (selectedCause) params.causeId = selectedCause;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      // api.js unwraps the { success, message, data } envelope.
      // Response is the paginated payload: { items, totalCount, page, pageSize }
      const response = await api.get('/campaigns', { params });

      if (response && Array.isArray(response.items)) {
        setCampaigns(response.items);
        setTotalCount(response.totalCount || 0);
      } else {
        // Response structure unexpected; treat as empty
        setCampaigns([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err.message, err._raw);
      // On error, show a visible error state with a Retry button.
      // Do NOT silently fall back to SAMPLE_CAMPAIGNS.
      setError(err.message || 'Unable to load campaigns. Please try again.');
      setCampaigns([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [selectedCause, selectedStatus, searchTerm, page, pageSize]);

  // Reset to page 1 whenever filters/search change (not on page change itself).
  useEffect(() => {
    setPage(1);
  }, [selectedCause, selectedStatus, searchTerm]);

  useEffect(() => {
    fetchCauses();
  }, [fetchCauses]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Featured campaign for the hero pull-out is fetched separately from the
  // grid so it does not steal a slot from the paged list below. We only
  // refetch when filters change (not when the user clicks Next/Prev).
  const fetchFeatured = useCallback(async () => {
    try {
      const res = await api.get('/campaigns/featured', { params: { count: 1 } });
      const first = Array.isArray(res) ? res[0] : (res?.items?.[0] ?? null);
      setFeaturedCampaign(first || null);
    } catch (err) {
      console.warn('Using no featured campaign:', err.message);
      setFeaturedCampaign(null);
    }
  }, []);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured, selectedCause, selectedStatus, searchTerm]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
  };


  const resetFilters = () => {
    setSelectedCause('');
    setSelectedStatus('All');
    setSearchTerm('');
    setSearchInput('');
  };

  // The grid now renders ALL paged items. The featured campaign is shown
  // above the grid (if /campaigns/featured returned one), and lives in its
  // own state — it never comes out of the page slice. This guarantees a
  // full 12-card page on every page that has 12 items to show.

  // Impact stats
  const totalDonors = campaigns.reduce((sum, c) => sum + (c.donorCount || 0), 0);
  const totalRaised = campaigns.reduce((sum, c) => sum + (c.raisedAmount || 0), 0);
  const totalBeneficiaries = campaigns.reduce((sum, c) => sum + (c.beneficiariesCount || 0), 0);

  if (loading && campaigns.length === 0) {
    return (
      <div className="campaigns-page">
        <div className="cp-loading">
          <div className="cp-spinner" />
          <p>Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="campaigns-page">

      {/* ============================================================
          1. HERO SECTION
      ============================================================ */}
      <section className="cp-hero">
        <div className="cp-hero-bg">
          <img
            src="https://res.cloudinary.com/mczqcagv/image/upload/v1790337352/giveaid/replacement/7-1631871699_c2w5qf.webp"
            alt="Children smiling"
            className="cp-hero-image"
          />
          <div className="cp-hero-overlay" />
        </div>
        <Container className="cp-hero-content">
          <div className="cp-hero-text">
            <p className="cp-hero-eyebrow">Care4Kids Campaigns</p>
            <h1 className="cp-hero-title">
              Help Give Every Child<br />a Brighter Future
            </h1>
            <p className="cp-hero-subtitle">
              Every campaign directly supports children in need — from nutritious meals and school supplies to healthcare and education. Your donation creates real, measurable change.
            </p>
            <div className="cp-hero-actions">
              <Link to="/donate" className="c4k-btn-primary-solid">
                <svg className="c4k-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>Donate Now</span>
              </Link>
              <a href="#campaigns" className="c4k-btn-ghost-outline">
                <span>Explore Campaigns</span>
                <svg className="c4k-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </a>
            </div>
      </div>
        </Container>
      </section>

      {/* ============================================================
          2. IMPACT SUMMARY
      ============================================================ */}
      <section className="cp-impact">
        <Container>
          <Row className="cp-impact-grid">
            <Col xs={6} md={3} className="cp-impact-item">
              <div className="cp-impact-number">{totalDonors.toLocaleString()}+</div>
              <div className="cp-impact-label">Donors</div>
            </Col>
            <Col xs={6} md={3} className="cp-impact-item">
              <div className="cp-impact-number">{totalBeneficiaries.toLocaleString()}+</div>
              <div className="cp-impact-label">Children Supported</div>
            </Col>
            <Col xs={6} md={3} className="cp-impact-item">
              <div className="cp-impact-number">{formatCurrency(totalRaised)}</div>
              <div className="cp-impact-label">Total Raised</div>
            </Col>
            <Col xs={6} md={3} className="cp-impact-item">
              <div className="cp-impact-number">{campaigns.filter(c => c.status === 'Active').length}</div>
              <div className="cp-impact-label">Active Campaigns</div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ============================================================
          3. FILTER BAR
      ============================================================ */}
      <section className="cp-filters-section" id="campaigns">
        <Container>
          <div className="cp-filter-bar">
            {/* Search */}
            <form className="cp-search-form" onSubmit={handleSearch}>
              <InputGroup className="cp-search-group">
                <Form.Control
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="cp-search-input"
                />
                <Button variant="link" type="submit" className="cp-search-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </Button>
              </InputGroup>
            </form>

            {/* Category */}
            <div className="cp-filter-select-wrap">
                <Form.Select
                className="cp-filter-select"
                  value={selectedCause}
                  onChange={(e) => setSelectedCause(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {causes.map(cause => (
                    <option key={cause.causeId} value={cause.causeId}>
                      {cause.causeName}
                    </option>
                  ))}
                </Form.Select>
            </div>

            {/* Status */}
            <div className="cp-filter-select-wrap">
                <Form.Select
                className="cp-filter-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                <option value="Paused">Paused</option>
                </Form.Select>
            </div>

            {/* Reset */}
            {(selectedCause || selectedStatus !== 'All' || searchTerm) && (
              <Button className="cp-reset-btn" onClick={resetFilters}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Reset
              </Button>
            )}
          </div>

          {/* Results count */}
          <div className="cp-results-info">
            <span>
              Showing <strong>{campaigns.length}</strong> campaign{campaigns.length !== 1 ? 's' : ''}
              {searchTerm && ` matching "${searchTerm}"`}
            </span>
        </div>
        </Container>
      </section>

      {/* ============================================================
          4. FEATURED CAMPAIGN
      ============================================================ */}
      {featuredCampaign && (
        <section className="cp-featured">
          <Container>
            <p className="cp-section-eyebrow">Featured Campaign</p>
            <h2 className="cp-section-title">This Month's Focus</h2>
            <div className="cp-featured-card">
              <Row className="g-0">
                <Col lg={6}>
                  <div className="cp-featured-image">
                    <img
                      src={featuredCampaign.imageUrl || 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337418/giveaid/replacement/thieunhi9-2869-1401513005_chlpkd.webp'}
                      alt={featuredCampaign.campaignName}
                      onError={(e) => {
                        e.target.src = 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337418/giveaid/replacement/thieunhi9-2869-1401513005_chlpkd.webp';
                      }}
                    />
                    <div className="cp-featured-badge-overlay">
                      <Badge className="cp-cause-badge">
                        {featuredCampaign.causeName || 'Child Welfare'}
                      </Badge>
                  </div>
                  </div>
                </Col>
                <Col lg={6}>
                  <div className="cp-featured-content">
                    <div className="cp-featured-meta">
                      <span className="cp-meta-location">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {featuredCampaign.location || 'Vietnam'}
                      </span>
                      {featuredCampaign.beneficiariesCount && (
                        <span className="cp-meta-beneficiaries">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          {featuredCampaign.beneficiariesCount}+ children
                      </span>
                      )}
                    </div>
                    <h3 className="cp-featured-title">{featuredCampaign.campaignName}</h3>
                    <p className="cp-featured-desc">
                      {featuredCampaign.description?.substring(0, 280)}
                      {featuredCampaign.description?.length > 280 ? '...' : ''}
                    </p>

                    <div className="cp-featured-progress">
                      <div className="cp-progress-header">
                        <span className="cp-raised">
                          {formatCurrency(featuredCampaign.raisedAmount || 0)}
                        </span>
                        <span className="cp-goal">
                          of {formatCurrency(featuredCampaign.goalAmount)}
                        </span>
                      </div>
                      <div className="cp-progress-track">
                        <div
                          className="cp-progress-fill"
                          style={{
                            width: `${Math.min(featuredCampaign.percentageReached || 0, 100)}%`
                          }}
                        />
                      </div>
                      <div className="cp-progress-footer">
                        <span className="cp-percent">
                          {Math.round(featuredCampaign.percentageReached || 0)}% funded
                        </span>
                        {featuredCampaign.daysRemaining != null && featuredCampaign.daysRemaining >= 0 && (
                          <span className="cp-days">
                            {featuredCampaign.daysRemaining} days remaining
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="cp-featured-actions">
                      <Link
                        to={`/donate?campaignId=${featuredCampaign.campaignId}`}
                        className="c4k-btn-primary-solid"
                      >
                        <svg className="c4k-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span>Donate Now</span>
                      </Link>
                      <Link
                        to={`/campaigns/${featuredCampaign.campaignId}`}
                        className="c4k-btn-ghost-outline-dark"
                      >
                        <span>View Details</span>
                        <svg className="c4k-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"/>
                          <polyline points="12 5 19 12 12 19"/>
                        </svg>
                      </Link>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Container>
        </section>
      )}

      {/* ============================================================
          5. CAMPAIGN GRID
      ============================================================ */}
      <section className="cp-grid-section">
        <Container>
          <div className="cp-grid-header">
            <div className="cp-grid-header-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <p className="cp-section-eyebrow">All Campaigns</p>
            <h2 className="cp-section-title">Support Our Causes</h2>
          </div>

          {error && (
            <div className="cp-error" role="alert">
              <div className="cp-error-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div className="cp-error-body">
                <h5 className="cp-error-title">Connection Issue</h5>
                <p className="cp-error-msg">{error}</p>
              </div>
              <Button size="sm" className="cp-error-retry" onClick={() => fetchCampaigns()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Try Again
              </Button>
            </div>
          )}

          {!error && campaigns.length === 0 && (
            <div className="cp-empty">
              <div className="cp-empty-icon-wrap">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <h4>No campaigns found</h4>
              <p>Try adjusting your filters or search term to discover more causes</p>
              <Button className="c4k-btn-primary-solid" onClick={resetFilters}>
                Reset Filters
              </Button>
            </div>
          )}

          {!error && campaigns.length > 0 && (
            <Row className="cp-campaign-grid">
              {campaigns.map((campaign) => (
                <Col key={campaign.campaignId} lg={4} md={6} className="mb-4">
                  <Card className="cp-campaign-card">
                    {/* Image */}
                    <div className="cp-card-image">
                      <img
                        src={campaign.imageUrl || 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337366/giveaid/replacement/h-mong-9402-1396341888_y8hvch.webp'}
                        alt={campaign.campaignName}
                        onError={(e) => {
                          e.target.src = 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337366/giveaid/replacement/h-mong-9402-1396341888_y8hvch.webp';
                        }}
                      />
                      {campaign.isFeatured && (
                        <Badge className="cp-featured-tag">Featured</Badge>
                      )}
                      <Badge className="cp-cause-tag">
                        {campaign.causeName || 'Child Welfare'}
                      </Badge>
                    </div>

                    {/* Body */}
                    <Card.Body className="cp-card-body">
                      <h4 className="cp-card-title">{campaign.campaignName}</h4>
                      <p className="cp-card-desc">
                        {campaign.description?.substring(0, 100)}
                        {campaign.description?.length > 100 ? '...' : ''}
                      </p>

                      {/* Progress */}
                      <div className="cp-card-progress">
                        <div className="cp-card-progress-header">
                          <span className="cp-card-raised">
                            {formatCurrency(campaign.raisedAmount || 0)}
                          </span>
                          <span className="cp-card-percent">
                            {Math.round(campaign.percentageReached || 0)}%
                          </span>
                        </div>
                        <div className="cp-card-progress-track">
                          <div
                            className="cp-card-progress-fill"
                            style={{
                              width: `${Math.min(campaign.percentageReached || 0, 100)}%`
                            }}
                          />
                        </div>
                        <div className="cp-card-progress-footer">
                          <span>Goal: {formatCurrency(campaign.goalAmount)}</span>
                          {campaign.daysRemaining != null && campaign.daysRemaining >= 0 && (
                            <span>{campaign.daysRemaining} days left</span>
                          )}
                          </div>
                  </div>

                      {/* Actions */}
                      <div className="cp-card-actions">
                  <Link
                    to={`/campaigns/${campaign.campaignId}`}
                          className="btn-teal btn-sm"
                        >
                          View Campaign
                        </Link>
                        <Link
                          to={`/donate?campaignId=${campaign.campaignId}`}
                          className="btn-outline-coral btn-sm"
                        >
                          Donate
                  </Link>
                      </div>
                </Card.Body>
              </Card>
            </Col>
              ))}
        </Row>
      )}

          {/* Pagination */}
          {!error && totalCount > pageSize && (
            <nav className="cp-pagination" aria-label="Campaign pages">
              <Button
                className="cp-page-btn cp-page-nav"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <div className="cp-page-numbers">
                {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1).map((num) => (
                  <Button
                    key={num}
                    className={`cp-page-btn cp-page-number ${num === page ? 'active' : ''}`}
                    onClick={() => setPage(num)}
                    aria-current={num === page ? 'page' : undefined}
                  >
                    {num}
                  </Button>
                ))}
              </div>
              <Button
                className="cp-page-btn cp-page-nav"
                disabled={page >= Math.ceil(totalCount / pageSize)}
                onClick={() => setPage((p) => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
              >
                Next
              </Button>
            </nav>
          )}
        </Container>
      </section>

      {/* ============================================================
          6. HOW DONATIONS HELP
      ============================================================ */}
      <section className="cp-donation-impact">
        <Container>
          <p className="cp-section-eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Your Impact</p>
          <h2 className="cp-section-title" style={{ color: '#fff' }}>Where Your Donation Goes</h2>
          <p className="cp-section-desc" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Every contribution, regardless of size, creates meaningful change in a child's life.
          </p>
          <Row className="cp-impact-levels">
            <Col md={3} sm={6} className="mb-4">
              <div className="cp-impact-card">
                <div className="cp-impact-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <div className="cp-impact-amount">{formatCurrency(100000)}</div>
                <div className="cp-impact-desc">Provides school supplies and a notebook set for one child</div>
              </div>
            </Col>
            <Col md={3} sm={6} className="mb-4">
              <div className="cp-impact-card">
                <div className="cp-impact-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                </div>
                <div className="cp-impact-amount">{formatCurrency(200000)}</div>
                <div className="cp-impact-desc">Provides nutritious meals for a child for one full week</div>
              </div>
            </Col>
            <Col md={3} sm={6} className="mb-4">
              <div className="cp-impact-card">
                <div className="cp-impact-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                <div className="cp-impact-amount">{formatCurrency(500000)}</div>
                <div className="cp-impact-desc">Supports essential healthcare and medical check-ups</div>
              </div>
            </Col>
            <Col md={3} sm={6} className="mb-4">
              <div className="cp-impact-card">
                <div className="cp-impact-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                </div>
                <div className="cp-impact-amount">{formatCurrency(1000000)}</div>
                <div className="cp-impact-desc">Sponsors a month of education and long-term development</div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ============================================================
          7. TRUST SECTION
      ============================================================ */}
      <section className="cp-trust">
        <Container>
          <p className="cp-section-eyebrow">Trust & Transparency</p>
          <h2 className="cp-section-title">Your Support Creates Real Change</h2>
          <Row className="cp-trust-grid">
            <Col md={4} className="mb-4">
              <div className="cp-trust-item">
                <div className="cp-trust-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h4>Transparent</h4>
                <p>Every campaign publishes financial reports. See exactly where your donation goes and the impact it creates.</p>
              </div>
            </Col>
            <Col md={4} className="mb-4">
              <div className="cp-trust-item">
                <div className="cp-trust-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h4>Secure</h4>
                <p>Bank-level encryption protects every donation. We never store your card details.</p>
              </div>
            </Col>
            <Col md={4} className="mb-4">
              <div className="cp-trust-item">
                <div className="cp-trust-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                <h4>Impact-Driven</h4>
                <p>Regular updates on campaign progress. You'll see the real difference your support makes.</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ============================================================
          8. FINAL CTA
      ============================================================ */}
      <section className="cp-final-cta">
        <Container className="text-center">
          <p className="cp-final-cta-eyebrow">Make a Difference</p>
          <h2 className="cp-final-cta-title">Together, We Can Help Every Child Thrive</h2>
          <p className="cp-final-cta-sub">
            Every child deserves food, education, healthcare and love.<br />Join thousands of donors making a real difference today.
          </p>
          <div className="cp-final-cta-actions">
            <Link to="/donate" className="c4k-btn-primary-solid c4k-btn-lg">
              <svg className="c4k-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span>Donate Now</span>
            </Link>
            <Link to="/about" className="c4k-btn-ghost-outline-dark c4k-btn-lg">
              <span>Learn About Us</span>
              <svg className="c4k-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
        </Link>
      </div>
    </Container>
      </section>

    </div>
  );
}

export default CampaignsPage;
