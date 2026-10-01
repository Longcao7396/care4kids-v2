# CMS Pages vs Site Settings — Audit Report

**Project:** Care4Kids / GiveAID v2 (NGO donation management)
**Audit date:** 2026-09-30
**Scope:** Read-only audit. No code or database changes were made.
**Conclusion (TL;DR):** There is **no real Site Settings backend** in this codebase. What is labelled "Site Settings" in the admin is a UI facade that calls the **same** `/api/v1/cms/pages` endpoint that "CMS Pages" uses. The duplication is **near-complete at the admin UI level** and **total at the data/API level** — there is literally one source of truth (`cms_pages` table) being reached via three different admin entry points.

---

## 1. Executive Summary

**Classification: Partial duplication — but the "duplication" is the result of one module being misnamed, not two competing implementations.**

What the user perceives as two modules ("CMS Pages" and "Site Settings") is in fact:

1. **One** database table: `cms_pages`.
2. **One** controller: `CmsPagesController` at `[Route("api/v1/cms")]`.
3. **One** set of CQRS handlers: `GetAllCmsPagesQuery`, `GetCmsPageBySlugQuery`, `CreateCmsPageCommand`, `UpdateCmsPageCommand`.
4. **Two** admin entry points that both consume the same `/api/v1/cms/pages` endpoint, plus a **legacy wrapper route** that simply re-renders the CMS hub.

There is **no** `SiteSettings` entity, table, controller, DbSet, handler, or migration. The name "Site Settings" is only a UI label on top of the existing `cms_pages` machinery.

The most important findings:

- The admin sidebar has **two entries** in the "Content" group: `/admin/cms` labelled "CMS Pages" and `/admin/about` labelled "Site Settings" — but `/admin/about` is a legacy wrapper that just renders `AdminCmsPage`.
- `AdminCmsPage` (the unified Content Management Center) contains a tab called **"Site Settings"** which renders `AdminSiteSettings.js`, a card-grid editor that calls the same `/api/v1/cms/pages` API.
- `AdminSiteSettings.js` is **strictly a subset** of `CmsPagesAdmin.js`. It restricts the editor to five hard-coded keys (`privacy_policy, terms_of_service, help_centre, about_us, contact_info`) and exposes a smaller field set (`pageTitle`, `content`, `metaDescription`). All writes still go through the same controller and the same table.
- "Global site configuration" in the classic sense (site name, logo URL, favicon, contact phone, currency, maintenance mode, etc.) **does not exist anywhere** in this project. Those values are hard-coded in the React components (`config.js`, `Footer.js`, `Navbar.js`, `public/index.html`) and in `ContactPage.js` defaults.

So the "overlap" is not "two implementations that store the same data" — it is "one implementation that has been labelled twice, plus a piece of dead-code UI routing".

---

## 2. CMS Pages Architecture (Actual Data Flow)

```
Admin: AdminCmsPage (/admin/cms)
  └─ tab "About Pages" → CmsPagesAdmin.js
       ├─ GET    /api/v1/cms/pages             → CmsPagesController.GetPages
       ├─ POST   /api/v1/cms/pages             → CmsPagesController.Create
       └─ PUT    /api/v1/cms/pages/{id}        → CmsPagesController.Update

  └─ tab "Site Settings" → AdminSiteSettings.js
       ├─ GET    /api/v1/cms/pages?keys=...    → CmsPagesController.GetPages (filtered)
       └─ PUT    /api/v1/cms/pages/{id}        → CmsPagesController.Update

  └─ tab "Contact Info" → AdminContactInfo.js
       ├─ GET    /api/v1/cms/pages?includeInactive=true → CmsPagesController.GetPages
       └─ PUT    /api/v1/cms/pages/{id}                    → CmsPagesController.Update

Backend controller — src/WebApi/Controllers/CmsPagesController.cs
  [Route("api/v1/cms")]
  ├─ GET    /pages                              AllowAnonymous   GetAllCmsPagesQuery (+ optional keys filter)
  ├─ GET    /pages/{keyOrSlug}                  AllowAnonymous   GetCmsPageBySlugQuery (slug → key fallback)
  ├─ POST   /pages                              Admin/ContentManager   CreateCmsPageCommand
  ├─ PUT    /pages/{id}                         Admin/ContentManager   UpdateCmsPageCommand
  └─ DELETE /pages/{id}                         RequireAdmin (returns 501 Not Implemented)

Domain — src/Domain/Entities/CmsPage.cs
  Table "cms_pages"
  Columns:
    page_id           INT IDENTITY PK
    page_key          VARCHAR(50)  UNIQUE NOT NULL
    page_slug         VARCHAR(100) UNIQUE NULL
    page_title        NVARCHAR(100) NOT NULL
    content           NVARCHAR(MAX) NULL
    meta_description  NVARCHAR(255) NULL
    meta_keywords     NVARCHAR(255) NULL
    is_active         BIT NOT NULL DEFAULT 1
    is_in_menu        BIT NOT NULL DEFAULT 1
    parent_page_id    INT NULL          → FK cms_pages.page_id
    display_order     INT NOT NULL DEFAULT 0
    updated_by        INT NULL          → FK users.user_id
    created_at        DATETIME NOT NULL DEFAULT GETDATE()
    updated_at        DATETIME NULL
    (from BaseEntity) is_deleted, deleted_at, created_by, updated_by (added in migration 20260927114547_AddAuditFields)

EF mapping — src/Infrastructure/Persistence/Configurations/CmsPageConfiguration.cs
  ToTable("cms_pages")
  HasIndex(PageKey).IsUnique()
  HasIndex(PageSlug)

DbContext — src/Infrastructure/Persistence/GiveAIDDbContext.cs
  DbSet<CmsPage> CmsPages

Seed data — three layers (only one runs in any given environment, see §10):
  1. database/01_CreateDatabase_V2.sql  → 11 CMS rows (home, about_us, what_we_do, our_mission, our_team, careers, achievements, contact_us, help_centre, privacy_policy, terms_of_service)
  2. src/Infrastructure/Persistence/Seed/SeedData.cs  → SeedCmsPagesAsync (home, about_us, contact, privacy_policy, terms_of_service) + SeedExtraCmsPagesAsync (our_mission, what_we_do, contact_info)
  3. archive/sql-migrations/NGO_Database_CMS_Content_Migration.sql  → 5 rows with full content (about_us, contact_info, help_centre, privacy_policy, terms_of_service)

Authorization:
  - Read (GET) is AllowAnonymous (public).
  - Write (POST/PUT) requires Admin or ContentManager role.
  - Delete (DELETE) is RequireAdmin but returns 501 Not Implemented in the controller.
```

**Fields — what each actually represents (verified from usage, not from name):**

