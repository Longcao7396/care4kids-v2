import React, { useEffect, useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './HomePage.css';

const HomePage = () => {
  const [featuredCampaigns, setFeaturedCampaigns] = useState([]);
  const [galleryPreview, setGalleryPreview] = useState([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  let cancelled = false;
  const loadData = async () => {
    try {
      const [campaignsRes, featuredGalleryRes] = await Promise.all([
        api.get('/campaigns/featured', { params: { count: 3 } }),
        api.get('/gallery/featured', { params: { count: 8 } }).catch(() => []),
      ]);
      if (!cancelled) {
        setFeaturedCampaigns(Array.isArray(campaignsRes) ? campaignsRes : (campaignsRes?.items || []));
        const galleryArr = Array.isArray(featuredGalleryRes)
          ? featuredGalleryRes
          : (featuredGalleryRes?.items || featuredGalleryRes?.data || []);
        setGalleryPreview(galleryArr.slice(0, 8));
      }
    } catch (error) {
      if (!cancelled) console.error('Error loading data:', error);
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
  loadData();
  return () => { cancelled = true; };
}, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="c4k-home">

      {/* ============================================================
          1. HERO — Full-width editorial with overlay
      ============================================================ */}
      <section className="c4k-hero">
        <div className="c4k-hero-bg">
          <img
            src="https://res.cloudinary.com/mczqcagv/image/upload/v1790337347/giveaid/replacement/3-Em-gai-Moc-Chau-jpg-1355806129-1355806531_mithuz.webp"
            alt="Children smiling and learning"
          />
          <div className="c4k-hero-overlay" />
        </div>
        <Container className="c4k-hero-content">
          <Row className="align-items-center">
            <Col lg={7}>
              <p className="c4k-hero-eyebrow">Children's Welfare &amp; Donation</p>
              <h1 className="c4k-hero-title">
                Every Child Deserves<br />a Brighter Future
              </h1>
              <p className="c4k-hero-subtitle">
                Care4Kids provides nutritious meals, education, healthcare and safe shelter to vulnerable children across Vietnam. Every donation creates real, lasting change in a child's life.
              </p>
              <div className="c4k-hero-actions">
                <Link to="/donate" className="c4k-btn-primary-solid">
                  <svg className="c4k-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span>Donate Now</span>
                </Link>
                <Link to="/campaigns" className="c4k-btn-ghost-outline">
                  <span>Our Campaigns</span>
                  <svg className="c4k-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </Link>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ============================================================
          2. DONATE QUICK PANEL — GitHub sponsor-style tier cards
      ============================================================ */}
      <section className="c4k-mission">
        <Container>
          <div className="c4k-section-header">
            <p className="eyebrow">Choose Your Impact</p>
            <h2 className="c4k-section-title">Every Donation Counts</h2>
            <p className="c4k-section-desc">
              Pick an amount that feels right for you. Each tier represents real, tangible support for children across Vietnam.
            </p>
          </div>

          <div className="c4k-donate-grid">
            {/* Tier 1 — Meal */}
            <div className="c4k-donate-card">
              <div className="c4k-donate-icon c4k-donate-icon-meal">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
                  <line x1="6" y1="1" x2="6" y2="4"/>
                  <line x1="10" y1="1" x2="10" y2="4"/>
                  <line x1="14" y1="1" x2="14" y2="4"/>
                </svg>
              </div>
              <div className="c4k-donate-tier">Tier 01 · Starter</div>
              <div className="c4k-donate-amount">50,000<span className="c4k-donate-currency">₫</span></div>
              <h4 className="c4k-donate-title">Nutritious Meal</h4>
              <p className="c4k-donate-desc">Provide one balanced, nutritious meal to a child at a care home.</p>
              <ul className="c4k-donate-features">
                <li><span className="c4k-check">✓</span>1 meal per child</li>
                <li><span className="c4k-check">✓</span>Direct to kitchen fund</li>
                <li><span className="c4k-check">✓</span>Monthly report</li>
              </ul>
              <Link to="/donate?amount=50000" className="c4k-donate-btn c4k-donate-btn-secondary">
                Donate 50K
              </Link>
            </div>

            {/* Tier 2 — Education (FEATURED) */}
            <div className="c4k-donate-card c4k-donate-card-featured">
              <div className="c4k-donate-badge">Most Popular</div>
              <div className="c4k-donate-icon c4k-donate-icon-edu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </div>
              <div className="c4k-donate-tier">Tier 02 · Standard</div>
              <div className="c4k-donate-amount">200,000<span className="c4k-donate-currency">₫</span></div>
              <h4 className="c4k-donate-title">Education Kit</h4>
              <p className="c4k-donate-desc">Fund a backpack, textbooks and full learning supplies for one child.</p>
              <ul className="c4k-donate-features">
                <li><span className="c4k-check">✓</span>Full school kit</li>
                <li><span className="c4k-check">✓</span>1 semester support</li>
                <li><span className="c4k-check">✓</span>Progress updates</li>
                <li><span className="c4k-check">✓</span>Thank-you letter</li>
              </ul>
              <Link to="/donate?amount=200000" className="c4k-donate-btn c4k-donate-btn-primary">
                Donate 200K
              </Link>
            </div>

            {/* Tier 3 — Healthcare */}
            <div className="c4k-donate-card">
              <div className="c4k-donate-icon c4k-donate-icon-health">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <div className="c4k-donate-tier">Tier 03 · Premium</div>
              <div className="c4k-donate-amount">500,000<span className="c4k-donate-currency">₫</span></div>
              <h4 className="c4k-donate-title">Healthcare Visit</h4>
              <p className="c4k-donate-desc">Cover a full medical check-up, essential medicines and follow-up care.</p>
              <ul className="c4k-donate-features">
                <li><span className="c4k-check">✓</span>Medical check-up</li>
                <li><span className="c4k-check">✓</span>Essential medicines</li>
                <li><span className="c4k-check">✓</span>3-month follow-up</li>
                <li><span className="c4k-check">✓</span>Health report card</li>
              </ul>
              <Link to="/donate?amount=500000" className="c4k-donate-btn c4k-donate-btn-secondary">
                Donate 500K
              </Link>
            </div>

            {/* Tier 4 — Monthly Sponsor */}
            <div className="c4k-donate-card">
              <div className="c4k-donate-icon c4k-donate-icon-shelter">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div className="c4k-donate-tier">Tier 04 · Champion</div>
              <div className="c4k-donate-amount">1,000,000<span className="c4k-donate-currency">₫</span></div>
              <h4 className="c4k-donate-title">Monthly Sponsor</h4>
              <p className="c4k-donate-desc">Become a monthly sponsor covering all needs for a child for one month.</p>
              <ul className="c4k-donate-features">
                <li><span className="c4k-check">✓</span>Complete monthly care</li>
                <li><span className="c4k-check">✓</span>Food + education + health</li>
                <li><span className="c4k-check">✓</span>Personal mentor contact</li>
                <li><span className="c4k-check">✓</span>VIP impact reports</li>
              </ul>
              <Link to="/donate?amount=1000000" className="c4k-donate-btn c4k-donate-btn-secondary">
                Donate 1M
              </Link>
            </div>
          </div>

          <div className="c4k-mission-stats-row">
            <div className="c4k-stat-item">
              <div className="stat-number">2,500+</div>
              <div className="stat-label">Children Supported</div>
            </div>
            <div className="c4k-stat-item">
              <div className="stat-number">50,000+</div>
              <div className="stat-label">Meals Provided</div>
            </div>
            <div className="c4k-stat-item">
              <div className="stat-number">1,200+</div>
              <div className="stat-label">Education Packages</div>
            </div>
            <div className="c4k-stat-item">
              <div className="stat-number">3,000+</div>
              <div className="stat-label">Donors Trust Us</div>
            </div>
          </div>
        </Container>
      </section>

      {/* ============================================================
          3. FEATURED CAMPAIGNS — 3-column editorial grid
      ============================================================ */}
      <section className="c4k-campaigns">
        <Container>
          <div className="c4k-section-header">
            <p className="eyebrow">Active Campaigns</p>
            <h2 className="c4k-section-title">Make a Direct Difference</h2>
            <p className="c4k-section-desc">
              Each campaign targets a specific need. Your donation goes directly to the children and causes you choose to support.
            </p>
          </div>

          {loading ? (
            <div className="c4k-loading">
              <div className="spinner-c4k" />
            </div>
          ) : (
            <div className="c4k-campaigns-grid">
              {featuredCampaigns.length > 0 ? (
                featuredCampaigns.slice(0, 3).map((campaign) => (
                  <div key={campaign.campaignId} className="c4k-campaign-card">
                      <div className="c4k-campaign-image">
                        <img
                          src={campaign.imageUrl || 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337366/giveaid/replacement/h-mong-9402-1396341888_y8hvch.webp'}
                          alt={campaign.campaignName}
                          onError={(e) => {
                            e.target.src = 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337366/giveaid/replacement/h-mong-9402-1396341888_y8hvch.webp';
                          }}
                        />
                        <div className="c4k-campaign-image-overlay">
                          <span className="badge badge-teal">{campaign.causeName || 'Child Welfare'}</span>
                        </div>
                      </div>
                      <div className="c4k-campaign-body">
                        <h3 className="c4k-campaign-title">{campaign.campaignName}</h3>
                        <p className="c4k-campaign-desc">
                          {campaign.description?.substring(0, 100)}
                          {campaign.description?.length > 100 ? '...' : ''}
                        </p>
                        <div className="c4k-campaign-progress">
                          <div className="c4k-progress-header">
                            <span className="c4k-raised">
                              {formatCurrency(campaign.raisedAmount || 0)}
                            </span>
                            <span className="c4k-percent">
                              {Math.round(campaign.percentageReached || 0)}%
                            </span>
                          </div>
                          <div className="progress">
                            <div
                              className="progress-bar"
                              style={{ width: `${Math.min(campaign.percentageReached || 0, 100)}%` }}
                            />
                          </div>
                          <div className="c4k-progress-footer">
                            <span>Goal: {formatCurrency(campaign.goalAmount)}</span>
                            {campaign.daysRemaining != null && campaign.daysRemaining >= 0 && (
                              <span>{campaign.daysRemaining} days left</span>
                            )}
                          </div>
                        </div>
                        <Link
                          to={`/campaigns/${campaign.campaignId}`}
                          className="btn-coral btn-sm"
                        >
                          Support This Campaign
                        </Link>
                      </div>
                  </div>
                ))
              ) : (
                /* Placeholder cards when no API data */
                <>
                  {[
                    {
                      title: 'Supporting Children in Rural Communities',
                      cause: 'Rural Communities',
                      desc: 'Long-term support for children growing up in remote and underserved communes — food, learning, healthcare and a safe place to belong.',
                      raised: 21500000,
                      goal: 45000000,
                      percent: 47,
                      days: 82,
                      img: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337366/giveaid/replacement/h-mong-9402-1396341888_y8hvch.webp',
                      id: 1
                    },
                    {
                      title: 'Essential Supplies for Children',
                      cause: 'Education',
                      desc: 'Essential school supplies — backpacks, textbooks and learning kits for children in need.',
                      raised: 12750000,
                      goal: 30000000,
                      percent: 42,
                      days: 35,
                      img: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337381/giveaid/replacement/thang3-4930-1396341890_cyjvnr.webp',
                      id: 2
                    },
                    {
                      title: 'Nutritious Meals for Children',
                      cause: 'Food & Nutrition',
                      desc: 'Daily balanced meals for children at care homes and community centres across Vietnam.',
                      raised: 18500000,
                      goal: 50000000,
                      percent: 37,
                      days: 112,
                      img: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337355/giveaid/replacement/thieunhi11-6736-1401513005_qhyasf.webp',
                      id: 3
                    }
                  ].map((c) => (
                    <div key={c.id} className="c4k-campaign-card">
                      <div className="c4k-campaign-image">
                        <img src={c.img} alt={c.title} />
                        <div className="c4k-campaign-image-overlay">
                          <span className="badge badge-teal">{c.cause}</span>
                        </div>
                      </div>
                        <div className="c4k-campaign-body">
                          <h3 className="c4k-campaign-title">{c.title}</h3>
                          <p className="c4k-campaign-desc">{c.desc}</p>
                          <div className="c4k-campaign-progress">
                            <div className="c4k-progress-header">
                              <span className="c4k-raised">{formatCurrency(c.raised)}</span>
                              <span className="c4k-percent">{c.percent}%</span>
                            </div>
                            <div className="progress">
                              <div className="progress-bar" style={{ width: `${c.percent}%` }} />
                            </div>
                            <div className="c4k-progress-footer">
                              <span>Goal: {formatCurrency(c.goal)}</span>
                              <span>{c.days} days left</span>
                            </div>
                          </div>
                          <Link to="/donate" className="btn-coral btn-sm">Support This Campaign</Link>
                        </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          <div className="c4k-section-footer">
            <Link to="/campaigns" className="btn-outline-teal">
              View All Campaigns
            </Link>
          </div>
        </Container>
      </section>

      {/* ============================================================
          4. PILLARS — Dark teal, 3 mission areas
      ============================================================ */}
      <section className="c4k-pillars">
        <Container>
          <div className="c4k-section-header c4k-section-header-light">
            <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>Where We Work</p>
            <h2 className="c4k-section-title" style={{ color: '#fff' }}>
              Our Core Programme Areas
            </h2>
            <p className="c4k-section-desc" style={{ color: 'rgba(255,255,255,0.75)' }}>
              We focus on four areas where intervention creates the greatest lasting impact on children's lives.
            </p>
          </div>
          <div className="c4k-pillars-grid">
            <div className="c4k-pillar-col">
              <div className="c4k-pillar-card">
                <div className="c4k-pillar-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                </div>
                <h4 className="c4k-pillar-title">Food &amp; Nutrition</h4>
                <p className="c4k-pillar-desc">Daily nutritious meals and food support for children in care homes and underserved communities.</p>
              </div>
            </div>
            <div className="c4k-pillar-col">
              <div className="c4k-pillar-card">
                <div className="c4k-pillar-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <h4 className="c4k-pillar-title">Education</h4>
                <p className="c4k-pillar-desc">School supplies, scholarships and learning support to ensure every child can attend and succeed in school.</p>
              </div>
            </div>
            <div className="c4k-pillar-col">
              <div className="c4k-pillar-card">
                <div className="c4k-pillar-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                <h4 className="c4k-pillar-title">Healthcare</h4>
                <p className="c4k-pillar-desc">Medical check-ups, essential medicines, vaccinations and emergency treatment for children in need.</p>
              </div>
            </div>
            <div className="c4k-pillar-col">
              <div className="c4k-pillar-card">
                <div className="c4k-pillar-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <h4 className="c4k-pillar-title">Safe Homes</h4>
                <p className="c4k-pillar-desc">Clothing, bedding and daily necessities for children living in care homes and community shelters.</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ============================================================
          5. IMPACT STORY — Editorial long-form
      ============================================================ */}
      <section className="c4k-story">
        <Container>
          <Row className="c4k-story-row">
            <Col lg={5}>
              <div className="c4k-story-image">
                <img
                  src="https://res.cloudinary.com/mczqcagv/image/upload/v1790337362/giveaid/replacement/thieunhi19-3239-1401513005_py9gb4.webp"
                  alt="Children at a care home"
                />
              </div>
            </Col>
            <Col lg={7}>
              <div className="c4k-story-content">
                <p className="eyebrow">Impact Story</p>
                <h2 className="c4k-story-title">
                  "The school supplies programme changed everything for our family."
                </h2>
                <p className="c4k-story-body">
                  When Nguyen's mother lost her job, she feared her two children would have to drop out of school. Care4Kids provided backpacks, textbooks and a full set of learning supplies — so the children could stay in school while their mother found new work.
                </p>
                <p className="c4k-story-body">
                  "The school bag and books gave my children dignity when they returned to class. They no longer felt different from their classmates. That small act of support gave our whole family strength."
                </p>
                <div className="c4k-story-attribution">
                  <span className="c4k-story-name">Nguyen Family</span>
                  <span className="c4k-story-detail">Hanoi · School Supplies Campaign 2025</span>
                </div>
                <Link to="/about" className="btn-outline-teal">
                  Read More Stories
                </Link>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ============================================================
          6. TRUST SECTION — White
      ============================================================ */}
      <section className="c4k-trust">
        <Container>
          <div className="c4k-section-header">
            <p className="eyebrow">Transparency</p>
            <h2 className="c4k-section-title">Why Donors Trust Care4Kids</h2>
          </div>
          <div className="c4k-trust-grid">
            <div className="c4k-trust-item">
              <div className="c4k-trust-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h4 className="c4k-trust-title">Transparent</h4>
              <p className="c4k-trust-desc">Every campaign publishes financial reports. See exactly where your donation goes and the impact it creates.</p>
            </div>
            <div className="c4k-trust-item">
              <div className="c4k-trust-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h4 className="c4k-trust-title">Secure</h4>
              <p className="c4k-trust-desc">Bank-level encryption protects every donation. We never store your card details.</p>
            </div>
            <div className="c4k-trust-item">
              <div className="c4k-trust-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <h4 className="c4k-trust-title">Impact-Driven</h4>
              <p className="c4k-trust-desc">Regular updates on campaign progress. You'll see the real difference your support makes.</p>
            </div>
          </div>
        </Container>
      </section>

      {/* ============================================================
          6. GALLERY PREVIEW — Featured photos linking to /gallery
      ============================================================ */}
      {galleryPreview.length > 0 && (
        <section className="c4k-gallery-preview">
          <Container>
            <div className="c4k-section-header">
              <p className="eyebrow">From the Field</p>
              <h2 className="c4k-section-title">Moments That Matter</h2>
              <p className="c4k-section-desc">
                Real stories captured with consent across Vietnam — every photograph
                celebrates the resilience of children and communities we serve.
              </p>
            </div>

            <div className="c4k-gallery-grid">
              {galleryPreview.map((item) => {
                const url = item.photoUrl || item.url || '';
                const thumb = item.thumbnail || item.thumbnailUrl || url;
                const title = item.title || 'Untitled';
                return (
                  <Link
                    key={item.galleryId ?? item.id ?? url}
                    to="/gallery"
                    className="c4k-gallery-card"
                    aria-label={`View ${title}`}
                  >
                    <div className="c4k-gallery-img-wrap">
                      <img
                        src={thumb}
                        alt={title}
                        loading="lazy"
                        onError={(e) => { e.currentTarget.src = url; }}
                      />
                      <div className="c4k-gallery-img-overlay">
                        <span className="c4k-gallery-img-title">{title}</span>
                      </div>
                      {item.category && (
                        <span className="c4k-gallery-cat-badge">{item.category}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="c4k-section-footer">
              <Link to="/gallery" className="c4k-btn-ghost-outline">
                <span>View Full Gallery</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            </div>
          </Container>
        </section>
      )}

      {/* ============================================================
          7. FINAL CTA — Coral accent section
      ============================================================ */}
      <section className="c4k-cta">
        <Container className="text-center">
          <h2 className="c4k-cta-title">You Can Help a Child Today</h2>
          <p className="c4k-cta-sub">
            With your support, we can reach more children with food, education and healthcare.<br />
            Every contribution creates real, lasting change.
          </p>
          <Link to="/donate" className="btn-coral btn-lg">
            Donate Now
          </Link>
        </Container>
      </section>

    </div>
  );
};

export default HomePage;
