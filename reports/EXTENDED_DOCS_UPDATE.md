# EXTENDED_DOCS_UPDATE — v2.0.0 Documentation Patch

> **Scope:** Documentation update for the **v2.0.0** "Data Protection" milestone.
> New infrastructure features landed: **Soft Delete Pattern** + **Audit Log MVP**.
> This file summarises every documentation change for reviewers and release notes.

| Date       | Author       | Affected docs                      |
|------------|--------------|------------------------------------|
| 28/09/2026 | Documentation pass | `docs/DATABASE.md`, `docs/ARCHITECTURE.md` |

---

## 1. What changed (high level)

Two complementary, **automatic** mechanisms protect data in v2.0.0. Both are wired
into `GiveAIDDbContext.SaveChangesAsync` — application code never touches them
directly:

1. **Soft Delete Pattern** — `BaseEntity.IsDeleted` + `DeletedAt`, a global
   query filter (`WHERE IsDeleted = false`) on every `BaseEntity`, and an
   intercept that converts `EntityState.Deleted` calls into soft-delete updates.
2. **Audit Log MVP** — every Create/Update/Delete on a `BaseEntity` is captured
   into a new `audit_logs` table (`old_values` / `new_values` JSON snapshots),
   with `UserId`, `Timestamp`, `EntityType`, `EntityId`, `IpAddress`, `UserAgent`.

Migration that ships these tables: **`20260928073005_AddAuditLogTable`**.

---

## 2. Changes to `docs/DATABASE.md`

