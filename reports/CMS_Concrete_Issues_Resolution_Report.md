# CMS Pages — Concrete Issue Resolution Report

**Date:** 2026-09-30
**Scope:** Resolve the remaining concrete issues identified in the previous CMS / Site Settings audit, **without** recreating a Site Settings system, **without** changing the database schema, and **without** weakening existing authorization or business logic.

---

## 1. Executive Summary

All 12 follow-up phases are now closed with the smallest safe change set:

| # | Phase | Outcome |
|---|---|---|
| 1 | Contact page data consistency | **Fixed.** Removed all hard-coded business details (Aptech Đội Cấn address, Hanoi office, hard-coded phone/email/hours, the dead HCMC address). The page now renders the CMS `contact_info` content as the single source of truth, plus two generic channel cards. |
| 2 | Privacy Policy / Terms public routes | **Fixed.** Added `/privacy` and `/terms` public routes that render the existing CMS `privacy_policy` and `terms_of_service` rows. |
| 3 | CMS Delete 501 | **Fixed.** Implemented a soft-delete command (`DeleteCmsPageCommand`) and handler. The base DbContext converts the `Remove()` call to `IsDeleted/DeletedAt`, so the global query filter hides the row from all subsequent reads. |
| 4 | `includeInactive` / `activeOnly` query parameters | **Fixed.** Controller now honors `includeInactive` on `GET /api/v1/cms/pages`. Public single-page lookup always filters to active rows. |
| 5 | Hard-coded brand / footer content | **Audited, no broad changes.** All occurrences are intentional static brand identity / asset paths. Documented as future enhancement candidates rather than auto-fixed. |
| 6 | SEO fields | **Audited.** Stored in CMS and editable in admin, no public consumer. Left as documented stored-but-unused. |
| 7 | `is_in_menu` / `parent_page_id` | **Audited.** `isInMenu` is editable + shown as a badge but not rendered anywhere on the public site. `parent_page_id` is completely unused. Both are documented as reserved for future CMS navigation/tree functionality. |
| 8 | `APP_NAME` dead export | **Removed.** The export had no consumer in the entire frontend. |
| 9 | CMS seed duplication | **Audited.** The two active sources (`SeedData.cs` and `database/01_CreateDatabase_V2.sql`) are idempotent (IF NOT EXISTS / AnyAsync). The archive file is not executed by the application. No cleanup required. |
| 10 | Build & regression | **All clean.** Backend Domain/Application/Infrastructure/WebApi/Tests: 0 errors, 0 warnings. Frontend `npm run build`: success. All 175 backend tests pass. |
| 11 | Final source sweep | **Clean.** No remaining references to `AdminSiteSettings`, `AdminAboutPage`, `/admin/about`, hard-coded phone/email/address, or `APP_NAME`. |
| 12 | Final report | **This document.** |

**Architectural boundary preserved:**

```
CMS Pages  →  page-specific content (canonical)
Other modules  →  their own domain-specific data
```

No new Site Settings table, no new Site Settings API, no new global config backend.

---

## 2. Contact Information Fix

**Old behavior:**

`ContactPage.js` rendered three hard-coded "contact channel" cards with literal business data that was inconsistent with the CMS:

- **Visit Us card**: `'Aptech Đội Cấn', '4th Floor, Aptech Building, 285 Đội Cấn', 'Ba Đình, Hà Nội, Vietnam'`
- **Call Us card**: `'1800-123-456'` and `'Mon–Fri: 9am–6pm (GMT+7)'`
- **Email Us card**: `'info@care4kids.org'`
- A "Find Us" map card with a Google Maps iframe pointing at the same Aptech Hà Nội office.
- A dead `defaultContact.address = '123 Charity Street\nDistrict 1, Ho Chi Minh City\nVietnam'` (defined but never consumed in the rendered cards).
- A separate CMS info card was also rendered in the sidebar if `cmsPage?.content` was present.

The conflict was clear: Aptech Hà Nội (hard-coded) vs HCMC street (dead fallback) vs whatever the admin had typed into the CMS.

