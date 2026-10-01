import React, { useState, useEffect, useCallback } from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { sanitizeHtml } from '../utils/safeHtml';
import './AboutPage.css';

/* ── Icon set (inline SVG) ─────────────────────────────── */
const Icons = {
  mission: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  vision: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
    </svg>
  ),
  promise: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
  food: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
      <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  ),
  education: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  health: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  shelter: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  transparency: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <line x1="9" y1="12" x2="11" y2="12"/><line x1="11" y1="12" x2="11" y2="16"/>
      <line x1="11" y1="14" x2="13" y2="14"/>
    </svg>
  ),
  compassion: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  collaboration: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  arrow: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  quote: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.17 17c-.51 0-.98-.29-1.2-.74-.27-.55-.06-1.21.46-1.52.94-.55 1.57-1.49 1.57-2.57 0-.39-.08-.74-.22-1.06-.15-.34-.13-.74.06-1.06.19-.32.55-.55.94-.55H11c1.1 0 2 .9 2 2v3c0 1.1-.9 2-2 2H7.17zm10 0c-.51 0-.98-.29-1.2-.74-.27-.55-.06-1.21.46-1.52.94-.55 1.57-1.49 1.57-2.57 0-.39-.08-.74-.22-1.06-.15-.34-.13-.74.06-1.06.19-.32.55-.55.94-.55H21c1.1 0 2 .9 2 2v3c0 1.1-.9 2-2 2h-3.83z"/>
    </svg>
  ),
  scroll: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
};

/* ── Data ─────────────────────────────────────────────── */
const PROGRAMME_PILLARS = [
  {
    icon: Icons.food,
    title: 'Nutritious Meals',
    desc: 'Daily meals, food packages and nutrition programmes that combat child hunger across Vietnam.',
    image: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337379/giveaid/replacement/thang2-7378-1396341890_sh4unx.webp',
    stat: '50,000+',
    statLabel: 'Meals / year',
  },
  {
    icon: Icons.education,
    title: 'Education Access',
    desc: 'School supplies, scholarships, libraries and free English classes for rural and under-served children.',
    image: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337381/giveaid/replacement/thang3-4930-1396341890_cyjvnr.webp',
    stat: '1,500+',
    statLabel: 'Children in school',
  },
  {
    icon: Icons.health,
    title: 'Healthcare & Wellness',
    desc: 'Mobile clinics, free health checks, heart surgeries and nutrition support for vulnerable families.',
    image: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337355/giveaid/replacement/thieunhi11-6736-1401513005_qhyasf.webp',
    stat: '3,000+',
    statLabel: 'Patients treated',
  },
  {
    icon: Icons.shelter,
    title: 'Safe Shelter',
    desc: 'Long-term residential care homes and emergency shelter for orphans and at-risk children.',
    image: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337368/giveaid/replacement/sung1-9985-1396341889_rdwlsg.webp',
    stat: '12',
    statLabel: 'Care homes',
  },
];

const CORE_VALUES = [
  {
    icon: Icons.transparency,
    title: 'Transparency',
    desc: 'Every donation is tracked, every programme is reported. Our financial statements are public.',
    metric: '100%',
    metricLabel: 'Funds public',
  },
  {
    icon: Icons.compassion,
    title: 'Compassion',
    desc: 'We lead with empathy, listening to communities and honouring the dignity of every child.',
    metric: '24/7',
    metricLabel: 'Care coverage',
  },
  {
    icon: Icons.collaboration,
    title: 'Collaboration',
    desc: 'We partner with local authorities, NGOs, schools and health providers to amplify impact.',
    metric: '40+',
    metricLabel: 'Active partners',
  },
];

