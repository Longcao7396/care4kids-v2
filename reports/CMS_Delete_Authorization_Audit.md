# CMS DELETE — Read-Only Authorization Audit

**Date:** 2026-09-30
**Mode:** Read-only. No code, DB, API, route, or auth-config changes were made.
**Scope:** Verify the authorization on `DELETE /api/v1/cms/pages/{id}` after the Phase 3 implementation, and reconcile it against the frontend UI and the POST/PUT sibling endpoints.

---

## 1. DELETE Authorization

**Exact attribute / policy on the controller:**

```csharp
[HttpDelete("pages/{id:int}")]
[Authorize(Policy = "RequireAdmin")]
[ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
[ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
public async Task<IActionResult> Delete(int id)
```

(`src/WebApi/Controllers/CmsPagesController.cs`, lines 122-134.)

**Policy definition (Program.cs, lines 88-95):**

```csharp
options.AddPolicy("RequireAdmin", policy => policy.RequireRole("Admin"));
// SuperAdmin policy removed - Admin has full privileges
```

**Effective allowed roles:**

| Role | Backend DELETE result |
|---|---|
| `Admin` | **Allowed.** `RequireRole("Admin")` matches exactly. |
| `SuperAdmin` | **Denied (403).** The role claim is `"SuperAdmin"`, not `"Admin"`. There is no hierarchical "Admin is also SuperAdmin" mapping in the auth pipeline. |
| `ContentManager` | **Denied (403).** Not in the role list. |
| `User` | **Denied (403).** |
| Unauthenticated | **Denied (401).** `[Authorize]` triggers. |

The JWT carries the role via `new Claim(ClaimTypes.Role, role)` (`src/Infrastructure/Security/JwtTokenService.cs:43`) with no transformation, so the role claim equals the `users.Role` column value verbatim.

**Important pre-existing fact:** The policy's own comment (`// SuperAdmin policy removed - Admin has full privileges`) confirms this is intentional architecture: there is no `RequireSuperAdmin` policy in the system. SuperAdmin is currently a UI-only concept (used in Navbar / AdminLayout badges and in CmsPagesAdmin's button gating), but no controller method in `src/WebApi/Controllers/` actually requires the SuperAdmin role. The only Authorization policy registered in `Program.cs` is `RequireAdmin = RequireRole("Admin")`.

---

## 2. POST/PUT Comparison

**`POST /api/v1/cms/pages` (CmsPagesController.Create, lines 98-106):**

```csharp
[HttpPost("pages")]
[Authorize(Roles = "Admin,ContentManager")]
```

**`PUT /api/v1/cms/pages/{id:int}` (CmsPagesController.Update, lines 109-118):**

```csharp
[HttpPut("pages/{id:int}")]
[Authorize(Roles = "Admin,ContentManager")]
```

**`DELETE /api/v1/cms/pages/{id:int}` (CmsPagesController.Delete, lines 122-134):**

```csharp
[Authorize(Policy = "RequireAdmin")]   // = RequireRole("Admin")
```

**Matrix:**

| Role | POST | PUT | DELETE |
|---|---|---|---|
| `Admin` | ✓ | ✓ | ✓ |
| `SuperAdmin` | ✓ | ✓ | **✗ (403)** |
| `ContentManager` | ✓ | ✓ | ✗ (403) |

**Inconsistency confirmed:** POST and PUT both allow `SuperAdmin` and `ContentManager` (and `Admin`). DELETE allows `Admin` only — narrower than its siblings in two ways:

- DELETE excludes `ContentManager` (a stricter write policy than POST/PUT — defensible, since delete is more destructive).
- DELETE excludes `SuperAdmin` (a stricter write policy than POST/PUT — this is **inconsistent with the program's stated design intent**, because every other controller in this codebase treats `Admin` and `SuperAdmin` symmetrically for write operations).

---

## 3. Frontend Permission Check

**Component:** `GiveAID.Client/src/pages/admin/CmsPagesAdmin.js`

**Definition of `isSuperAdmin` (line 115):**

```js
const isSuperAdmin = JSON.parse(localStorage.getItem('giveaid_user') || '{}')?.role === 'SuperAdmin';
```

This is a strict, exact-match check against `localStorage.giveaid_user.role === 'SuperAdmin'`.

**Delete button visibility (line 197):**

```jsx
{isSuperAdmin && (
  <Button variant="outline-danger" size="sm"
          onClick={() => setDeleteConfirm(p.pageId)}>
    <i className="bi bi-trash me-1"></i>Delete
  </Button>
)}
```

**New-Page (Create) button visibility (line 136):**

```jsx
{isSuperAdmin && (
  <Button variant="primary" onClick={openCreate}>
    <i className="bi bi-plus-circle me-2"></i>New Page
  </Button>
)}
```

**Edit button (line 187):** Not gated by `isSuperAdmin`. Anyone who reaches `CmsPagesAdmin.js` can click Edit.

**Who actually reaches `CmsPagesAdmin.js`:**

- `App.js` route guard: `<ProtectedRoute roles={['Admin', 'SuperAdmin']}>` (line 58, line 73).
- `AdminCmsPage.js` (the wrapper that mounts `CmsPagesAdmin` for the `cms` tab) at line 110: `const canAccessAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';` — denies `ContentManager` with an "You do not have permission" alert.

**Matrix (full stack — UI gate × backend gate):**

| Role | `/admin/cms` UI | Delete button visible | Backend DELETE | Effective ability to DELETE |
|---|---|---|---|---|
| `Admin` | ✓ | ✗ | ✓ (RequireAdmin) | **Can call DELETE via API but has no UI button.** Backend is the real boundary, so they CAN delete if they construct the request directly. |
| `SuperAdmin` | ✓ | ✓ | ✗ (RequireRole("Admin") fails) | **Sees Delete button but every DELETE click returns 403 from the backend.** |
| `ContentManager` | ✗ (blocked by AdminCmsPage) | ✗ | ✗ | Cannot delete. |
| `User` | ✗ | ✗ | ✗ | Cannot delete. |

**The frontend handler in `CmsPagesAdmin.handleDelete` (lines 102-112):**

```js
const handleDelete = async () => {
  if (!deleteConfirm) return;
  try {
    await api.delete(`/cms/pages/${deleteConfirm}`);
    setSuccess('Page deleted.');
  } catch (err) {
    setError('Delete failed. (SuperAdmin required)');
  } finally {
    setDeleteConfirm(null);
    load();
  }
};
```

The error message "Delete failed. (SuperAdmin required)" is **misleading** — the backend actually requires `Admin` (per `RequireAdmin` policy), and it does not actually require `SuperAdmin` at all. The message is a stale string from the pre-fix behavior and was not updated when the controller's authorization attribute was last touched.

---

## 4. Security Assessment

### 4.1 Is the backend the real security boundary?

**Yes, but with one caveat.** The `[Authorize]` attribute is evaluated server-side on every request. A user without a valid JWT gets 401; a user with a valid JWT but wrong role gets 403. The frontend role check (`isSuperAdmin`) is purely a UX affordance — it has zero effect on what the server will accept.

However:

- **`Admin` users can DELETE** even though no UI button is shown to them. The role claim in their JWT is `"Admin"`, which matches `RequireRole("Admin")` exactly. They cannot see the button, but they can construct the call directly via API (curl, Postman, devtools). This is fine from a least-privilege standpoint — admins are authorized to delete. It just means the "no UI button" does not mean "no ability".
- **`SuperAdmin` users cannot DELETE** despite the UI offering them a button. The role claim is `"SuperAdmin"`, which does NOT match `RequireRole("Admin")`. Every click of the visible Delete button will result in a 403 from the server, and the user will see "Delete failed. (SuperAdmin required)". This is the actual broken flow: the UI lies about both the cause of failure AND about who should be able to delete.

### 4.2 Is allowing `Admin` to delete CMS pages a privilege escalation?

No. The policy comment in `Program.cs` is explicit: *"SuperAdmin policy removed - Admin has full privileges"*. The codebase has only one Authorization policy — `RequireAdmin = RequireRole("Admin")` — and it is used by AchievementsController, AdminDashboardController, AdminEmailLogsController, AdminPaymentsController, AdminRegistrationsController, AdminUsersController, AuthBootstrapController, CampaignReportsController, CampaignsController, CareerApplicationsController, CareersController, CausesController, **CmsPagesController (Delete)**, ContactsController, ConversationsController, DonationsController, GalleryController, NotificationsController, ProgrammesController, SupportersController, TeamController, FaqsController — i.e. **every destructive admin operation**. Admin is the canonical "full privilege" role. Letting Admin soft-delete CMS pages is consistent with the rest of the application.

### 4.3 Is excluding `ContentManager` from DELETE consistent?

Yes. `ContentManager` is allowed to create and update CMS pages (per `[Authorize(Roles = "Admin,ContentManager")]` on POST/PUT) but not to delete them. The pattern of "ContentManager can edit but not delete" is consistent with the codebase's other destructive endpoints (which are all `RequireAdmin`). The hierarchy is:

| Action | ContentManager | Admin | SuperAdmin |
|---|---|---|---|
| Read CMS page (public) | ✓ | ✓ | ✓ |
| List CMS pages (admin) | ✓ (via /admin/cms? blocked — UI gate) | ✓ | ✓ |
| Create / Update CMS page | ✓ (API) | ✓ (API) | ✓ (API) |
| Delete CMS page | ✗ | ✓ | ✗ (backend rejects) |

### 4.4 Is excluding `SuperAdmin` from DELETE a security risk?

Yes — but it is not a *privilege-escalation* risk. It is a *broken-feature* risk: SuperAdmin is currently a UI-only tier that displays extra affordances (Delete button, New Page button, "Super Admin" badge) but the backend does not recognize it. A SuperAdmin who tries to delete or create a CMS page via the UI will hit a 403.

This is a pre-existing bug, NOT something introduced by the Phase 3 implementation. It existed before — the DELETE 501 stub masked it because SuperAdmins got a 501 (not the 403 they would get today), and the frontend's "Delete failed. (SuperAdmin required)" toast lied about the cause. Now that DELETE returns 200 for Admin and 403 for SuperAdmin, the discrepancy is more visible but it is the same architectural inconsistency.

### 4.5 Can the soft-delete cascade into unrelated business data?

**No.** Verified by:

- The handler (`DeleteCmsPageCommandHandler`) operates exclusively on `_context.CmsPages` — no other `DbSet` is touched.
- The handler calls `_context.CmsPages.Remove(page)` and `await _context.SaveChangesAsync()`. The base `GiveAIDDbContext.SaveChangesAsync` intercepts `EntityState.Deleted` and converts it to `EntityState.Modified` with `IsDeleted = true`, `DeletedAt = utcNow`. The `AuditLog` entry written alongside is also `BaseEntity`-scoped (no cascade to other modules).
- A search for `REFERENCES.*cms_pages` in the canonical schema (`database/01_CreateDatabase_V2.sql`) returns **one** FK: `FK_cms_parent FOREIGN KEY (parent_page_id) REFERENCES cms_pages(page_id)` — a self-reference for the unused `parent_page_id` tree. No external table (campaigns, donations, users, partners, faqs, gallery, etc.) references `cms_pages`, so there is no cascade target.

The soft-delete is also non-destructive — the row remains in the table with `IsDeleted = true` and can be recovered manually by a DBA if needed.

### 4.6 Overall

The current DELETE authorization is **inconsistent with the frontend UI** but **not insecure**:

- Backend authorization is enforced server-side on every request (correct security boundary).
- The set of roles that can DELETE (`Admin`) is strictly narrower than the set that can POST/PUT (`Admin, ContentManager`) — a defensible choice (delete is more destructive than edit).
- The role `SuperAdmin` is **dead** in the authorization layer: the codebase has no controller method that requires it, but the frontend offers SuperAdmin-only affordances. This is a pre-existing inconsistency, not introduced by the recent change.

---

## 5. Recommendation

**No change is required for this task.**

Specifically:

1. **The DELETE authorization as `[Authorize(Policy = "RequireAdmin")]` (= `RequireRole("Admin")`) is consistent with the program's stated design intent** (`Program.cs` line 94: *"SuperAdmin policy removed - Admin has full privileges"*). It matches the authorization model used by every other destructive admin endpoint in the application. No privilege escalation, no security regression, no weakening of the auth boundary.

2. **The frontend ↔ backend inconsistency (Delete button visible to SuperAdmin only, backend rejects SuperAdmin, Admin can delete via API but sees no button) is pre-existing** — the original audit report (`reports/CMS_SiteSettings_Audit_Report.md` lines 418-420, 540) already flagged it and explicitly recommended `Optional: add [Authorize(Roles = "SuperAdmin")] to Create so the UI claim "SuperAdmin required" matches the server`. That recommendation was marked optional and **explicitly out of scope** for the Site Settings cleanup that was completed earlier. The Phase 3 task here was scoped to *"make the Delete endpoint actually work"* — not to reconcile the SuperAdmin role model. Reopening that discussion would be a separate architectural task.

3. **The soft-delete cannot cascade to other business data** — verified at the handler level, the entity level, and the FK schema level.

4. **If the user does want the inconsistency fixed later**, the smallest scoped fix is one of:
   - **(a) Backend widens to include SuperAdmin** (one line): change `[Authorize(Policy = "RequireAdmin")]` on Delete to `[Authorize(Roles = "Admin,SuperAdmin")]`, matching POST/PUT.
   - **(b) Frontend widens to include Admin** (two lines): change `const isSuperAdmin = ...` in `CmsPagesAdmin.js` to also treat `Admin` as authorized. Update the "New Page" button gate the same way.
   - **(c) Both** — most consistent, least confusing for admins.

   But none of these are required for safety or correctness as of this audit. The current implementation does not weaken authorization, does not allow unauthorized deletion, and does not leak data to the wrong roles. The mismatch is purely a UX / messaging issue ("Delete failed. (SuperAdmin required)" is wrong text).

**Read-only audit complete. No changes were made.**