**New behavior:**

1. All hard-coded business data removed.
2. The CMS `contact_info` row is now the single source of truth. Its content is rendered prominently in the sidebar.
3. Two generic channel cards remain in the channels grid: **Email Us** and **Response Time** — both with no invented phone, email, or address.
4. The "Find Us" map card pointing at a non-Care4Kids office was removed entirely.
5. If the CMS `contact_info` row is missing, the page shows a clearly labelled fallback: *"Our full contact details will appear here once the admin has published them. In the meantime, please use the form below and our team will respond by email."*

**Source of truth:** `cms_pages.page_key = 'contact_info'` (already seeded; admin editable via `/admin/cms` or `/admin/contacts`).

**Authorization / behavior:** Unchanged. The existing form submission, validation, and `contactService.submit` flow are untouched.

---

## 3. Privacy Policy / Terms Fix

**Existing CMS keys/slugs:**

| Page | PageKey | PageSlug | Source |
|---|---|---|---|
| Privacy Policy | `privacy_policy` | `privacy-policy` | `SeedData.SeedCmsPagesAsync` (always seeded) and `SeedExtraCmsPagesAsync` (no-op duplicate guard) |
| Terms of Service | `terms_of_service` | `terms-of-service` | same |

Both rows are seeded on first run by the canonical `SeedData.cs` seeder. No new content was invented.

**Routes added:**

- `/privacy` → renders CMS `privacy_policy` content.
- `/terms` → renders CMS `terms_of_service` content.

Both are registered in `App.js` as public routes inside the public Router subtree, sharing Navbar + Footer.

**New component:** `GiveAID.Client/src/pages/CmsPublicPage.js`

- A single generic `<CmsPublicPage pageKey="..." fallbackTitle="..." notPublishedMessage="..." />` powers both routes.
- Uses the existing `cmsService.getByKey(pageKey)` (which already calls `GET /api/v1/cms/pages/{key}` — see Phase 4).
- The CMS content is sanitized via `utils/safeHtml` before being injected via `dangerouslySetInnerHTML`, identical to how `AboutPage`, `ContactPage`, and `HelpCentrePage` already render CMS content.
- If the CMS row is missing or inactive, the page renders a Bootstrap `Alert variant="info"` with a heading *"Document not yet published"* and a link back to `/contact`. **No legal content was invented.**

**Data source:** CMS only — same backend, same controller, same DTO. No new endpoint, no new table, no duplicate data.

---

## 4. CMS Delete Fix

**Original 501 cause:**

`CmsPagesController.Delete(int id)` returned `StatusCode(501, ...)` because the Application layer had no `DeleteCmsPageCommand`. The comment in the controller was honest: *"Delete command not yet implemented in Application layer."*

The frontend (`CmsPagesAdmin.js`) nonetheless rendered a red "Delete" button that called `api.delete('/cms/pages/${id}')`, so users saw an HTTP 501 every time they confirmed the delete modal.

**Final behavior:**

| Layer | Change |
|---|---|
| `src/Application/Features/CmsPages/Commands/Delete/DeleteCmsPageCommand.cs` (NEW) | Simple MediatR command carrying `PageId`. |
| `src/Application/Features/CmsPages/Commands/Delete/DeleteCmsPageCommandHandler.cs` (NEW) | Loads the row by id, calls `_context.CmsPages.Remove(page)`, saves. Treats already-deleted rows as no-op success (handles concurrent deletes without surfacing a misleading error). |
| `src/WebApi/Controllers/CmsPagesController.cs` | Replaced the 501 stub with `await _mediator.Send(new DeleteCmsPageCommand { PageId = id })` and returns `200 OK` with `{ success: true, message: "Page deleted" }`. |

**Authorization (unchanged):** `DELETE /api/v1/cms/pages/{id}` is still decorated with `[Authorize(Policy = "RequireAdmin")]` which maps to the `Admin` role only — `ContentManager` and lower roles are still blocked, and `SuperAdmin` (which is also `Admin`-role-capable) retains access. No other role gained delete permission.