const TIMELINE = [
  { year: '2015', title: 'Founded', desc: 'Care4Kids was founded by a small group of educators and social workers in Hanoi.' },
  { year: '2017', title: 'First Programmes', desc: 'Launched school-supplies and meal programmes reaching 200 children in 3 provinces.' },
  { year: '2019', title: 'Care Home Opened', desc: 'Opened our first long-term residential care home for 30 orphaned children.' },
  { year: '2021', title: 'Healthcare Initiative', desc: 'Partnered with hospitals to provide free check-ups and surgeries for 500+ children.' },
  { year: '2023', title: 'Regional Expansion', desc: 'Extended programmes to 12 provinces across Northern, Central and Southern Vietnam.' },
  { year: '2025', title: '10,000+ Lives', desc: 'Crossed 10,000 direct beneficiaries and 4 programme pillars operational.' },
  { year: '2026', title: 'Today', desc: 'A trusted NGO with transparent reporting, 4 care homes and 120 active programmes.' },
];

const LEADERS = [
  { name: 'Cao Hai Long', role: 'Founder & Executive Director', initials: 'CHL', color: '#E87A5A' },
  { name: 'Dinh Sy Son', role: 'Director of Programmes', initials: 'DSS', color: '#0E7490' },
  { name: 'Bui Manh Duy', role: 'Head of Partnerships', initials: 'BMD', color: '#5B8C3D' },
  { name: 'Le Ho Hoang Hai', role: 'Director of Operations', initials: 'LHH', color: '#7C3AED' },
  { name: 'Nguyen Nhat Long', role: 'Director of Operations', initials: 'NNL', color: '#D97706' },
];

