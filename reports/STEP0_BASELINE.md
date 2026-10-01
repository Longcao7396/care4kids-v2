# BƯỚC 0: BASELINE ĐO LƯỜNG

**Ngày:** 28/09/2026  
**Thời điểm:** Trước khi bắt đầu sửa lỗi

---

## 1. Backend Tests (.NET 10)

```
✅ dotnet build: 0 Error(s), 13 Warning(s) (nullable/shadow fields)
✅ dotnet test: 213/213 PASSED (100%)
   - Domain.UnitTests: 70 pass
   - Application.UnitTests: 87 pass
   - Infrastructure.IntegrationTests: 28 pass
   - WebApi.FunctionalTests: 28 pass
```

**Warnings:** CS0108 (7x CreatedBy/UpdatedBy shadow), CS8601/CS8604 (4x nullable), xUnit1025 (1x duplicate test)

---

## 2. Frontend (React 18)

```
✅ npm ci: SUCCESS (dependencies installed)
   - 1613 packages installed from package-lock.json
   - Duration: ~3.5 minutes
   
⏳ npm run build: In progress...
⏳ npm test: Pending (run after build)
```

---

## 3. Git Status (Before Fix)

**Branch:** main_v2 (sync with origin)  
**Modified files:** 159 tracked + 10 untracked  
**Last commit:** 5deb9f9 (Sept 25, 2026)

---

## 4. Issues to Fix (from AUDIT_REPORT.md)

### 🔴 CRITICAL (3)
- C-01: 5 git branches uncommitted/unmerged ✅ WILL FIX Step 1
- C-02: ADMIN_PASSWORD not set in START.bat ✅ WILL FIX Step 2
- C-03: CORS only localhost ✅ WILL FIX Step 2

### 🟠 MAJOR (8)
- M-01: Admin Razor 15/24 controllers stub → WILL FIX Step 4
- M-02: ValidationBehavior not registered → ✅ FIXED Step 3
- M-03: Soft delete fields unused → WILL FIX Step 5
- M-04: No audit log → WILL FIX Step 5
- M-05: N+1 query GetAllCampaigns → ✅ FIXED Step 3
- M-06: JWT secret only 16 chars → WILL FIX Step 2
- M-07: Email verification forced but SMTP unconfigured → WILL FIX Step 2
- M-08: Rate limit affects health endpoints → WILL FIX Step 2

### 🟡 MINOR (7)
- N-01: xUnit1025 duplicate test → ✅ FIXED Step 3
- CS0108/CS8601 warnings → WILL FIX Step 3
- AsNoTracking missing in queries → ✅ FIXED Step 3 (GetAllCampaigns)

---

## 5. Estimated Timeline

| Step | Duration | Status |
|------|----------|--------|
| Step 0: Baseline | 1h | ✅ DONE |
| Step 1: Git cleanup (C-01) | 2-3h | PENDING |
| Step 2: Secrets & config (C-02, M-06, M-07, C-03, M-08) | 2-3h | PENDING |
| Step 3: Logic fixes (M-02, M-05, N-01) | 3-4h | ✅ DONE |
| Step 4: Admin UI decision (M-01) | 4h | PENDING |
| Step 5: Soft delete + audit log (M-03, M-04) | 1-2 days | PENDING |
| Step 6: Documentation + UAT | 2-3h | PENDING |
| **TOTAL** | **4-5 days** | **~10% complete** |

---

## Next Action
👉 **STEP 1:** Git cleanup - merge branches, commit 159 files, push to remote