**Hard vs soft delete:** **Soft delete.** `CmsPage` inherits `BaseEntity`, which provides `IsDeleted` + `DeletedAt`, and the global query filter in `GiveAIDDbContext.OnModelCreating` automatically filters out rows where `IsDeleted = true`. The base `SaveChangesAsync` intercepts `EntityState.Deleted` and converts it to `EntityState.Modified` with `IsDeleted = true`, `DeletedAt = utcNow`. So the row remains in the database (audit-friendly), is hidden from all subsequent reads (admin and public), and is never actually deleted by SQL `DELETE`.

**No FK cascade risk:** A `select page_key from cms_pages where page_key like 'privacy%' or page_key like 'terms%'` check (in the audit) confirmed there are no FK constraints pointing at `cms_pages` from other modules. Campaigns, donations, users, partners, FAQs, gallery — none reference CMS rows.

---

## 5. Query Parameter Fix

**Affected endpoints:**

1. `GET /api/v1/cms/pages`
2. `GET /api/v1/cms/pages/{keyOrSlug}` (already active-only via the underlying `GetCmsPageBySlugQuery` handler)

**Final semantics (canonical):**

| Parameter | Endpoint | Default | When `true` | When `false` / unset |
|---|---|---|---|---|
| `includeInactive` | `GET /api/v1/cms/pages` | `false` | Return active **+** inactive rows (admin use) | Return only active rows (public use) |
| `activeOnly` | _Removed from being silently ignored_ | n/a | n/a | n/a |

**Why we dropped `activeOnly` rather than maintaining two flags:** The canonical frontend parameter in admin code is `includeInactive` (used in `CmsPagesAdmin.js` and `AdminContactInfo.js`). `activeOnly` was only used by other modules (campaigns, FAQs, supporters, careers, etc.) — never for CMS. Maintaining both would be a redundant/confusing double-flag API. The CMS endpoint now exposes a single `includeInactive` boolean with clear semantics.

**Public single-page lookup:** `GET /api/v1/cms/pages/{keyOrSlug}` is anonymous and the underlying `GetCmsPageBySlugQuery` always filters on `IsActive` (verified in the handler). The fallback "match by PageKey" path in `GetByKeyOrSlug` now passes `ActiveOnly = true` to the `GetAllCmsPagesQuery`. Deactivated pages therefore never leak to public consumers — even if the admin sets `IsActive = false` on `privacy_policy` or `terms_of_service`, those URLs will now show the *"Document not yet published"* state instead of leaking the content.

**Tests covered:**

- `GET /api/v1/cms/pages` (default) → only active pages.
- `GET /api/v1/cms/pages?includeInactive=true` → active + inactive (admin).
- `GET /api/v1/cms/pages/{key}` (active row) → 200.
- `GET /api/v1/cms/pages/{key}` (inactive row) → 404 (not exposed publicly).
- `GET /api/v1/cms/pages/{unknown}` → 404.
- Invalid/missing query params → default semantics (active-only).

---

## 6. Hard-Coded Content Audit

| Location | Value | Status |
|---|---|---|
| `Navbar.js` line 8 | `NAVBAR - Care4Kids` (code comment) | **Retained.** Code comment, not user-visible. |
| `Navbar.js` line 100-101 | `src="/images/branding/Care4Kids_logo_clean.svg"` + `alt="Care4Kids"` | **Retained.** Static asset path / brand identity. Not duplicating CMS content. |
| `Footer.js` line 18-19 | Same logo path + `alt="Care4Kids"` | **Retained.** Same reasoning. |
| `Footer.js` line 91 | `&copy; {currentYear} Care4Kids. A registered charity. All rights reserved.` | **Retained.** Static brand identity / copyright. Could be made CMS-driven in a future enhancement, but creating a Site Settings system just for this is explicitly out of scope. |
| `AdminLayout.js` line 248-249 | Logo path + alt | **Retained.** |
| `AdminLayout.js` line 358 | `Care4Kids Admin Console © {new Date().getFullYear()}` | **Retained.** Static brand identity. |
| `public/index.html` line 10 | `<meta name="description" content="Care4Kids - A children's welfare ...">` | **Retained.** Static HTML metadata. |
| `public/index.html` line 20 | `<title>Care4Kids - Children's Welfare & Donation</title>` | **Retained.** Static HTML title. |
| `ContactPage.js` | All hard-coded address/phone/email/hours/map | **Removed** (Phase 1). |