- `PageId` — surrogate integer PK.
- `PageKey` — stable, unique, lowercase identifier (`about_us`, `privacy_policy`, `contact_info`, `our_mission`, `what_we_do`, `our_team`, etc.). Used as the canonical handle that the frontend queries by and that seed/upsert scripts look up by.
- `PageSlug` — optional URL slug. Currently only used by `GetCmsPageBySlugQueryHandler` and the controller's GET-by-key fallback. Public AboutPage, ContactPage and OurTeamPage query by *key*, not by slug.
- `PageTitle` — heading rendered at the top of the public page section when no override is present (e.g. ContactPage uses `cmsPage.pageTitle`).
- `Content` — the *only* field the public frontend actually displays. Stored as HTML and sanitised by `utils/safeHtml#sanitizeHtml` before `dangerouslySetInnerHTML`.
- `MetaDescription` / `MetaKeywords` — accepted by the create/update handlers and persisted, but **not consumed by any public page or in `useEffect` of any page component** (verified by grep across `GiveAID.Client/src/pages/**/*.js`). Effectively write-only.
- `IsActive` — toggles visibility in public queries (default `true`).
- `IsInMenu` — not consumed by the current frontend nav (the menu is hard-coded in `Navbar.js`); used only as a display badge inside `CmsPagesAdmin.js`.
- `ParentPageId` — declared FK self-reference but unused by any handler or controller method.
- `DisplayOrder` — used to order rows in `GetAllCmsPagesQueryHandler`.
- `UpdatedBy` — stored but unused; `CreatedBy/UpdatedBy` are set by `GiveAIDDbContext.SaveChangesAsync` for soft-delete/audit trail.

**Is the data editable?** Yes — POST/PUT work; UI confirms on save.
**Is it persisted?** Yes — `cms_pages` table in `GiveAIDDB`.
**Public consumers:** `AboutPage` (keys: `what_we_do`, `our_mission`), `ContactPage` (key: `contact_info`), `OurTeamPage` (key: `our_team`).

---

## 3. Site Settings Architecture (Actual Data Flow)

```
There is NO Site Settings backend.

The label "Site Settings" exists only in two places:
  A) GiveAID.Client/src/layouts/AdminLayout.js
       nav entry: { to: '/admin/about', label: 'Site Settings', icon: 'settings' }
  B) GiveAID.Client/src/pages/admin/AdminCmsPage.js
       tab:       { key: 'settings', label: 'Site Settings', icon: 'bi-gear-fill' }

A) /admin/about → AdminAboutPage.js
   — a 24-line file whose entire body is `return <AdminCmsPage />`
   — declared "Legacy wrapper for /admin/about" in its own comment
   — the same admin canvas page that /admin/cms renders

B) tab "Site Settings" → AdminSiteSettings.js
   — calls the EXACT SAME /api/v1/cms/pages endpoint
   — hard-coded filter: keys = 'privacy_policy,terms_of_service,help_centre,about_us,contact_info'
   — exposes a 3-field editor (pageTitle, content, metaDescription)
   — writes via PUT /api/v1/cms/pages/{pageId}

There is no separate endpoint, controller, DbSet, entity, table, migration, or seed for "Site Settings".
```

**Search-verified absences (no false positives):**

- `src/**/*.cs` search for `SiteSetting|site_setting|WebsiteSetting|GlobalSetting` → 0 matches.
- `database/**/*.sql`, `scripts/sql/**/*.sql`, `archive/sql-migrations/**/*.sql` → 0 matches.
- `GiveAID.Client/**` search for `site-setting` (kebab), `siteSetting` (camel), `SiteSettings` (Pascal) → 0 matches except inside `AdminSiteSettings.js` (the file *name*, not the *concept*).
- `IApplicationDbContext.cs` enumerates every DbSet; only `CmsPages` exists.
- `GiveAIDDbContext.cs` enumerates every DbSet; only `CmsPages` exists.
- `docs/API_REFERENCE.md` documents only `CMS (/api/v1/cms/pages)`; no Site Settings section.
- `tests/**/*.cs` → 0 references to either CMS or SiteSettings fixtures.

So "Site Settings" is **purely a UI label**. The endpoint, table and seed are the same `cms_pages` data already covered in §2.

**Does any public page consume "Site Settings" data?** Indirectly yes, but only because "Site Settings" is the same table. `ContactPage` uses `contact_info`; `AboutPage` uses `what_we_do` and `our_mission`. The tab labelled "Site Settings" in the admin edits exactly the same rows that `AdminCmsPage`'s "About Pages" tab also edits.

**Is "Site Settings" data cached anywhere?** No. No `MemoryCacheService`, no `IDistributedCache` usage references SiteSettings. (CMS GETs use the default `IMemoryCache` only because some controllers cache other endpoints, but the `CmsPagesController` itself does not declare caching.)

**Is anything hard-coded outside the DB?** Yes, extensively — see §6.

---

## 4. Side-by-Side Comparison

### Inventory

| Layer | CMS Pages | "Site Settings" |
|---|---|---|
| Frontend route | `/admin/cms` | `/admin/about` (legacy wrapper → renders `AdminCmsPage`) |
| Frontend component | `AdminCmsPage.js` + `CmsPagesAdmin.js` | `AdminAboutPage.js` (24-line wrapper) → `AdminCmsPage.js` + tab → `AdminSiteSettings.js` |
| Service | `cmsService` in `services/index.js` | `cmsService` (same — `AdminSiteSettings.js` uses `api.get('/cms/pages', …)` directly) |
| Controller | `CmsPagesController` | None — same controller |
| Handler(s) | `GetAllCmsPagesQuery`, `GetCmsPageBySlugQuery`, `CreateCmsPageCommand`, `UpdateCmsPageCommand` | None — same handlers |
| Entity | `CmsPage` | None |
| DbSet | `CmsPages` | None |
| Database table | `cms_pages` | None — same table |
| Endpoint | `GET/POST /api/v1/cms/pages`, `GET /cms/pages/{keyOrSlug}`, `PUT /cms/pages/{id}`, `DELETE /cms/pages/{id}` | Same endpoints (only `GET /cms/pages?keys=…` and `PUT /cms/pages/{id}` are exercised by the tab) |
| Authorization | Read public; write Admin/ContentManager; delete Admin (501) | Same |
| Seed | 3 layers (see §10) | None |

### Field / concept comparison

The table below compares the **logical concepts** an admin might expect in a Site Settings module vs what `cms_pages` actually stores. The user's question implied that Site Settings contains things like Site Name, Logo, Phone, etc. — those are **not present** in either module. They are only present in hard-coded React values (see §6).

