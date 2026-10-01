import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { GALLERY_CATEGORIES } from '../data/galleryData';
import './GalleryPage.css';

// ── Icon mapping for categories that exist in the database. ──
// Falls back to a generic gallery icon when the API returns a
// category id that we don't have an icon for yet.
const ICON_FOR_CATEGORY = GALLERY_CATEGORIES.reduce((acc, c) => {
  if (c.id !== 'all') acc[c.id] = c.icon;
  return acc;
}, {});

/* ── Icon set (inline SVG) ─────────────────────────────── */
const ICONS = {
  gallery: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  book: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  heart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  droplet: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  ),
  people: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  lifebuoy: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/>
      <line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/>
    </svg>
  ),
  leaf: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96a1 1 0 0 1 1.8.66c0 9.84-5.7 14.38-10 14.38z"/>
      <path d="M2 21c0-3 1.85-5.36 5.08-6"/>
    </svg>
  ),
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  event: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  zoom: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  ),
  location: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
};

/* ── Lightbox ─────────────────────────────────────────── */
function GalleryLightbox({ item, onClose, onPrev, onNext, hasPrev, hasNext }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    if (item) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [item, onClose, onPrev, onNext, hasPrev, hasNext]);

  if (!item) return null;

  return (
    <div className="gp-lightbox" onClick={onClose}>
      {hasPrev && (
        <button className="gp-lightbox-nav gp-lightbox-prev" onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="Previous photo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      )}
      {hasNext && (
        <button className="gp-lightbox-nav gp-lightbox-next" onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="Next photo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      )}

      <div className="gp-lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="gp-lightbox-close" onClick={onClose} aria-label="Close lightbox">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="gp-lightbox-image-wrap">
          <img
            src={item.url}
            alt={item.alt || item.title}
            className="gp-lightbox-image"
            loading="eager"
          />
        </div>

        <div className="gp-lightbox-info">
          {item.category && (
            <span className={`gp-lightbox-cat gp-cat-${item.category}`}>
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </span>
          )}
          {item.title && <h3 className="gp-lightbox-title">{item.title}</h3>}
          {item.caption && <p className="gp-lightbox-desc">{item.caption}</p>}
          {item.location && (
            <div className="gp-lightbox-meta">
              {ICONS.location}
              <span>{item.location}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Gallery Item (card) ──────────────────────────────── */
function GalleryItem({ item, onClick }) {
  return (
    <button
      type="button"
      className={`gp-item gp-item-${item.layout}`}
      onClick={() => onClick(item)}
      aria-label={`View ${item.title}`}
    >
      <div className="gp-item-img-wrap">
        {/* Grid uses Cloudinary auto-generated thumbnail (w_300,h_300,c_fill)
            instead of the full PhotoUrl. This is the bandwidth-saving path.
            When the user clicks and opens the lightbox, the lightbox swaps to
            the original URL for the full-size view. */}
        <img
          src={item.thumbnail || item.url}
          alt={item.alt || item.title}
          loading="lazy"
          className="gp-item-img"
          onError={(e) => {
            // graceful fallback when a Cloudinary / external image 404s
            if (!e.currentTarget.dataset.fallback) {
              e.currentTarget.dataset.fallback = '1';
              e.currentTarget.src = `https://picsum.photos/seed/g${item.id}/600/450`;
            }
          }}
        />
        <div className="gp-item-overlay">
          <div className="gp-item-overlay-inner">
            <span className="gp-item-zoom">{ICONS.zoom}</span>
            <span className="gp-item-view-label">View story</span>
          </div>
        </div>
        <span className={`gp-item-cat-badge gp-cat-${item.category}`}>
          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
        </span>
      </div>

      <div className="gp-item-caption">
        <h3 className="gp-item-title">{item.title}</h3>
        {item.location && (
          <p className="gp-item-loc">
            {ICONS.location}
            <span>{item.location}</span>
          </p>
        )}
      </div>
    </button>
  );
}

/* ── Main Page ────────────────────────────────────────── */
function GalleryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [viewMode, setViewMode] = useState('masonry'); // masonry | grid

  /* ── Data ──
   * Single source of truth: the Gallery API → gallery table.
   * Public Gallery and Admin Gallery read the same records.
   * No parallel hardcoded dataset is mixed with real data.
   * The /api/v1/gallery endpoint already excludes soft-deleted
   * rows via the global query filter, so we don't have to filter
   * them here.
   */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // GET /api/v1/gallery returns:
      //   { success, message, data: { items, page, pageSize, totalCount } }
      // — after axios unwraps the v2.0 envelope, we get the inner data object.
      const payload = await api.get('/gallery', { params: { pageSize: 200, page: 1 } });
      const dbItems = Array.isArray(payload?.items) ? payload.items : [];

      // Map DB record → public item shape used by this page.
      // The DB is the single source of truth; we just adapt field names.
      const mapped = dbItems.map((row) => {
        const isFeatured = !!row.isFeatured;
        // Layout: featured items get 'wide' for visual emphasis,
        // every 4th item gets 'tall', the rest 'square'. The result is
        // a varied masonry even when all rows have the same DB shape.
        const layout = isFeatured ? 'wide' : 'square';
        const category = (row.category || '').toLowerCase() || 'community';
        const title = row.title || 'Untitled';
        const url = row.photoUrl || row.thumbnailUrl || '';
        return {
          id: row.galleryId,                 // numeric DB id
          galleryId: row.galleryId,
          url,
          thumbnail: row.thumbnail || row.thumbnailUrl || url,
          title,
          alt: title,
          caption: row.tags || '',
          location: '',                       // not stored in DB
          category,
          layout,
          isFeatured,
          uploadedAt: row.uploadedAt,
        };
      });

      setItems(mapped);
    } catch (err) {
      // Real error — never silently fall back to hardcoded sample data.
      console.error('Gallery fetch failed:', err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load gallery photos. Please try again in a moment.'
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  /* Filtered list */
  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items;
    return items.filter((i) => i.category === activeCategory);
  }, [items, activeCategory]);

  /* Counts per category — derived from REAL database records */
  const categoryCounts = useMemo(() => {
    const counts = { all: items.length };
    items.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return counts;
  }, [items]);

  /* ── Categories are derived from the items we just fetched.
   * That way, the public filter set is whatever the database
   * actually has. Each tab still picks up its icon/label from
   * the GALLERY_CATEGORIES catalog (UI styling only) so admins
   * adding new categories in the DB show up under a "community"
   * styled badge with a gallery icon until we add them to the
   * catalog.
   */
  const categoryTabs = useMemo(() => {
    const fromDb = Array.from(new Set(items.map((i) => i.category))).sort();
    return [
      { id: 'all', label: 'All Stories', icon: 'gallery' },
      ...fromDb.map((id) => {
        const known = GALLERY_CATEGORIES.find((c) => c.id === id);
        return {
          id,
          // Capitalize the first letter for display when we don't have a label
          label: known?.label || id.charAt(0).toUpperCase() + id.slice(1),
          icon: known?.icon || ICON_FOR_CATEGORY[id] || 'gallery',
        };
      }),
    ];
  }, [items]);

  /* Lightbox handlers */
  const openLightbox = (item) => {
    const idx = filteredItems.findIndex((i) => i.id === item.id);
    setLightboxIndex(idx >= 0 ? idx : 0);
  };
  const closeLightbox = () => setLightboxIndex(null);
  const prevLightbox = () => setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1));
  const nextLightbox = () => setLightboxIndex((i) => Math.min(filteredItems.length - 1, (i ?? 0) + 1));

  const lightboxItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;
  const hasPrev = lightboxIndex !== null && lightboxIndex > 0;
  const hasNext = lightboxIndex !== null && lightboxIndex < filteredItems.length - 1;

  /* Featured stats */
  const stats = useMemo(() => {
    const featured = items.filter((i) => i.layout === 'wide').length;
    const totalCategories = new Set(items.map((i) => i.category)).size;
    return { featured, totalCategories };
  }, [items]);

  return (
    <div className="gp-page">

      {/* ─── HERO ─────────────────────────────────────────── */}
      <section className="gp-hero">
        <div className="gp-hero-bg">
          <img
            src="https://res.cloudinary.com/mczqcagv/image/upload/v1790337412/giveaid/replacement/thieunhi-6226-1401513004_dqjcpq.webp"
            alt="Vietnamese schoolchildren studying"
          />
          <div className="gp-hero-overlay" />
        </div>
        <Container className="gp-hero-content">
          <p className="gp-hero-eyebrow">Impact Gallery</p>
          <h1 className="gp-hero-title">Moments That Matter</h1>
          <p className="gp-hero-sub">
            Real stories from the field — captured with care, used with consent, and shared to celebrate
            the resilience of children and communities across Vietnam.
          </p>

          <div className="gp-hero-stats">
            <div className="gp-hero-stat">
              <span className="gp-hero-stat-num">{items.length}</span>
              <span className="gp-hero-stat-lbl">Photographs</span>
            </div>
            <span className="gp-hero-stat-divider" />
            <div className="gp-hero-stat">
              <span className="gp-hero-stat-num">{stats.totalCategories}</span>
              <span className="gp-hero-stat-lbl">Programmes</span>
            </div>
            <span className="gp-hero-stat-divider" />
            <div className="gp-hero-stat">
              <span className="gp-hero-stat-num">{stats.featured}</span>
              <span className="gp-hero-stat-lbl">Featured Stories</span>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── FILTER BAR ──────────────────────────────────── */}
      <section className="gp-filters-section">
        <Container>
          <div className="gp-filters">
            <div className="gp-tabs">
              {categoryTabs.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`gp-tab ${activeCategory === cat.id ? 'is-active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span className="gp-tab-icon">{ICONS[cat.icon] || ICONS.gallery}</span>
                  <span className="gp-tab-label">{cat.label}</span>
                  <span className="gp-tab-count">{categoryCounts[cat.id] || 0}</span>
                </button>
              ))}
            </div>

            <div className="gp-view-toggle" role="tablist" aria-label="View mode">
              <button
                type="button"
                className={`gp-view-btn ${viewMode === 'masonry' ? 'is-active' : ''}`}
                onClick={() => setViewMode('masonry')}
                aria-pressed={viewMode === 'masonry'}
                aria-label="Masonry view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
              </button>
              <button
                type="button"
                className={`gp-view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                aria-label="Grid view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {!loading && !error && filteredItems.length > 0 && (
            <p className="gp-results-info">
              Showing <strong>{filteredItems.length}</strong> photo{filteredItems.length !== 1 ? 's' : ''}
              {activeCategory !== 'all' && (
                <> in <strong>{categoryTabs.find((c) => c.id === activeCategory)?.label}</strong></>
              )}
            </p>
          )}
        </Container>
      </section>

      {/* ─── GRID ────────────────────────────────────────── */}
      <section className="gp-content">
        <Container>
          {loading ? (
            <div className="gp-loading">
              <div className="gp-spinner" />
              <p>Loading photos…</p>
            </div>
          ) : error ? (
            <div className="gp-empty">
              <div className="gp-empty-icon-wrap">{ICONS.gallery}</div>
              <h4>Couldn't load photos</h4>
              <p>{error}</p>
              <button type="button" className="c4k-btn-primary-solid" onClick={fetchItems}>
                Try Again
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="gp-empty">
              <div className="gp-empty-icon-wrap">{ICONS.gallery}</div>
              <h4>No photos in this category</h4>
              <p>Try selecting another category to see more stories.</p>
              <button type="button" className="c4k-btn-primary-solid" onClick={() => setActiveCategory('all')}>
                View All Stories
              </button>
            </div>
          ) : (
            <div className={`gp-grid gp-grid-${viewMode}`}>
              {filteredItems.map((item) => (
                <GalleryItem key={item.id} item={item} onClick={openLightbox} />
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* ─── CTA ─────────────────────────────────────────── */}
      <section className="gp-cta">
        <Container className="text-center">
          <p className="gp-cta-eyebrow">Be Part of the Story</p>
          <h2 className="gp-cta-title">Every photo is a life touched by your support</h2>
          <p className="gp-cta-sub">
            Help us continue documenting, supporting and uplifting children and communities across Vietnam.
          </p>
          <div className="gp-cta-actions">
            <Link to="/donate" className="c4k-btn-primary-solid c4k-btn-lg">
              <svg className="c4k-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span>Donate Now</span>
            </Link>
            <Link to="/campaigns" className="c4k-btn-ghost-outline-dark c4k-btn-lg">
              <span>View Campaigns</span>
              <svg className="c4k-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </div>
        </Container>
      </section>

      <GalleryLightbox
        item={lightboxItem}
        onClose={closeLightbox}
        onPrev={prevLightbox}
        onNext={nextLightbox}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />

    </div>
  );
}

export default GalleryPage;