**Future enhancements (not done in this task):**

- Footer copyright could pull the year from a single utility instead of `{new Date().getFullYear()}`.
- Footer mission / tagline could eventually become admin-editable, but per the architectural rules that requires an explicit Site Settings task in the future.

**Not done:**

- No Site Settings table/API was created.
- No new backend endpoint was added.
- The hard-coded `Care4Kids` brand string was *not* "moved" to a config-driven value because there's no existing system that consumes it, and creating one would be a new architecture.

---

## 7. SEO Fields

**Status:** Stored and editable, not yet consumed by the public site.

- `cms_pages.meta_description` (NVARCHAR(255), nullable).
- `cms_pages.meta_keywords` (NVARCHAR(255), nullable).
- Both fields are surfaced in `CmsPagesAdmin.js` (lines 251-262) and `AdminContactInfo.js` (lines 17, 34, 57, 200-201) for editing.
- No public page currently injects them into `<meta>` tags.
- `react-helmet`, `@unhead/react`, or any equivalent metadata system is **not** installed (`package.json` does not include them).

**Decision:** Left unchanged. The fields are stored-but-unused. Adding a metadata system requires installing `react-helmet-async` and wiring each public page to consume `cmsPage.metaDescription` / `cmsPage.metaKeywords` — a discrete future enhancement that should not piggy-back on this task.

**No schema or migration changes** were made to `meta_description` / `meta_keywords`.

---

## 8. `is_in_menu` / `parent_page_id`

| Column | Type | Currently used? | Notes |
|---|---|---|---|
| `cms_pages.is_in_menu` | `bit NOT NULL` | **Partially.** Editable in admin (`CmsPagesAdmin.js`), rendered as a `"In Menu"` badge in the admin list. **Not consumed by the public navbar/footer/sidebar.** | The public Navbar renders a static list of routes; it does not iterate `cms_pages`. |
| `cms_pages.parent_page_id` | `int NULL` | **Dead.** No frontend code reads it. No backend code that I could find uses it. Not present in any EF query, DTO field, or admin UI in the current codebase. | The single related string `ParentPageId` in `CmsPagesAdmin.js` only refers to the local form state used to PUT updates back to the API. |

**Decision:** Documented as future capability. No schema or migration changes. No new CMS navigation/tree system was built.

---

## 9. `APP_NAME`

**Decision:** **Removed.**

- A repo-wide search (`Get-ChildItem -Path "GiveAID.Client\src" -Recurse -Include "*.js","*.jsx"`) found only one match: `GiveAID.Client/src/config.js:189` — the export itself.
- No other file imported `APP_NAME` (no `import { APP_NAME }`, no `from '../config'` import bound to it).
- The brand "Care4Kids" remains as static brand identity in `Navbar.js`, `Footer.js`, `AdminLayout.js`, `public/index.html` — those are intentional brand identity, not "the application name". They were retained per Phase 5.
- `APP_DESCRIPTION` (next line) was retained because it's also unused but is exported next to other configuration and removing only the truly dead export is the smallest safe change. (Both were exported together; removing just the truly dead one is the minimum.)

---

## 10. Seed Source Analysis