| Section            | Change                                                                                                                  |
|--------------------|-------------------------------------------------------------------------------------------------------------------------|
| §1 Schema Overview | Added `audit_logs` to the "Other entities" list. **Added a sidecar block** under the ER diagram showing the audit_logs table + its 3 indexes, with a caption calling out that it is append-only and never mutated by application code. |
| §2.9 `audit_logs`  | **New section** — full column table (`audit_log_id`, `user_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `timestamp`, `ip_address`, `user_agent`), the 3 indexes (`idx_audit_logs_user_id`, `idx_audit_logs_timestamp`, `idx_audit_logs_entity`), purpose (compliance, change tracking, forensics), and a note that audit fields are excluded from JSON snapshots. |
| §2.9 Example queries | **New sub-section** — three SQL examples: changes by user (last 30 days), change history for a specific entity (Campaign 7), recent soft-deletes (last 7 days). |
| §3 Migration Order | Added a "Notable migrations" table that calls out `…_AddAuditLogTable` explicitly, with a note that no backfill of historical changes is performed. |
| §4 Indexes Cheat Sheet | Added an `audit_logs` row with its 3 indexes. |
| §9 Data Retention  | Added `audit_logs` → "Indefinite (compliance record)" and a note that rows must not be hard-deleted; cold-storage archival is permitted. |

---

## 3. Changes to `docs/ARCHITECTURE.md`

| Section        | Change                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| §2 Layer Overview (diagram) | Updated the Infrastructure box to include "Soft Delete + Audit Log intercept (SaveChangesAsync → audit_logs sidecar)" and the Domain box to note "`BaseEntity: IsDeleted, DeletedAt`". Added a callout pointing to §6.1 explaining that every write path is intercepted.                                                                                                                                                                  |
| §4 Entity Catalogue | Added **`AuditLog`** row (purpose: "Append-only change log auto-populated by SaveChangesAsync").                                                                                                                                                                                                                                                                                                                                       |
| §6 Infrastructure Layer (folder tree) | Updated `GiveAIDDbContext.cs` annotation to reference the `SaveChangesAsync` intercept. Added "incl. `AuditLogConfiguration`" under `Configurations/`. Added a `Persistence/Entities/` placeholder for query-side re-exports. Added "incl. `…_AddAuditLogTable` for v2.0.0" under `Migrations/`.                                                                                                                                    |
| §6 Cross-cutting Concerns | Added "Data protection" bullet pointing to §6.1.                                                                                                                                                                                                                                                                                                                                                                                          |
| §6.1 Data Protection Patterns (**new**) | New section with two subsections:                                                                                                                                                                                                                                                                                                                                                                                                       |
|                  | • **Soft Delete Pattern** — Aspect table covering base fields, global filter, interception, querying deleted (`IgnoreQueryFilters()`), restore behaviour. **Caveats** sub-block about `Restrict` FK cascades for soft-deletable parents.                                                                                                                                                                                                     |
|                  | • **Audit Log MVP** — Aspect table covering entity location, configuration location, tracking scope, snapshot rules (skip audit fields), identity (UserId from `ICurrentUserService`, IpAddress/UserAgent reserved for middleware hook), performance (indexes).                                                                                                                                                                                |
|                  | • Top of §6.1 — ASCII diagram of `SaveChangesAsync` interception showing the Added/Modified/Deleted branches, the soft-delete flip-to-Modified, and the audit-log sidecar written in the same transaction.                                                                                                                                                                                                                              |
| §10 Database    | Appended "`audit_logs` (append-only, auto-populated by SaveChangesAsync — see §6.1)" to the key-tables list.                                                                                                                                                                                                                                                                                                                            |

---

## 4. Terminology alignment (cross-doc consistency)

These terms are now used identically across **`README.md`**, **`AI_GUIDE.md`**,
**`docs/DATABASE.md`**, **`docs/ARCHITECTURE.md`**, and the source comments:

- **Soft delete pattern** (also referred to as **"Soft Delete Pattern"** in code)
- **Audit log MVP** / **audit_logs** (snake_case table name preserved)
- **Global query filter** — `WHERE IsDeleted = false`
- **`ICurrentUserService`** — single source of `UserId` for both `CreatedBy` / `UpdatedBy` (on `BaseEntity`) and the `audit_logs.user_id` column
- **SaveChangesAsync intercept** — both behaviours are documented as living in the same override, in the same commit
- **`BaseEntity`** — always referenced as the abstract base class carrying `IsDeleted` + `DeletedAt`

---

## 5. Verification checklist (reviewer-friendly)

- [x] `docs/DATABASE.md` mentions `audit_logs` in §1, §2.9, §3, §4, §9
- [x] `docs/DATABASE.md` §2.9 lists **every column** in the task spec and **all 3 indexes**
- [x] `docs/DATABASE.md` §2.9 includes example queries for: changes-by-user, entity history, recent deletes
- [x] `docs/DATABASE.md` §2.9 notes "Auto-populated by SaveChangesAsync, no manual insert needed"
- [x] `docs/ARCHITECTURE.md` §6.1 covers **Soft Delete Pattern** (base fields, global filter, intercept, IgnoreQueryFilters, benefits)
- [x] `docs/ARCHITECTURE.md` §6.1 covers **Audit Log MVP** (automatic tracking, JSON snapshots, who/when/what, indexes)
- [x] `docs/ARCHITECTURE.md` §6 mentions `AuditLog` entity, `AuditLogConfiguration`, and the SaveChangesAsync enhancement
- [x] `docs/ARCHITECTURE.md` §2 diagram calls out SaveChangesAsync interception and the audit_logs sidecar
- [x] Terminology (soft delete / audit log / SaveChangesAsync) consistent with `README.md` and `AI_GUIDE.md`
- [x] Migration `20260928073005_AddAuditLogTable` referenced explicitly
- [x] No references to file paths that don't exist (`BaseEntity.cs`, `AuditLog.cs`, `AuditLogConfiguration.cs`, `GiveAIDDbContext.cs`, the migration file all verified to be present)

---

## 6. Related files (unchanged but referenced)

- `src/Domain/Entities/BaseEntity.cs` — defines `IsDeleted`, `DeletedAt`
- `src/Domain/Entities/AuditLog.cs` — domain entity
- `src/Infrastructure/Persistence/Configurations/AuditLogConfiguration.cs` — fluent mapping + indexes
- `src/Infrastructure/Persistence/Migrations/20260928073005_AddAuditLogTable.cs` — DDL
- `src/Infrastructure/Persistence/GiveAIDDbContext.cs` — `OnModelCreating` (global filter) + `SaveChangesAsync` (intercept)