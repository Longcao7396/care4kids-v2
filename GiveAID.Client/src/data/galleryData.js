// Gallery categories — UI metadata only.
//
// IMPORTANT (Oct 1, 2026): The actual gallery images are NOT loaded from
// this file anymore. The single source of truth is the backend's
// /api/v1/gallery endpoint, which reads from the `gallery` SQL table.
//
// The same records are now shared between Admin Gallery (CMS management)
// and Public Gallery (gallery page) — both call the same API and see the
// same data.
//
// This file is retained for two reasons only:
//   1. `GALLERY_CATEGORIES` — provides icon + display label for each
//      canonical category id (used by the public filter tabs).
//   2. `GALLERY_IMAGES`    — DEPRECATED hardcoded fallback array. Kept
//      exported only for offline / development use. It is NEVER mixed with
//      real database records in production data flow.
//
// The GALLERY_IMAGES content below was recovered from git history
// (commit c13391f — "refactor: update React frontend - pages, components,
// and services") and represents the previous English-language gallery
// presentation. These 20 well-curated items use Cloudinary-hosted URLs
// and English titles such as:
//   - Mountain Classrooms — Knowledge for the Highlands
//   - Central Vietnam Flood Relief — Standing With Our Communities
//   - Everyday Joy at the Care Home
//   - Mobile Health Checkups in Remote Villages
//   - Reading Hour at the Village Library
//   - Measles Vaccination Drive
//   - Clean Water Wells for Mountain Villages
//   - Charity Run — Steps for Children
//   - Voices for Children Benefit Concert
//   - … and 11 more
// They serve as a documentation / development reference for the old
// English gallery copy. The Public Gallery page does NOT read from this
// array at runtime — it fetches /api/v1/gallery instead.

export const GALLERY_CATEGORIES = [
  { id: 'all',         label: 'All Stories',  icon: 'gallery' },
  { id: 'education',   label: 'Education',    icon: 'book' },
  { id: 'health',      label: 'Health',       icon: 'heart' },
  { id: 'water',       label: 'Clean Water',  icon: 'droplet' },
  { id: 'community',   label: 'Community',    icon: 'people' },
  { id: 'relief',      label: 'Relief',       icon: 'lifebuoy' },
  { id: 'environment', label: 'Environment',  icon: 'leaf' },
  { id: 'portraits',   label: 'Portraits',    icon: 'user' },
  { id: 'events',      label: 'Events',       icon: 'event' },
];