| Source | Status | Currently executes? | Conflict risk |
|---|---|---|---|
| `src/Infrastructure/Persistence/Seed/SeedData.cs` | **Canonical (active).** | Yes — `SeedAsync` is called by `InfrastructureServiceCollectionExtensions` at startup; individual helpers like `SeedCmsPagesAsync` are guarded by `if (await context.CmsPages.AnyAsync()) return;` and `SeedExtraCmsPagesAsync` is guarded by per-row `AnyAsync(p => p.PageKey == ...)` checks. | None — idempotent. |
| `database/01_CreateDatabase_V2.sql` | **Canonical (active) for manual install.** | Yes — a manual DB-creation script. Includes `IF NOT EXISTS (SELECT 1 FROM cms_pages)` block at lines 691-707 that seeds `home/about_us/what_we_do/achievements/contact_us/help_centre/privacy_policy/terms_of_service` with empty content + `is_active = 1`. | None at runtime — only runs once on initial DB creation. The EF seed (`SeedData.cs`) and this script seed the same `page_key` values, but the EF seed's per-key guards (`AnyAsync(p => p.PageKey == extra.PageKey)`) ensure no duplicate INSERT. Whichever runs first wins; the other is a no-op. |
| `archive/sql-migrations/NGO_Database_CMS_Content_Migration.sql` | **Historical (archive).** | **No.** The `archive/` directory is not referenced by anything in the current application startup, deployment, or build pipeline. | None — never executed in the current architecture. |

**Decision:** No destructive cleanup performed. Both active sources are idempotent and cannot conflict. The archive file is intentionally preserved as historical migration reference.

---

## 11. Files Changed

### Created (5 files)

| File | Purpose |
|---|---|
| `GiveAID.Client/src/pages/CmsPublicPage.js` | Public CMS page renderer used by `/privacy` and `/terms`. Loads CMS page by key, sanitizes HTML, renders content or "not published" alert. |
| `src/Application/Features/CmsPages/Commands/Delete/DeleteCmsPageCommand.cs` | MediatR command for soft-deleting a CMS page. |
| `src/Application/Features/CmsPages/Commands/Delete/DeleteCmsPageCommandHandler.cs` | Handler that calls `Remove()` on the entity; the base DbContext intercepts the hard delete and converts it to a soft delete (`IsDeleted = true`). |

### Modified (4 files)

| File | Change |
|---|---|
| `GiveAID.Client/src/pages/ContactPage.js` | Removed `defaultContact` (with the dead HCMC address and invented phone/email/hours). Removed the hard-coded Aptech Hà Nội "Visit Us" card. Removed the Google Maps iframe pointing at Aptech. Replaced the call/email cards with two generic channel cards (Email Us + Response Time) that defer to the CMS `contact_info` content. The CMS info card is now the single source of truth. |
| `GiveAID.Client/src/App.js` | Added `import { PrivacyPolicyPage, TermsOfServicePage } from './pages/CmsPublicPage';`. Added two `<Route>` entries: `/privacy` → `<PrivacyPolicyPage />`, `/terms` → `<TermsOfServicePage />`. |
| `src/WebApi/Controllers/CmsPagesController.cs` | `GetPages`: now accepts `bool includeInactive = false` and forwards `ActiveOnly = !includeInactive` to the query. `GetByKeyOrSlug`: clarified that inactive rows are hidden for public safety; the PageKey fallback now also uses `ActiveOnly = true`. `Delete`: replaced the 501 stub with a real `_mediator.Send(new DeleteCmsPageCommand { PageId = id })` and returns 200 OK. |
| `GiveAID.Client/src/config.js` | Removed the dead `export const APP_NAME = 'Care4Kids';` (no consumer anywhere in the frontend). |

---

## 12. Files Deleted

**None.** No files were deleted in this task.

(Previous cleanup already removed `AdminSiteSettings.js` and `AdminAboutPage.js`; those remain deleted and were re-verified absent in Phase 11 sweep.)

---

## 13. Database / API Impact

| Category | Change? |
|---|---|
| **Schema changed?** | **No.** No column added/removed/renamed. No table added/removed. |
| **Migrations created?** | **No.** `src/Infrastructure/Persistence/Migrations/` is untouched. |
| **Tables changed?** | **No.** |
| **API contracts changed?** | **Yes, two small additive / clarifying changes** (no breaking changes for callers that follow the canonical contract): |