function AboutPage() {
  const [cmsPages, setCmsPages] = useState({}); // page_key -> CMS record

  // Sections that the admin can edit via the CMS module. When a CMS page
  // exists and has non-empty content, the public AboutPage renders it; otherwise
  // it falls back to the hardcoded values defined at the top of this file.
  const fetchCms = useCallback(async () => {
    const EDITABLE_SECTIONS = ['what_we_do', 'our_mission'];
    try {
      // Bulk-load all editable sections in one call.
      const keys = EDITABLE_SECTIONS.join(',');
      const res = await api.get('/cms/pages', { params: { keys } });
      const list = Array.isArray(res) ? res : (res?.items || []);
      const map = {};
      list.forEach((p) => { map[p.pageKey] = p; });
      setCmsPages(map);
    } catch (err) {
      console.warn('About CMS fallback:', err);
    }
  }, []);

  useEffect(() => { fetchCms(); }, [fetchCms]);

  const getCms = (key) => cmsPages[key];
  const hasCmsContent = (key) => {
    const p = getCms(key);
    return !!(p && (p.content || p.pageTitle));
  };

  return (
    <div className="ap-page">

      {/* ─── 1. HERO ────────────────────────────────────── */}
      <section className="ap-hero">
        <div className="ap-hero-bg">
          <img
            src="https://res.cloudinary.com/mczqcagv/image/upload/v1790337357/giveaid/replacement/thieunhi9-2869-1401513005_chlpkd.webp"
            alt="Vietnamese schoolchildren studying"
          />
          <div className="ap-hero-overlay" />
        </div>
        <Container className="ap-hero-content">
          <p className="ap-hero-eyebrow">About Care4Kids</p>
          <h1 className="ap-hero-title">
            A movement for<br />every child
          </h1>
          <p className="ap-hero-sub">
            Operating exclusively for children's welfare, Care4Kids runs direct programmes in
            communities across Vietnam — supporting vulnerable children through sustainable,
            evidence-based interventions.
          </p>

          {/* Quick stats in hero */}
          <div className="ap-hero-stats">
            <div className="ap-hero-stat">
              <span className="ap-hero-stat-num">10+</span>
              <span className="ap-hero-stat-lbl">Years of impact</span>
            </div>
            <span className="ap-hero-stat-divider" />
            <div className="ap-hero-stat">
              <span className="ap-hero-stat-num">12</span>
              <span className="ap-hero-stat-lbl">Provinces served</span>
            </div>
            <span className="ap-hero-stat-divider" />
            <div className="ap-hero-stat">
              <span className="ap-hero-stat-num">10,000+</span>
              <span className="ap-hero-stat-lbl">Lives changed</span>
            </div>
          </div>          {/* Scroll cue */}
          <a href="#mission" className="ap-hero-scroll" aria-label="Scroll to content">
            <span>Read our story</span>
            {Icons.scroll}
          </a>
        </Container>
      </section>

      {/* ─── 2. MISSION / VISION / PROMISE STRIP ────────── */}
      {/* When the admin has populated the "our_mission" CMS page, render its
          title + body instead of the hardcoded columns. Otherwise the static
          mission/vision/promise strip below stays in place. */}
      {hasCmsContent('our_mission') ? (
        <section className="ap-mission ap-mission-cms" id="mission">
          <Container>
            <div className="ap-section-header">
              <p className="ap-eyebrow">Mission, Vision &amp; Promise</p>
              <h2 className="ap-section-title">{getCms('our_mission').pageTitle || 'Our Mission'}</h2>
            </div>
            <div className="ap-mission-cms-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(getCms('our_mission').content) }} />
          </Container>
        </section>
      ) : (
        <section className="ap-mission" id="mission">
          <Container>
            <div className="ap-mission-grid">
              <div className="ap-mission-col">
                <div className="ap-mission-icon">{Icons.mission}</div>
                <p className="ap-eyebrow">Our Mission</p>
                <h3 className="ap-mission-title">A fair start for every child</h3>
                <p className="ap-mission-desc">
                  We deliver transparent, evidence-based programmes that provide food, education,
                  healthcare and safe shelter to children who need them most.
                </p>
              </div>
              <div className="ap-mission-col">
                <div className="ap-mission-icon ap-mission-icon-teal">{Icons.vision}</div>
                <p className="ap-eyebrow">Our Vision</p>
                <h3 className="ap-mission-title">A world where children thrive</h3>
                <p className="ap-mission-desc">
                  We envision a future where no child is denied food, schooling, medical care,
                  or love — and where communities sustain that future themselves.
                </p>
              </div>
              <div className="ap-mission-col">
                <div className="ap-mission-icon ap-mission-icon-gold">{Icons.promise}</div>
                <p className="ap-eyebrow">Our Promise</p>
                <h3 className="ap-mission-title">Impact you can see & verify</h3>
                <p className="ap-mission-desc">
                  Every donor receives detailed impact reports. Every programme is independently
                  audited. Every story is told with dignity and consent.
                </p>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* ─── 3. OUR STORY (split image + text) ───────────── */}
      <section className="ap-story">
        <Container>
          <div className="ap-story-grid">
            <div className="ap-story-image-wrap">
              <img
                src="https://res.cloudinary.com/mczqcagv/image/upload/v1790337416/giveaid/replacement/6.1-1_byrdld.jpg"
                alt="Children at a Care4Kids programme"
                className="ap-story-image"
              />
              <div className="ap-story-image-badge">
                <div className="ap-story-badge-num">11</div>
                <div className="ap-story-badge-lbl">Years<br />of care</div>
              </div>
              <img
                src="https://res.cloudinary.com/mczqcagv/image/upload/v1790337363/giveaid/replacement/thieunhi20-2550-1401513005_nbzehq.webp"
                alt="Child reading"
                className="ap-story-image-secondary"
              />
            </div>

            <div className="ap-story-content">
              <p className="ap-eyebrow">Our Story</p>
              <h2 className="ap-section-title">From a small classroom to a national movement</h2>
              <p className="ap-story-lead">
                Care4Kids began in 2015 with three teachers, twelve children, and a single rented
                room in Hanoi. Today we operate across <strong>12 provinces</strong>, with
                <strong> 4 residential care homes</strong>, <strong>120 active programmes</strong>,
                and a team of <strong>60 staff</strong> alongside <strong>400+ volunteers</strong>.
              </p>

              <blockquote className="ap-story-quote">
                <div className="ap-story-quote-icon">{Icons.quote}</div>
                <p>
                  We measure success not in numbers, but in the quiet moments — a child finishing
                  homework, a teenager graduating, a mother smiling at a healthy baby.
                </p>
                <footer>— Cao Hai Long, Founder</footer>
              </blockquote>

              <div className="ap-story-highlights">
                <div className="ap-highlight">
                  <span className="ap-highlight-num">2015</span>
                  <span className="ap-highlight-lbl">Founded</span>
                </div>
                <div className="ap-highlight">
                  <span className="ap-highlight-num">12</span>
                  <span className="ap-highlight-lbl">Provinces</span>
                </div>
                <div className="ap-highlight">
                  <span className="ap-highlight-num">60</span>
                  <span className="ap-highlight-lbl">Staff</span>
                </div>
                <div className="ap-highlight">
                  <span className="ap-highlight-num">400+</span>
                  <span className="ap-highlight-lbl">Volunteers</span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── 4. PROGRAMME PILLARS / WHAT WE DO ──────────── */}
      {/* When the admin has populated the "what_we_do" CMS page, render its
          content in place of the hardcoded four-pillar grid. */}
      {hasCmsContent('what_we_do') ? (
        <section className="ap-pillars ap-pillars-cms">
          <Container>
            <div className="ap-section-header">
              <p className="ap-eyebrow">Our Work</p>
              <h2 className="ap-section-title">{getCms('what_we_do').pageTitle || 'What We Do'}</h2>
            </div>
            <div className="ap-pillars-cms-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(getCms('what_we_do').content) }} />
            <div className="ap-pillars-cta">
              <Link to="/campaigns" className="c4k-btn-primary-solid">
                <span>See all campaigns</span>
                {Icons.arrow}
              </Link>
            </div>
          </Container>
        </section>
      ) : (
        <section className="ap-pillars">
          <Container>
            <div className="ap-section-header">
              <p className="ap-eyebrow">Our Work</p>
              <h2 className="ap-section-title">Four pillars of change</h2>
              <p className="ap-section-desc">
                Every programme we run falls into one of four pillars — designed to give children
                the foundations for a healthy, hopeful life.
              </p>
            </div>

            <div className="ap-pillars-grid">
              {PROGRAMME_PILLARS.map((p, i) => (
                <div className="ap-pillar-col" key={i}>
                  <div className="ap-pillar-card">
                    <div className="ap-pillar-image-wrap">
                      <img src={p.image} alt={p.title} className="ap-pillar-image" loading="lazy" />
                      <div className="ap-pillar-icon-overlay">{p.icon}</div>
                    </div>
                    <div className="ap-pillar-body">
                      <h3 className="ap-pillar-title">{p.title}</h3>
                      <p className="ap-pillar-desc">{p.desc}</p>
                      <div className="ap-pillar-stat">
                        <span className="ap-pillar-stat-num">{p.stat}</span>
                        <span className="ap-pillar-stat-lbl">{p.statLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="ap-pillars-cta">
              <Link to="/campaigns" className="c4k-btn-primary-solid">
                <span>See all campaigns</span>
                {Icons.arrow}
              </Link>
            </div>
          </Container>
        </section>
      )}

      {/* ─── 5. IMPACT DARK BAND ────────────────────────── */}
      <section className="ap-impact">
        <Container>
          <div className="ap-impact-inner">
            <div className="ap-impact-header">
              <p className="ap-eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Our Impact</p>
              <h2 className="ap-impact-title">A decade of direct, measurable support</h2>
              <p className="ap-impact-sub">
                Every figure below is verified by independent audits and reported in our annual
                transparency report.
              </p>
            </div>
            <div className="ap-impact-grid">
              <div className="ap-impact-item">
                <span className="ap-impact-num">10,000+</span>
                <span className="ap-impact-lbl">Children supported</span>
              </div>
              <div className="ap-impact-item">
                <span className="ap-impact-num">50,000+</span>
                <span className="ap-impact-lbl">Meals served / year</span>
              </div>
              <div className="ap-impact-item">
                <span className="ap-impact-num">120+</span>
                <span className="ap-impact-lbl">Programmes run</span>
              </div>
              <div className="ap-impact-item">
                <span className="ap-impact-num">12</span>
                <span className="ap-impact-lbl">Provinces served</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── 6. CORE VALUES ─────────────────────────────── */}
      <section className="ap-values">
        <Container>
          <div className="ap-section-header">
            <p className="ap-eyebrow">How We Work</p>
            <h2 className="ap-section-title">Three values that guide everything</h2>
            <p className="ap-section-desc">
              These principles shape every programme, every partnership and every decision we make.
            </p>
          </div>
          <div className="ap-values-grid">
            {CORE_VALUES.map((v, i) => (
              <div key={i} className="ap-value-card">
                <div className="ap-value-icon">{v.icon}</div>
                <h3 className="ap-value-title">{v.title}</h3>
                <p className="ap-value-desc">{v.desc}</p>
                <div className="ap-value-metric">
                  <span className="ap-value-metric-num">{v.metric}</span>
                  <span className="ap-value-metric-lbl">{v.metricLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ─── 7. TIMELINE ────────────────────────────────── */}
      <section className="ap-timeline-section">
        <Container>
          <div className="ap-section-header">
            <p className="ap-eyebrow">Our Journey</p>
            <h2 className="ap-section-title">Milestones over the years</h2>
            <p className="ap-section-desc">
              Eleven years of consistent, transparent growth — one community at a time.
            </p>
          </div>
          <div className="ap-timeline">
            {TIMELINE.map((item, i) => (
              <div key={i} className="ap-timeline-item">
                <div className="ap-timeline-marker">
                  <div className="ap-timeline-dot" />
                </div>
                <div className="ap-timeline-content">
                  <span className="ap-timeline-year">{item.year}</span>
                  <h4 className="ap-timeline-title">{item.title}</h4>
                  <p className="ap-timeline-desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ─── 8. LEADERSHIP TEASER ───────────────────────── */}
      <section className="ap-leaders">
        <Container>
          <div className="ap-leaders-grid">
            <div className="ap-leaders-intro">
              <p className="ap-eyebrow">Leadership</p>
              <h2 className="ap-section-title">Meet the people behind the work</h2>
              <p className="ap-section-desc">
                Our leadership team combines decades of experience in social work, education,
                public health and nonprofit management — all committed to one mission.
              </p>
              <Link to="/about/team" className="c4k-btn-ghost-outline-dark">
                <span>Meet the full team</span>
                {Icons.arrow}
              </Link>
            </div>
            <div className="ap-leaders-cards">
              {LEADERS.map((l, i) => (
                <div key={i} className="ap-leader-card">
                  <div className="ap-leader-avatar" style={{ background: l.color }}>
                    {l.initials}
                  </div>
                  <h4 className="ap-leader-name">{l.name}</h4>
                  <p className="ap-leader-role">{l.role}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ─── 9. CTA / JOIN US ───────────────────────────── */}
      <section className="ap-join">
        <Container>
          <div className="ap-join-header">
            <p className="ap-eyebrow" style={{ color: 'var(--c4k-coral)' }}>Be Part of the Story</p>
            <h2 className="ap-section-title">Three ways you can help</h2>
            <p className="ap-section-desc">
              Whether you give, give time, or give expertise — every contribution creates real change.
            </p>
          </div>
          <div className="ap-join-grid">
            <div className="ap-join-card">
              <div className="ap-join-card-icon ap-join-icon-coral">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <h3 className="ap-join-title">Donate</h3>
              <p className="ap-join-desc">
                Every contribution, regardless of size, creates real impact in a child's life.
              </p>
              <Link to="/donate" className="c4k-btn-primary-solid">
                <span>Make a Donation</span>
                {Icons.arrow}
              </Link>
            </div>
            <div className="ap-join-card">
              <div className="ap-join-card-icon ap-join-icon-teal">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 className="ap-join-title">Volunteer</h3>
              <p className="ap-join-desc">
                Join our community of skilled volunteers helping us deliver programmes on the ground.
              </p>
              <Link to="/contact" className="c4k-btn-primary-solid">
                <span>Get Involved</span>
                {Icons.arrow}
              </Link>
            </div>
            <div className="ap-join-card">
              <div className="ap-join-card-icon ap-join-icon-gold">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/>
                </svg>
              </div>
              <h3 className="ap-join-title">Partner</h3>
              <p className="ap-join-desc">
                Organisations, foundations and businesses can partner with us to scale impact.
              </p>
              <Link to="/about/partners" className="c4k-btn-primary-solid">
                <span>Partner With Us</span>
                {Icons.arrow}
              </Link>
            </div>
          </div>
      </Container>
      </section>

    </div>
  );
}

export default AboutPage;