// DEPRECATED: Hardcoded fallback dataset, no longer used by production data flow.
// Public Gallery fetches live records from /api/v1/gallery.
// Admin Gallery performs real CRUD against the same endpoint.
//
// Source policy (recovered from commit c13391f):
//   - All URLs are Cloudinary-hosted (`res.cloudinary.com/mczqcagv`).
//   - Each item carries `publicId` so the AdminGalleryPage Cloudinary preview
//     can render the asset even when the API is unreachable.
//   - Layouts are tagged as 'wide' (16:9 hero), 'tall' (4:5 portrait),
//     or 'square' (1:1 thumbnail) to drive the masonry layout.
export const GALLERY_IMAGES = [
  // ─── WIDE / HERO ──────────────────────────────────────────────
  {
    id: 'g-001',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337357/giveaid/replacement/thieunhi9-2869-1401513005_chlpkd.webp',
    publicId: 'giveaid/replacement/thieunhi9-2869-1401513005_chlpkd',
    title: 'Mountain Classrooms — Knowledge for the Highlands',
    caption: 'Children in the northern highlands of Vietnam learn to read in a community classroom built and supported by Care4Kids.',
    location: 'Lao Cai, Vietnam',
    category: 'education',
    layout: 'wide',
    alt: 'Vietnamese schoolchildren studying in a rural classroom',
  },
  {
    id: 'g-002',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337373/giveaid/replacement/9-1631871700_yocxhv.webp',
    publicId: 'giveaid/replacement/9-1631871700_yocxhv',
    title: 'Central Vietnam Flood Relief — Standing With Our Communities',
    caption: 'Relief teams distribute food and household supplies to families rebuilding their homes after a typhoon.',
    location: 'Quang Binh, Vietnam',
    category: 'relief',
    layout: 'wide',
    alt: 'Disaster relief aid distribution in a flood-affected village',
  },

  // ─── TALL / PORTRAIT ─────────────────────────────────────────
  {
    id: 'g-003',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337417/giveaid/replacement/6.2-1_emufuw.jpg',
    publicId: 'giveaid/replacement/6.2-1_emufuw',
    title: 'Everyday Joy at the Care Home',
    caption: 'A child at the Binh Duong care home shares a laugh with a volunteer during the Mid-Autumn celebration.',
    location: 'Binh Duong, Vietnam',
    category: 'portraits',
    layout: 'tall',
    alt: 'Smiling Vietnamese child at a care home',
  },
  {
    id: 'g-004',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337355/giveaid/replacement/thieunhi11-6736-1401513005_qhyasf.webp',
    publicId: 'giveaid/replacement/thieunhi11-6736-1401513005_qhyasf',
    title: 'Mobile Health Checkups in Remote Villages',
    caption: 'Volunteer doctors travel to remote villages to provide free health screenings for children and their families.',
    location: 'Nghe An, Vietnam',
    category: 'health',
    layout: 'tall',
    alt: 'Community health worker checkup for village children',
  },
  {
    id: 'g-005',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337360/giveaid/replacement/thieunhi10-5429-1401513005_gxt9br.webp',
    publicId: 'giveaid/replacement/thieunhi10-5429-1401513005_gxt9br',
    title: 'Reading Hour at the Village Library',
    caption: 'A free reading space built from a recycled shipping container gives rural children their first library.',
    location: 'Bac Kan, Vietnam',
    category: 'education',
    layout: 'tall',
    alt: 'Children reading books at a rural community library',
  },
  {
    id: 'g-006',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337359/giveaid/replacement/thieunhi12-3723-1401513005_k7ekiw.webp',
    publicId: 'giveaid/replacement/thieunhi12-3723-1401513005_k7ekiw',
    title: 'Measles Vaccination Drive',
    caption: 'A regional vaccination campaign reaches 800 children under five in Quang Nam province.',
    location: 'Quang Nam, Vietnam',
    category: 'health',
    layout: 'tall',
    alt: 'Child vaccination at a rural clinic',
  },

  // ─── SQUARE / STANDARD ───────────────────────────────────────
  {
    id: 'g-007',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337412/giveaid/replacement/thieunhi-6226-1401513004_dqjcpq.webp',
    publicId: 'giveaid/replacement/thieunhi-6226-1401513004_dqjcpq',
    title: 'Daily Learning in the Highlands',
    caption: 'A morning study session at one of our partner schools in the northern mountains.',
    location: 'Son La, Vietnam',
    category: 'education',
    layout: 'square',
    alt: 'Children studying together at a highland school',
  },
  {
    id: 'g-008',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337416/giveaid/replacement/6.1-1_byrdld.jpg',
    publicId: 'giveaid/replacement/6.1-1_byrdld',
    title: 'Clean Water Wells for Mountain Villages',
    caption: 'A newly drilled well now provides safe drinking water for 120 households in the highland community.',
    location: 'Son La, Vietnam',
    category: 'water',
    layout: 'square',
    alt: 'Children fetching clean water from a village well',
  },
  {
    id: 'g-009',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337418/giveaid/replacement/8-1_dub1wh.jpg',
    publicId: 'giveaid/replacement/8-1_dub1wh',
    title: 'A New Day at the Boarding School',
    caption: 'Students at the boarding school start the morning with shared chores and breakfast in the garden.',
    location: 'Hanoi, Vietnam',
    category: 'community',
    layout: 'square',
    alt: 'Children starting their day at a boarding school',
  },
  {
    id: 'g-010',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337419/giveaid/replacement/1000009589_Photo-No.-4_kbt98c.webp',
    publicId: 'giveaid/replacement/1000009589_Photo-No.-4_kbt98c',
    title: 'Volunteers Supporting Our Children',
    caption: 'International volunteers spend their weekends teaching English and life skills to children across the region.',
    location: 'Binh Duong, Vietnam',
    category: 'community',
    layout: 'square',
    alt: 'Volunteers teaching children outdoors',
  },
  {
    id: 'g-011',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337421/giveaid/replacement/3R-2935-1405048038_ukg4qf.webp',
    publicId: 'giveaid/replacement/3R-2935-1405048038_ukg4qf',
    title: 'Emergency Relief Distribution',
    caption: 'Relief workers organize food parcels and medicine for families displaced by severe flooding.',
    location: 'Nghe An, Vietnam',
    category: 'relief',
    layout: 'square',
    alt: 'Relief workers preparing emergency supplies',
  },
  {
    id: 'g-012',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337422/giveaid/replacement/4R-6525-1405048038_fqstad.webp',
    publicId: 'giveaid/replacement/4R-6525-1405048038_fqstad',
    title: 'Caring for Our Youngest',
    caption: 'Caregivers provide daily support, nutrition, and education for children living in our partner shelters.',
    location: 'Ha Tinh, Vietnam',
    category: 'community',
    layout: 'square',
    alt: 'Caregivers supporting children at a community shelter',
  },

  // ─── MORE PORTRAITS / CANDID ────────────────────────────────
  {
    id: 'g-013',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337414/giveaid/replacement/senh1-7468-1396341888_qrbxq7.webp',
    publicId: 'giveaid/replacement/senh1-7468-1396341888_qrbxq7',
    title: 'Portrait of a Highland Child',
    caption: 'The bright eyes of a six-year-old student at the Muong Khuong school outpost.',
    location: 'Lao Cai, Vietnam',
    category: 'portraits',
    layout: 'tall',
    alt: 'Close-up portrait of a rural Vietnamese child',
  },
  {
    id: 'g-014',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337413/giveaid/replacement/hong-3448-1396341887_d4zral.webp',
    publicId: 'giveaid/replacement/hong-3448-1396341887_d4zral',
    title: 'A Family After the Checkup',
    caption: 'A mother and her child leave the free community health screening held in June.',
    location: 'Ben Tre, Vietnam',
    category: 'portraits',
    layout: 'square',
    alt: 'Vietnamese mother and child at a community health program',
  },
  {
    id: 'g-015',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337423/giveaid/replacement/7R-1890-1405048039_lhirih.webp',
    publicId: 'giveaid/replacement/7R-1890-1405048039_lhirih',
    title: 'Installing a New Water Tank',
    caption: 'Our technical team hands over a 2,000-litre water system to a primary school near the border.',
    location: 'Lai Chau, Vietnam',
    category: 'water',
    layout: 'square',
    alt: 'Water tank installation at a rural primary school',
  },
  {
    id: 'g-016',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337426/giveaid/replacement/A8E-0594-6211-1432085078_cpjudt.webp',
    publicId: 'giveaid/replacement/A8E-0594-6211-1432085078_cpjudt',
    title: 'The Joy of Childhood',
    caption: 'Children share a moment of laughter during an outdoor play session at the community centre.',
    location: 'Thua Thien Hue, Vietnam',
    category: 'environment',
    layout: 'tall',
    alt: 'Children laughing during outdoor play',
  },
  {
    id: 'g-017',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337437/giveaid/replacement/N8H-0077-1-8032-1432085080_xfujn5.webp',
    publicId: 'giveaid/replacement/N8H-0077-1-8032-1432085080_xfujn5',
    title: 'Charity Run — Steps for Children',
    caption: 'More than 2,000 runners joined our annual fundraising run at Le Thi Rieng Park.',
    location: 'Ho Chi Minh City, Vietnam',
    category: 'events',
    layout: 'wide',
    alt: 'Charity fun run event crowd outdoors',
  },
  {
    id: 'g-018',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337429/giveaid/replacement/A8E-2596-5516-1432085079_xpm8x6.webp',
    publicId: 'giveaid/replacement/A8E-2596-5516-1432085079_xpm8x6',
    title: 'Voices for Children Benefit Concert',
    caption: 'A music gala featuring well-known artists raises 1.5 billion VND for our children programmes.',
    location: 'Ho Binh Theatre, Ho Chi Minh City',
    category: 'events',
    layout: 'square',
    alt: 'Fundraising gala event with smiling attendees',
  },
  {
    id: 'g-019',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337428/giveaid/replacement/A8E-1590c1-6268-1432085078_rvmhan.webp',
    publicId: 'giveaid/replacement/A8E-1590c1-6268-1432085078_rvmhan',
    title: 'Building Homes for Families in Need',
    caption: 'Volunteer crews complete 12 solidarity homes ahead of the storm season.',
    location: 'Quang Nam, Vietnam',
    category: 'community',
    layout: 'square',
    alt: 'Volunteers building a solidarity home',
  },
  {
    id: 'g-020',
    url: 'https://res.cloudinary.com/mczqcagv/image/upload/v1790337420/giveaid/replacement/21-7928-1405413891_lgjwss.webp',
    publicId: 'giveaid/replacement/21-7928-1405413891_lgjwss',
    title: 'Free Medicine for Elderly Communities',
    caption: 'Our community health programme distributes free medication to 300 elderly people in difficult circumstances.',
    location: 'Da Nang, Vietnam',
    category: 'community',
    layout: 'tall',
    alt: 'Community health team distributing free medicine',
  },
];