| Concept | CMS Pages (`cms_pages`) | Site Settings (admin tab) | Same data source? | Same meaning? | Where actually stored |
|---|---|---|---|---|---|
| `pageKey` (e.g. `privacy_policy`) | ✓ column | ✓ query filter | Yes — same row | Yes | `cms_pages.page_key` |
| `pageSlug` | ✓ column | ✗ hidden by tab UI | Yes | Yes | `cms_pages.page_slug` |
| `pageTitle` | ✓ column | ✓ editable in tab | Yes | Yes | `cms_pages.page_title` |
| `content` (HTML body) | ✓ column | ✓ editable in tab | Yes | Yes | `cms_pages.content` |
| `metaDescription` | ✓ column | ✓ editable in tab | Yes | Yes | `cms_pages.meta_description` |
| `metaKeywords` | ✓ column | ✗ hidden by tab UI | Yes | Yes | `cms_pages.meta_keywords` |
| `isActive` | ✓ column | ✗ hidden by tab UI | Yes | Yes | `cms_pages.is_active` |
| `isInMenu` | ✓ column | ✗ hidden by tab UI | Yes | Yes | `cms_pages.is_in_menu` |
| `displayOrder` | ✓ column | ✗ hidden by tab UI | Yes | Yes | `cms_pages.display_order` |
| `parentPageId` | ✓ column | ✗ never set | Yes | Yes | `cms_pages.parent_page_id` |
| Site Name / Brand | ✗ | ✗ | n/a | n/a | **Hard-coded** — `Navbar.js` (`Care4Kids_logo_clean.svg`), `Footer.js`, `public/index.html` (`<title>Care4Kids — Children's Welfare & Donation</title>`), `config.js` (`APP_NAME = 'Care4Kids'`, but never imported anywhere) |
| Logo | ✗ | ✗ | n/a | n/a | **Hard-coded** — `/images/branding/Care4Kids_logo_clean.svg` referenced from `Navbar.js`, `Footer.js`, `AdminLayout.js` |
| Favicon | ✗ | ✗ | n/a | n/a | **Hard-coded** — `public/index.html` `<link rel="icon" href="%PUBLIC_URL%/favicon.ico" />` and `public/favicon.ico` |
| Phone | ✗ | ✗ | n/a | n/a | **Hard-coded** — `ContactPage.js` `defaultContact.phone = '1800-123-456'` (no longer in use); `contact_info` CMS row content carries the *real* phone number as HTML |
| Email | ✗ | ✗ | n/a | n/a | **Hard-coded** — `ContactPage.js` `defaultContact.email = 'info@care4kids.org'` |
| Address | ✗ | ✗ | n/a | n/a | **Hard-coded in component** (`ContactPage.js` `contactChannels` array); also baked into `contact_info` CMS row content |
| Hours | ✗ | ✗ | n/a | n/a | **Hard-coded** — `ContactPage.js` `defaultContact.hours` |
| Social Links | ✗ | ✗ | n/a | n/a | **Hard-coded** — `Footer.js` (`facebook.com`, `instagram.com`, `linkedin.com`, `youtube.com` — root URLs, no handles); also inside `contact_info` CMS row content |
| Footer text / mission | ✗ | ✗ | n/a | n/a | **Hard-coded** — `Footer.js` `<p className="c4k-footer-mission">…</p>` and `c4k-footer-bottom` copyright |
| Copyright | ✗ | ✗ | n/a | n/a | **Hard-coded** — `Footer.js` `&copy; {currentYear} Care4Kids. A registered charity.` |
| Privacy Policy body | ✓ (pageKey `privacy_policy`) | ✓ editable in tab | Yes — same row | Yes | `cms_pages.content` for key=`privacy_policy` |
| Terms of Service body | ✓ (pageKey `terms_of_service`) | ✓ editable in tab | Yes — same row | Yes | `cms_pages.content` for key=`terms_of_service` |
| About Us main page | ✓ (pageKey `about_us`) | ✓ editable in tab (shown as "About Us Page") | Yes — same row | Yes | `cms_pages.content` for key=`about_us` |
| Help Centre body | ✓ (pageKey `help_centre`) | ✓ editable in tab | Yes — same row | Yes | `cms_pages.content` for key=`help_centre` |
| Contact Info body | ✓ (pageKey `contact_info`) | ✓ editable in tab | Yes — same row | Yes | `cms_pages.content` for key=`contact_info` |
| Maintenance Mode | ✗ | ✗ | n/a | n/a | Does not exist |
| Currency | ✗ | ✗ | n/a | n/a | Does not exist (donations use the gateway's currency) |
| Donation Minimum | ✗ | ✗ | n/a | n/a | Does not exist as a setting; the donation form hard-codes minimums (if at all) |
| SEO Title / Meta Description | partially — stored per page | partially — same storage | Yes | Yes | `cms_pages.meta_description`, `cms_pages.meta_keywords` — but **not consumed** anywhere in the public frontend (no `<Helmet>`, no `react-helmet`, no manual `document.title` calls referencing these) |

**Conclusion of the comparison:** every field that *does* exist is stored in one place (`cms_pages`). The "Site Settings" tab is a strictly narrower view onto the same table.

---

## 5. Duplicate / Overlapping Fields

| Field | Both UIs expose it? | Writes to same row? | Risk if both used simultaneously? |
|---|---|---|---|
| `pageTitle` | Yes — in `CmsPagesAdmin` (edit modal) and `AdminSiteSettings` (edit modal) | Yes — same `cms_pages` row | Last writer wins. Both editors read the same row immediately before PUT, so unsaved concurrent edits in two browser tabs can clobber each other (general EF concurrency caveat — there is no `RowVersion` column on `cms_pages`). |
| `content` | Yes — both | Yes | Same as above. |
| `metaDescription` | Yes — both | Yes | Same as above. |
| `pageSlug` | `CmsPagesAdmin` only | n/a | None unique to the "Site Settings" tab. |
| `metaKeywords`, `isActive`, `isInMenu`, `displayOrder`, `parentPageId`, `pageKey` | `CmsPagesAdmin` only | n/a | "Site Settings" tab cannot edit them. This is a *feature gap*, not a duplication. |

**Important behavioural note:** if an admin opens `CmsPagesAdmin`, edits row id 7 (`privacy_policy`), changes `isActive=false` and adds keywords, then opens `AdminSiteSettings` and edits only `content`/`pageTitle`/`metaDescription`, the second save **will overwrite** `pageKey`, `metaKeywords`, `isActive`, `isInMenu`, `displayOrder`, `parentPageId` because `UpdateCmsPageCommandHandler` only assigns properties whose values are non-null in the command. Re-reading the command:

```
if (request.PageKey != null) page.PageKey = request.PageKey;
…
if (request.MetaKeywords != null) page.MetaKeywords = request.MetaKeywords;
if (request.IsActive.HasValue) page.IsActive = request.IsActive.Value;
if (request.IsInMenu.HasValue) page.IsInMenu = request.IsInMenu.Value;
…
```

`AdminSiteSettings.js` only sends `{ pageTitle, content, metaDescription }`. Those three are non-null and will overwrite, while `MetaKeywords`, `IsActive`, `IsInMenu`, `DisplayOrder`, `ParentPageId` are null/missing and will be **left alone** (the `if != null` guard prevents clobbering). So in practice the "duplication" risk is limited to the three fields both UIs send, and there is no destructive write collision — but the moment someone copies the `AdminSiteSettings.js` save shape into the `CmsPagesAdmin` modal, accidental clobbers become possible.

**Data ownership summary:**

| Concern | Database table | Single copy? | UI writer | Public reader |
|---|---|---|---|---|
| Page-level content | `cms_pages` | Yes | `CmsPagesAdmin`, `AdminSiteSettings`, `AdminContactInfo` all | `AboutPage`, `ContactPage`, `OurTeamPage` |
| Site name / brand | n/a — hard-coded | n/a | n/a (no admin form) | `Navbar.js`, `Footer.js`, `public/index.html` |
| Logo | n/a — static asset | n/a | n/a | `Navbar.js`, `Footer.js`, `AdminLayout.js` |
| Contact phone/email/address | partly `contact_info` row content (HTML), partly hard-coded JS defaults in `ContactPage.js` | **TWO SOURCES — see §6** | `AdminContactInfo`, `AdminSiteSettings` (same row) | `ContactPage.js` (prefer CMS, fall back to JS defaults) |
| Social links | partly `contact_info` row content, partly hard-coded root URLs in `Footer.js` | TWO SOURCES | `AdminContactInfo`, `AdminSiteSettings` (same row) | `Footer.js` (hard-coded), `ContactPage.js` (via `contact_info` row) |

So **the genuine ownership problem is NOT between CMS Pages and Site Settings** (they share storage). It is between **CMS `contact_info` content vs hard-coded values in `Footer.js` and `ContactPage.js` defaults**. This is a real hard-code conflict (see §6) and exists independently of the Site Settings rename.

---

## 6. Hard-Coded Conflicts

| Value | Where it lives | Source of truth | Risk |
|---|---|---|---|
| Brand name `Care4Kids` | `Navbar.js` (alt text + logo file), `Footer.js` (`c4k-footer-brand-logo` alt + copyright), `AdminLayout.js` (brand logo alt), `public/index.html` `<title>Care4Kids — Children's Welfare & Donation</title>` and meta description, `config.js` `APP_NAME = 'Care4Kids'` (but `APP_NAME` is **never imported anywhere** — verified by grep) | None — duplicated in 5+ places | Low operational risk, but impossible to rebrand without code changes. |
| Logo path `/images/branding/Care4Kids_logo_clean.svg` | `Navbar.js`, `Footer.js`, `AdminLayout.js` | None | Same. |
| Favicon `/favicon.ico` | `public/index.html` `<link rel="icon">` | None | Same. |
| Mission statement in footer | `Footer.js` `<p className="c4k-footer-mission">We provide vulnerable children with food, education, healthcare and safe homes — building a future where every child can thrive.</p>` | None | An admin editing `our_mission` CMS row will only change the About page, not the footer. |
| Copyright text | `Footer.js` `&copy; {new Date().getFullYear()} Care4Kids. A registered charity. All rights reserved.` | None | Cannot be edited from admin. |
| Tagline `Every child deserves food, education, healthcare and love.` | `Footer.js` `c4k-footer-tagline` | None | Same. |
| Phone `1800-123-456` | `ContactPage.js` `defaultContact.phone` | Defaults shown only if CMS `contact_info` row has no content | If admin clears the CMS row, the phone reverts to a phone number that no longer matches the actual HQ address. |
| Email `info@care4kids.org` | `ContactPage.js` `defaultContact.email` | Same | Same. |
| Address `Aptech Đội Cấn, 4th Floor, Aptech Building, 285 Đội Cấn, Ba Đình, Hà Nội, Vietnam` | `ContactPage.js` `contactChannels[0].lines` | None — the CMS `contact_info` content row carries a *different* address (`123 Charity Street, District 1, Ho Chi Minh City, Vietnam`) | **Real conflict.** The default shows Hanoi; the seeded CMS row content shows Ho Chi Minh City. Once an admin edits `contact_info`, the page renders the CMS content; until then the hard-coded JS default is shown. |
| Office hours `Mon–Fri: 9am–6pm (GMT+7)` | `ContactPage.js` `defaultContact.hours` | CMS `contact_info` content (also contains hours) | Same — default vs CMS content can diverge. |
| Social URLs | `Footer.js` links to `facebook.com/`, `instagram.com/`, `linkedin.com/`, `youtube.com/` (root, not handles) | None | An admin cannot fix these from the admin. The CMS `contact_info` content row contains the *intended* handles `facebook.com/giveaid` etc. — only shown if CMS content exists. |
| Meta description in `<head>` | `public/index.html` `Care4Kids - A children's welfare and donation organization…` | None | The `meta_description` column in `cms_pages` is **never read by any client code**. There is no React Helmet, no `useEffect(() => document.title = …)`, no SEO component. |
| `<title>` element | `public/index.html` `<title>Care4Kids — Children's Welfare & Donation</title>` | None | Cannot be edited per-page from admin. |

**Summary of hard-coded conflicts.**

The application is currently using a **mix** of:
- **CMS data** for: page-level content of `about_us`, `what_we_do`, `our_mission`, `our_team`, `contact_info`, `help_centre`, `privacy_policy`, `terms_of_service`.
- **Hard-coded values** for: site brand, logo, favicon, footer mission/copyright/tagline, default contact phone/email/address/hours when no CMS content exists, social link root URLs, `<title>`, meta description in `<head>`.

There is no concept of "global configuration" that an admin could change without a code deploy.

---

## 7. Database Analysis

**Canonical schema** (`database/01_CreateDatabase_V2.sql`, line 335):

```sql
CREATE TABLE cms_pages (
    page_id           INT            IDENTITY(1,1) PRIMARY KEY,
    page_key          VARCHAR(50)    NOT NULL UNIQUE,
    page_title        NVARCHAR(100)  NOT NULL,
    page_slug         VARCHAR(100)   NULL UNIQUE,
    content           NVARCHAR(MAX)  NULL,
    meta_description  NVARCHAR(255)  NULL,
    meta_keywords     NVARCHAR(255)  NULL,
    is_active         BIT            NOT NULL DEFAULT 1,
    is_in_menu        BIT            NOT NULL DEFAULT 1,
    parent_page_id    INT            NULL,
    display_order     INT            NOT NULL DEFAULT 0,
    updated_by        INT            NULL,
    created_at        DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME       NULL,
    CONSTRAINT FK_cms_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id),
    CONSTRAINT FK_cms_parent     FOREIGN KEY (parent_page_id) REFERENCES cms_pages(page_id)
);
```

**Indexes** (`01_CreateDatabase_V2.sql` lines 615-616 + `CmsPageConfiguration.cs`):
- `IX_cms_pages_page_key` UNIQUE (implicit from `UNIQUE` on `page_key`)
- `IX_cms_pages_page_slug` UNIQUE (implicit)
- `idx_cms_slug` non-unique on `page_slug`
- `idx_cms_active` non-unique on `is_active`

**V2 Synchronization migration** (`database/V2_Synchronization_Migration.sql`, lines 152, 322-323) — ADDITIVE ONLY, no data loss:
- Adds `is_deleted`, `deleted_at`, `created_by NVARCHAR(450)`, `updated_by NVARCHAR(450)` to all 22 tables including `cms_pages`.
- Adds new tables: `notifications`, `audit_logs`, `password_reset_tokens`, `webhook_logs`.
- Adds Cloudinary metadata to `gallery`.
- Fixes donations idempotency index.

**EF Core migration history** (in `src/Infrastructure/Persistence/Migrations/`):
- `20260927114547_AddAuditFields` — adds `created_by`/`updated_by` string columns to all 22 tables (incl. `cms_pages.created_by`).
- `20260927120359_AddNotifications`.
- `20260928073005_AddAuditLogTable`.
- `20260929062209_FixCampaignCreatedByType` — fixes campaigns.created_by type only.

**Seed layers** (three parallel sources — see §10 for canonical):

| Source | Rows |
|---|---|
| `database/01_CreateDatabase_V2.sql` §6.1 | 11 rows: `home, about_us, what_we_do, our_mission, our_team, careers, achievements, contact_us, help_centre, privacy_policy, terms_of_service` |
| `src/Infrastructure/Persistence/Seed/SeedData.cs::SeedCmsPagesAsync` | 5 rows: `home, about_us, contact, privacy_policy, terms_of_service` (note: key `contact` not `contact_us`) |
| `src/Infrastructure/Persistence/Seed/SeedData.cs::SeedExtraCmsPagesAsync` | 3 rows: `our_mission, what_we_do, contact_info` (runs only if any rows exist) |
| `archive/sql-migrations/NGO_Database_CMS_Content_Migration.sql` | 5 rows with full HTML content: `about_us, contact_info, help_centre, privacy_policy, terms_of_service` |

**Canonical / current implementation:** `database/01_CreateDatabase_V2.sql` is the canonical SQL schema. The EF Core model snapshot (`GiveAIDDbContextModelSnapshot.cs`) matches. The `CmsPageConfiguration.cs` matches.

**Site Settings table:** **does not exist.** No `site_settings`, `website_settings`, `global_settings`, `general_settings` table is created in any SQL file (canonical or archived). The `IApplicationDbContext` enumerates 21 DbSets — none of them is a settings entity.

**Separate vs shared tables:** There is **one** table. There is no separate "Site Settings" table.

**Duplicate columns:** None — there is no second table.

**Duplicate rows:** The seed files don't duplicate within themselves (each uses `IF NOT EXISTS` guards), but three separate files can each insert the same `page_key`. The `UNIQUE` constraint on `page_key` will reject the second insert. Only the first seed source that runs will determine which content is present.

**One legacy implementation, one newer implementation?** The CMS pipeline itself is one implementation. The only "legacy" element is the **admin nav entry** `/admin/about → AdminAboutPage → AdminCmsPage`, which is explicitly labelled legacy in its own source comments.

---

## 8. Frontend Analysis

**Admin routes** (`GiveAID.Client/src/App.js`):

```
/admin/cms           → AdminCmsPage            (active)
/admin/about         → AdminAboutPage          (legacy wrapper, identical render to /admin/cms)
```

**Admin nav** (`GiveAID.Client/src/layouts/AdminLayout.js` lines 42-49):

```
Content
  ├─ Gallery         → /admin/gallery
  ├─ Achievements    → /admin/achievements
  ├─ CMS Pages       → /admin/cms
  └─ Site Settings   → /admin/about        ← misleading label
```

**`AdminCmsPage` tabs** (`GiveAID.Client/src/pages/admin/AdminCmsPage.js` lines 14-25):

```
Overview | Team | Careers | Achievements | Supporters | FAQs |
About Pages (cms) | Contact Info (contact) | Site Settings (settings)
```

So when an admin clicks "Site Settings" in the sidebar (route `/admin/about`), they land on `AdminCmsPage`, which already contains a **second** "Site Settings" tab. That tab opens `AdminSiteSettings.js`, which uses the same `/api/v1/cms/pages` endpoint.

| What the admin sees | What it actually edits |
|---|---|
| Sidebar → "Site Settings" → `/admin/about` | The unified CMS Center (rendered twice via two different routes) |
| CMS Center tab "Site Settings" | The 5-row filtered subset of `cms_pages` |
| Sidebar → "CMS Pages" → `/admin/cms` | Same unified CMS Center |
| CMS Center tab "About Pages" | The full `cms_pages` table |
| CMS Center tab "Contact Info" | The single `contact_info` row (CMS row id) |

**Public consumers** of `cms_pages`:

| Page | CMS key(s) fetched | Fallback |
|---|---|---|
| `AboutPage.js` | `what_we_do`, `our_mission` (bulk `?keys=` call) | Hard-coded `PROGRAMME_PILLARS`, `CORE_VALUES`, `TIMELINE`, mission/vision/promise strip |
| `ContactPage.js` | `contact_info` (single GET) | Hard-coded `defaultContact` and `contactChannels` array |
| `OurTeamPage.js` | `our_team` (single GET, silent failure) | Hard-coded CMS use is optional — `/team` API is the primary source |

**Other public pages** (Home, Causes, Campaigns, Donate, Gallery, Programmes, Help Centre) **do not** consume `cms_pages`. Help Centre uses the separate `faqs` table.

**Conclusion of routing/navigation analysis:** there are *two* entry points to the same UI (`/admin/cms` and `/admin/about`), and *one* of them is explicitly marked legacy. The "Site Settings" label inside `AdminCmsPage`'s tab strip is yet a third reference to the same UI. So "Site Settings" is the same as "CMS Pages" three different ways: a nav label, a route label, and an in-page tab label.

---

## 9. API Analysis

`docs/API_REFERENCE.md` §13 documents the only CMS endpoint:

```
## 13. CMS (/api/v1/cms/pages)
| GET    | /cms/pages                  | Public |
| GET    | /cms/pages/{key}            | Public |
| PUT    | /cms/pages/{id}             | Admin  |
```

(In practice the controller exposes POST and a 501-returning DELETE as well, but those are not documented in the API reference.)

| Endpoint | Method | Controller | Purpose | DB source | Frontend caller | Auth | Actually used? |
|---|---|---|---|---|---|---|---|
| `/api/v1/cms/pages` | GET | `CmsPagesController.GetPages` | List all CMS pages; optional `?keys=` and `?activeOnly` filters (note: controller ignores `?activeOnly` and `?includeInactive`, it always passes `ActiveOnly = false` to the handler) | `cms_pages` | `AdminCmsPage` (`CmsPagesAdmin.js`, `AdminContactInfo.js`, `AdminSiteSettings.js`), `AboutPage.js` | AllowAnonymous | Yes |
| `/api/v1/cms/pages/{keyOrSlug}` | GET | `CmsPagesController.GetByKeyOrSlug` | Get one page by slug → key fallback | `cms_pages` | `ContactPage.js`, `OurTeamPage.js` | AllowAnonymous | Yes |
| `/api/v1/cms/pages` | POST | `CmsPagesController.Create` | Create new CMS page | `cms_pages` | `CmsPagesAdmin.js` `CreatePageModal` | Admin, ContentManager | Yes (SuperAdmin only on UI) |
| `/api/v1/cms/pages/{id}` | PUT | `CmsPagesController.Update` | Update existing CMS page | `cms_pages` | `CmsPagesAdmin.js`, `AdminSiteSettings.js`, `AdminContactInfo.js` | Admin, ContentManager | Yes |
| `/api/v1/cms/pages/{id}` | DELETE | `CmsPagesController.Delete` | Returns 501 "Delete not yet implemented" | `cms_pages` (theoretically) | None (UI shows "Delete failed. (SuperAdmin required)" toast) | RequireAdmin | Stub only — UI calls it but it never succeeds |

There is **no** `/api/v1/site-settings` or `/api/v1/settings` endpoint. There is no separate Site Settings API.

**Duplicate endpoints:** None. There is **one** set of endpoints, accessed through one controller.

**Misleading label:** the only "duplication" is the admin UI presenting the same endpoint through two tab titles.

---

## 10. Legacy / Dead Code

| Element | File | Status | Evidence |
|---|---|---|---|
| `/admin/about` route | `App.js` line 87 | Legacy wrapper | `AdminAboutPage.js` opens with the comment `/* ── Legacy wrapper for /admin/about ─────── … The full Content Management Center is now at /admin/cms.` |
| `AdminAboutPage.js` component | `GiveAID.Client/src/pages/admin/AdminAboutPage.js` | Legacy, 24 lines, just re-mounts `AdminCmsPage` | Self-described in comments |
| Nav label "Site Settings" pointing at `/admin/about` | `AdminLayout.js` line 47 | Misleading — points at legacy route | The route file itself says "legacy" |
| `AdminSiteSettings.js` "Site Settings" tab | `GiveAID.Client/src/pages/admin/AdminSiteSettings.js` | Functional but redundant | Strict subset of `CmsPagesAdmin.js`; saves to same table; UI is narrower (3 fields, 5 hard-coded keys); discoverability is worse than the main "About Pages" tab |
| `MetaKeywords` field on `cms_pages` | `CmsPageConfiguration.cs`, `CmsPageDto.cs`, etc. | Persisted, never consumed | Grep across `GiveAID.Client/src/pages/**/*.js` returns 0 results for `metaKeywords`/`MetaKeywords` |
| `MetaDescription` field on `cms_pages` | Same | Stored by admin UIs but never rendered in `<head>` | Grep returns 0 usages outside admin/edit code; no React Helmet, no `document.querySelector('meta[name=description]')` mutation |
| `APP_NAME` export in `config.js` | `config.js` line 189 | Defined, never imported anywhere | Grep across `GiveAID.Client/src/**/*.js` returns 0 callers |
| `IsInMenu` field on `cms_pages` | `CmsPage.cs` etc. | Persisted, never consulted by navbar | Navbar menu is hard-coded |
| `ParentPageId` self-FK on `cms_pages` | `CmsPage.cs`, `01_CreateDatabase_V2.sql` | Persisted, never set, never queried | Grep returns 0 references outside the schema/entity files |
| `DELETE /api/v1/cms/pages/{id}` | `CmsPagesController.Delete` | Returns 501 Not Implemented | UI displays "Delete failed" toast; this is silently broken UX |
| `GetPages` `?includeInactive` and `?activeOnly` query params | `CmsPagesController.GetPages` line 39-46 | Declared in frontend calls but ignored by the controller | Controller always calls `GetAllCmsPagesQuery { ActiveOnly = false }`. The handler honours `ActiveOnly`, but the controller never passes `true`. So both `?includeInactive=true` and `?activeOnly=true` are no-ops at the API level. |
| `/privacy` and `/terms` footer links | `Footer.js` lines 79-80 | Routes referenced but **do not exist** in `App.js` | These routes fall through to the catch-all `<Route path="*" element={<Navigate to="/" replace />} />`. Clicking them silently sends users to `/`. |
| `IAtomicCampaignUpdater`, `IDbTransactionFactory`, `IAppTransactionScope`, `IDbExecutionStrategy`, `EfDbExecutionStrategy` interfaces | `src/Application/Common/Interfaces/`, `src/Infrastructure/Persistence/EfDbExecutionStrategy.cs` | Created but **unused** for CMS/Settings | Not relevant to this audit but listed as adjacent dead code. |

---

## 11. Recommended Architecture

**Recommendation: Option D — Keep both entry points but remove the duplicated field/responsibility surface, AND clarify the boundary.**

Reasoning:

- The application genuinely needs CMS Page content (Privacy, Terms, About main page, what_we_do, our_mission, our_team, contact_info, help_centre, etc.) — public pages actively consume it.
- The application does **not** need a "Global Site Settings" concept at all in its current form — it has no editable brand/logo/contact-phone/etc. fields anywhere; those values are hard-coded.
- The "Site Settings" tab and the `/admin/about` route are confusing wrappers around the same machinery that "CMS Pages" already exposes more completely.

**Boundary I recommend:**

### A. CMS PAGE CONTENT (in `cms_pages`, exposed by `CmsPagesController`)

Rows identified by `page_key`, one per standalone page/section:

- `home` (currently unused by public; can be retired or kept)
- `about_us` — full About Us main body
- `what_we_do` — what-we-do section body used by `AboutPage`
- `our_mission` — mission/vision/promise body used by `AboutPage`
- `our_team` — optional intro paragraph used by `OurTeamPage`
- `careers`, `achievements`, `contact_us` — legacy seeds; decide whether to retain
- `help_centre` — Help Centre intro (note: actual FAQ list is a separate module)
- `privacy_policy` — Privacy Policy body
- `terms_of_service` — Terms body

Public pages that already consume this content keep their fallback-to-hard-coded behaviour.

### B. CONTACT INFORMATION (a **separate** concept from CMS Pages — should be its own table)

What is currently being shoved into the `contact_info` `cms_pages` row's HTML `content` is really **structured** contact data: address, phone, email, office hours, social handles, response time, map embed. Stuffing that into a CMS page's free-form HTML is the reason the admin needs to know HTML tags to edit a phone number. This is the **one** thing in the project that arguably deserves to be promoted to its own module — but it is currently labelled as "Contact Info" *inside* the CMS Center, and the CMS row already exists, so a minimal cleanup is to rename `contact_info` to its own entity or at least to a separate row type within a unified `cms_pages` whose `page_key` prefix distinguishes structured vs body. **No recommendation to add a new table is in scope for this audit** — but the conceptual boundary should be: `contact_info` is **structured contact data**, not a "page".

### C. SITE BRAND / LOGO / GLOBAL SETTINGS — does not exist; do not invent

The user's premise was that Site Settings stores things like Site Name, Logo, Phone, Currency, Maintenance Mode. **None of those exist** in the current codebase. They are hard-coded in `Navbar.js`, `Footer.js`, `public/index.html`, `config.js`. There is no Site Settings module to deduplicate.

If the team wants editable site-wide settings in the future, that is a **new module**, not a deduplication task. It is out of scope for this audit.

### D. Discarded UI surface (to be removed once a separate cleanup is approved)

- `/admin/about` route + `AdminAboutPage.js` (legacy wrapper).
- The "Site Settings" sidebar label that points to `/admin/about`.
- The "Site Settings" tab inside `AdminCmsPage` (i.e. `AdminSiteSettings.js`) — but **only if** the user accepts that "Privacy, Terms, Help Centre body, About Us body, Contact Info" editing all lives under the "CMS Pages" tab. If the team prefers a narrower admin surface for non-technical admins, keep `AdminSiteSettings.js` and remove `CmsPagesAdmin.js`'s public visibility for these same keys (mutually exclusive).

---

## 12. Proposed Final Structure

Admin navigation (current → proposed):

```
Content
├── Gallery
├── Achievements
├── CMS Pages                → /admin/cms            (single canonical entry)
└── Contact Info             → /admin/contacts        (NEW — out of scope; only if team chooses to promote)

[removed] Site Settings      → /admin/about          (was legacy wrapper)
[removed] "Site Settings" tab inside /admin/cms
```

Reasoning: since there is no separate Site Settings backend, the cleanest admin experience is **one** entry per data concern. CMS Pages is the data concern. The "Site Settings" name was misleading and should be retired unless the team later creates a real global-settings module.

If, instead, the team wants a friendlier, narrower "Site Settings" UI for non-technical admins editing only Privacy/Terms/About/Contact/HelpCentre, the recommendation is:

- Keep `AdminSiteSettings.js` as the visible "Site Settings" tab.
- Rename the tab from "Site Settings" to "Quick Edit" (or "Common Pages") to make it clear it's a curated subset of CMS Pages.
- Remove `CmsPagesAdmin.js`'s Create / Delete / isInMenu / displayOrder controls for the five whitelist keys to avoid divergence.
- Remove `/admin/about` legacy wrapper and the "Site Settings" sidebar entry that points at it.

---

## 13. Required Changes (Only If You Implement the Recommendation)

These are *potential* changes — **not** applied. Grouped by surface.

### Frontend

1. `GiveAID.Client/src/App.js` — remove the `<Route path="about" element={<AdminAboutPage />} />` line inside the admin route tree.
2. `GiveAID.Client/src/pages/admin/AdminAboutPage.js` — delete the file (or repurpose to redirect to `/admin/cms`).
3. `GiveAID.Client/src/layouts/AdminLayout.js` — remove the `{ to: '/admin/about', label: 'Site Settings', icon: 'settings' }` entry from the Content nav group.
4. `GiveAID.Client/src/pages/admin/AdminCmsPage.js` — either (a) remove the `{ key: 'settings', label: 'Site Settings', icon: 'bi-gear-fill' }` tab and the `<AdminSiteSettings />` mount; or (b) keep it but rename the tab label to something honest ("Quick Edit", "Common Pages") and acknowledge the curated whitelist in the Overview tab card.
5. `GiveAID.Client/src/pages/admin/AdminSiteSettings.js` — if retained, update the hard-coded `keys` whitelist to reflect whatever subset is curated. If retired, delete the file.
6. `GiveAID.Client/src/components/Footer.js` — out of scope for *this* audit but flagged: the `<Link to="/privacy">` and `<Link to="/terms">` routes do not exist in `App.js` and silently navigate to `/`. This is a UX bug. If a Privacy/Terms public page is desired, it should be added; otherwise, route those footer links to `/help-centre` or remove them.

### Backend

7. `src/WebApi/Controllers/CmsPagesController.cs`:
   - Honour `?activeOnly=true` and `?includeInactive` query params (currently ignored).
   - Replace the `Delete` 501 stub with a real soft-delete command (or remove the route).
   - Optional: add `[Authorize(Roles = "SuperAdmin")]` to `Create` so the UI claim "SuperAdmin required" matches the server.

### Database

8. `cms_pages` schema — no schema change is *required* for the rename. The `IsInMenu`, `MetaDescription`, `MetaKeywords`, `ParentPageId` columns can be left in place for backward compatibility or removed in a future cleanup migration.
9. `src/Infrastructure/Persistence/Migrations/` — no new migration needed for this audit.
10. `database/01_CreateDatabase_V2.sql` and `archive/sql-migrations/NGO_Database_CMS_Content_Migration.sql` — pick **one** canonical seed for the five content rows (`about_us, contact_info, help_centre, privacy_policy, terms_of_service`). The other seed sources become backups only.

### API

11. No new endpoint needed. No endpoint to delete.
12. `docs/API_REFERENCE.md` §13 — already correct.

### Seed Data

13. Resolve the three-way duplication among `01_CreateDatabase_V2.sql`, `SeedData.cs`, and `NGO_Database_CMS_Content_Migration.sql`. The current `UNIQUE` on `page_key` means whichever seed runs first wins. Pick one authoritative seed source per environment and make the others no-ops.

### Tests

14. No existing tests for CMS or Site Settings — add unit tests for `CmsPagesController` (auth, keys filter, slug fallback) and integration tests for the `cms_pages` repository if desired. Not required by this audit.

---

## 14. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Removing `/admin/about` breaks any browser bookmark or external link pointing at it | Low | Add a `<Route path="about" element={<Navigate to="/admin/cms" replace />} />` redirect inside the admin tree. |
| Removing the "Site Settings" tab breaks admin muscle memory | Low | If kept, rename to "Quick Edit" and update the Overview tab card description. |
| Concurrent edits in `CmsPagesAdmin` and `AdminSiteSettings` overwriting each other | **Low — already mitigated** by the `if (request.X != null)` guards in `UpdateCmsPageCommandHandler`. The only fields both UIs write are `pageTitle`, `content`, `metaDescription`. | Add a `[ConcurrencyCheck]` `RowVersion` column to `cms_pages` if optimistic concurrency is required (separate future task). |
| Removing `AdminSiteSettings.js` removes the curated 5-key whitelist view that non-technical admins prefer | Medium (UX) | Decision: keep the tab but rename; or merge its scope into `CmsPagesAdmin.js`. |
| Hard-coded contact info in `ContactPage.js` and hard-coded brand in `Navbar.js`/`Footer.js` are NOT covered by this audit | Medium (data quality) | Out of scope; flagged separately. If a future "Global Settings" module is built, those values are what it would consume. |
| Loss of existing CMS row data | **None** — no DB change recommended in §13. | n/a |
| Donation / campaign / user / partner / FAQ data loss | **None** — this audit only touches admin UI routes and labels. | n/a |
| Public pages breaking | **None** — `AboutPage`, `ContactPage`, `OurTeamPage` continue to call `/api/v1/cms/pages` and `/api/v1/cms/pages/{key}`. | n/a |
| Build / runtime regressions from refactor | Low | The recommended change is route/component removal; backend untouched. |

---

## 15. Safe Implementation Plan (NOT executed)

A pragmatic, low-risk ordering:

1. **Pre-flight verification.** Confirm no external system or bookmark relies on `/admin/about`. (One-line grep over deployment logs / `INDEX.md` / `README.md`.)
2. **Step 1 — Add a redirect.** In `App.js`, replace the `AdminAboutPage` route body with `<Navigate to="/admin/cms" replace />`. This keeps the old URL working without rendering anything new. Verify admin can still access CMS via the old URL.
3. **Step 2 — Update the sidebar label.** In `AdminLayout.js`, change `{ to: '/admin/about', label: 'Site Settings', icon: 'settings' }` to `{ to: '/admin/cms', label: 'CMS Pages', icon: 'cms' }` (the existing CMS Pages entry above can be removed). This collapses the two nav entries into one.
4. **Step 3 — Resolve the inner tab.** In `AdminCmsPage.js`, remove the `settings` tab and the corresponding `activeTab === 'settings' && <AdminSiteSettings />` render. Verify Overview tab cards still list all remaining tabs.
5. **Step 4 — Delete dead files.** Once steps 1-3 are verified in dev/staging, delete `AdminAboutPage.js` and `AdminSiteSettings.js`.
6. **Step 5 — Update API contract docs.** `docs/API_REFERENCE.md` already only documents `/api/v1/cms/pages` — no change.
7. **Step 6 — Fix the silent 501.** Either implement `DELETE /cms/pages/{id}` (with a real soft-delete `DeleteCmsPageCommand`) or remove the route and the UI "Delete" button. Pick one; do not leave a misleading 501 in production.
8. **Step 7 — Honour `?includeInactive` and `?activeOnly`.** Tiny controller change to pass `ActiveOnly = includeInactive ? false : true` based on the query string. This unblocks admin tools that want to see inactive rows.
9. **Step 8 — Pick one canonical seed.** Decide between `01_CreateDatabase_V2.sql` and `NGO_Database_CMS_Content_Migration.sql` for the five content rows. Make the other a no-op by either removing its `INSERT` blocks or guarding them with `IF NOT EXISTS (SELECT 1 FROM cms_pages WHERE page_key = …) AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE …)`. The current guards are sufficient; only one will run.
10. **Step 9 — Document the new boundary.** Update `docs/ARCHITECTURE.md`, `PROJECT_MAP.md` and (if it exists) `README.md` admin section to reflect "CMS Pages = single source of editable public-page content" and the future-existence of a separate Contact Info or Site Settings module (if/when built).
11. **Step 10 — Optional future work (out of scope for this audit):**
    - Decide whether `IsInMenu`, `MetaKeywords`, `MetaDescription`, `ParentPageId` columns should be removed in a cleanup migration.
    - Decide whether the public site needs `react-helmet` to actually use the per-page `meta_description`.
    - Decide whether a separate `contact_infos` structured table replaces the `contact_info` CMS row.

---

## Appendix — File Inventory

**CMS Pages — actual files:**

```
src/Domain/Entities/CmsPage.cs
src/Infrastructure/Persistence/Configurations/CmsPageConfiguration.cs
src/Application/Common/Interfaces/IApplicationDbContext.cs           (DbSet<CmsPage>)
src/Application/Features/CmsPages/Commands/Create/CreateCmsPageCommand.cs
src/Application/Features/CmsPages/Commands/Create/CreateCmsPageCommandHandler.cs
src/Application/Features/CmsPages/Commands/Update/UpdateCmsPageCommand.cs
src/Application/Features/CmsPages/Commands/Update/UpdateCmsPageCommandHandler.cs
src/Application/Features/CmsPages/DTOs/CmsPageDto.cs
src/Application/Features/CmsPages/Queries/GetAll/GetAllCmsPagesQuery.cs
src/Application/Features/CmsPages/Queries/GetAll/GetAllCmsPagesQueryHandler.cs
src/Application/Features/CmsPages/Queries/GetBySlug/GetCmsPageBySlugQuery.cs
src/Application/Features/CmsPages/Queries/GetBySlug/GetCmsPageBySlugQueryHandler.cs
src/Infrastructure/Persistence/GiveAIDDbContext.cs                   (DbSet<CmsPage>)
src/Infrastructure/Persistence/Seed/SeedData.cs                      (SeedCmsPagesAsync, SeedExtraCmsPagesAsync)
src/WebApi/Controllers/CmsPagesController.cs
src/Infrastructure/Persistence/Migrations/20260927114547_AddAuditFields.cs  (adds created_by to cms_pages)
database/01_CreateDatabase_V2.sql                                    (cms_pages CREATE TABLE + §6.1 seed)
database/V2_Synchronization_Migration.sql                            (adds is_deleted/deleted_at/created_by/updated_by to cms_pages)
archive/sql-migrations/NGO_Database_CMS_Content_Migration.sql        (legacy seed)
GiveAID.Client/src/pages/admin/AdminCmsPage.js                       (tabbed CMS Center shell)
GiveAID.Client/src/pages/admin/CmsPagesAdmin.js                       ("About Pages" tab body)
GiveAID.Client/src/pages/admin/AdminContactInfo.js                    ("Contact Info" tab body)
GiveAID.Client/src/services/index.js                                  (cmsService)
GiveAID.Client/src/config.js                                         (API_ENDPOINTS.CMS)
docs/API_REFERENCE.md                                                (§13)
```

**Site Settings — actual files:**

```
GiveAID.Client/src/pages/admin/AdminSiteSettings.js                  (UI-only label; same /cms/pages endpoint)
GiveAID.Client/src/pages/admin/AdminAboutPage.js                     (legacy wrapper → AdminCmsPage)
GiveAID.Client/src/pages/admin/AdminCmsPage.js                       (tab "settings" → AdminSiteSettings)
GiveAID.Client/src/layouts/AdminLayout.js                            (sidebar entry "Site Settings" → /admin/about)
```

**No** backend files, no DB tables, no migrations, no tests, no API endpoints are dedicated to "Site Settings".

---

**Audit complete. No code or database changes were made.**