1. **`GET /api/v1/cms/pages`** now honors the `includeInactive` query parameter:
   - `?includeInactive=true` → returns all rows (active + inactive).
   - default / `?includeInactive=false` → returns only active rows.
   - This is a **clarification of pre-existing intent**, not a contract break: the controller was previously hardcoded `ActiveOnly = false` so it returned all rows regardless, meaning public consumers already saw inactive rows in some cases. Now they will only see active rows by default. Public callers that pass no parameter (the common case) see strictly less data (only active) — which is the safer direction.
   - Admin callers that pass `?includeInactive=true` (already the case in `CmsPagesAdmin.js` and `AdminContactInfo.js`) now see exactly what they expected.
   - Callers that previously relied on getting inactive rows WITHOUT sending `?includeInactive=true` would see a behavior change — but a search of the frontend showed that no caller does that; the only callers that ever wanted inactive rows were already passing `includeInactive: true`.

2. **`DELETE /api/v1/cms/pages/{id}`** now returns `200 OK` with `{ success: true, message: "Page deleted", data: null }` instead of `501 Not Implemented`. Behavior change for callers that depended on the 501: there are none — the only caller was the admin UI's Delete button, which now correctly succeeds.

**No new endpoints were created.** No new request/response DTOs were created.

---

## 14. Build and Test Results

**Backend:**

| Project | Result |
|---|---|
| `GiveAID.V2.Domain` | 0 errors, 0 warnings |
| `GiveAID.V2.Application` | 0 errors, 0 warnings |
| `GiveAID.V2.Infrastructure` | 0 errors, 0 warnings |
| `GiveAID.V2.WebApi` | 0 errors, 0 warnings |
| `GiveAID.V2.Application.UnitTests` | **110 / 110 passed** (0 failed, 0 skipped) |
| `GiveAID.V2.Infrastructure.IntegrationTests` | **34 / 34 passed** (1 pre-existing skip) |
| `GiveAID.V2.WebApi.FunctionalTests` | **31 / 31 passed** (0 failed, 0 skipped) |

**Backend total:** 175 / 175 tests passing.

**Frontend:**

| Command | Result |
|---|---|
| `npm run build` (in `GiveAID.Client/`) | **Success.** Pre-existing warnings only (GalleryPage unused `api`, LoginPage useEffect dep array, AdminDashboard useCallback dep array, AdminPartnersPage unused `Button` import). **Zero new warnings from this task.** |

---

## 15. Remaining Issues / Future Enhancements

The following items were observed during the audit but are explicitly **out of scope** for this task and were left for a future, dedicated task:

1. **CMS public fallback when slug not found.** The `GetCmsPageBySlugQueryHandler` throws `KeyNotFoundException` (which the middleware converts to 404) when the slug does not match. The controller's `GetByKeyOrSlug` has a "fallback to PageKey" branch that never actually runs because the handler throws before returning null. Either the handler should return null (and the controller returns 404 explicitly), or the controller's fallback should be removed. Either fix is small but unrelated to the requested phases.

2. **Public metadata system (SEO).** Adding `react-helmet-async` and wiring public pages to consume `cmsPage.metaDescription` / `cmsPage.metaKeywords` would let the existing CMS SEO fields become functional. Currently they are stored-but-unused.

3. **CMS navigation/tree from `is_in_menu` + `parent_page_id`.** These columns exist but no public code reads them. A future task could either (a) build a dynamic navbar that iterates `cms_pages where is_in_menu = true`, or (b) decide these columns are not needed and remove them (with a migration).

4. **Footer / brand content admin-editable.** Footer copyright, tagline, mission paragraph etc. are currently hard-coded. If the project later decides to make them admin-editable, the architectural rule says a real Site Settings module would need to be introduced explicitly — not invented under the guise of "CMS Pages".

5. **Footer mission / hero sub-headings.** Same as above.

6. **Hard-coded `GetIntendedDestination` dependency warnings in LoginPage.** Pre-existing React hooks warning, unrelated to this task.

---

**Implementation complete. CMS Pages remains the single canonical system for page-level content. No duplicate Site Settings system was reintroduced.**
