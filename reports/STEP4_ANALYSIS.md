# BƯỚC 4: QUYẾT ĐỊNH ADMIN UI (M-01) - PHÂN TÍCH

**Ngày:** 28/09/2026 14:15 (UTC+7)  
**Issue:** M-01 - Admin Razor 15/24 controllers stub

---

## 📋 HIỆN TRẠNG

### React Admin (GiveAID.Client/src/pages/admin/)

**Port:** 3000 (integrated trong React app chính)  
**Route:** `/admin/*` (protected by ADMIN_ROLES in App.js)  
**Layout:** AdminLayout.js (separate từ public site)

**Pages (25 files .js):**
```
✅ AdminDashboard.js              - Dashboard chính
✅ AdminCampaignPage.js           - Campaigns CRUD
✅ AdminCampaignReportsPage.js    - Campaign reports
✅ AdminDonationsPage.js          - Donations management
✅ AdminUsersPage.js              - User management
✅ AdminGalleryPage.js            - Gallery management
✅ AdminAchievementsPage.js       - Achievements CRUD
✅ AdminNgoPage.js                - Organizations
✅ AdminPartnersPage.js           - Partners
✅ AdminCmsPage.js                - CMS Pages
✅ AdminAboutPage.js              - About content
✅ AdminContactPage.js            - Contact info
✅ AdminQueriesPage.js            - User queries
✅ AdminInvitationsPage.js        - Invitations
✅ AdminRegistrationsPage.js      - Campaign registrations
+ 10 helper components (AchievementsAdmin, CareersAdmin, TeamAdmin, etc.)
```

**Đặc điểm:**
- Tích hợp với AuthContext (JWT authentication)
- API calls qua axios → WebApi endpoints
- UI/UX hiện đại (Bootstrap 5 + recharts for charts)
- Tất cả 13 admin routes trong App.js đều có implementation đầy đủ

---

### Razor Admin (src/Web/)

**Port:** Chưa rõ (launchSettings.json không tìm thấy)  
**Dự kiến:** 5069 (theo AUDIT_REPORT.md)  
**Architecture:** ASP.NET Core MVC Areas

**Project structure:**
```
src/Web/
├── Program.cs                    - Cookie auth, ApiClient DI
├── Services/
│   ├── ApiClient.cs              - HTTP wrapper để gọi WebApi
│   └── AdminSession.cs           - Session management
├── Areas/Admin/
│   ├── Controllers/
│   │   ├── AuthController.cs          ✅ Login/Logout
│   │   ├── DashboardController.cs     🟡 STUB (API calls fail silently)
│   │   ├── CampaignsController.cs     ✅ CRUD (fetch từ API)
│   │   ├── DonationsController.cs     ✅ CRUD
│   │   ├── CausesController.cs        ✅ CRUD
│   │   ├── UsersController.cs         ✅ CRUD
│   │   └── StubControllers.cs         ❌ 11 STUB controllers:
│   │       - GalleryController
│   │       - CampaignReportsController
│   │       - OrganizationsController
│   │       - TeamController
│   │       - AchievementsController
│   │       - CareersController
│   │       - FaqsController
│   │       - CmsPagesAdminController
│   │       - EmailLogsController
│   │       - ConversationsController
│   │       - SettingsController
│   └── Views/
│       └── (29 .cshtml files) - Có views nhưng controllers stub
```

**Authentication:** Cookie-based (AdminCookie), không dùng JWT

**Vấn đề:**
1. **DashboardController:** Gọi API nhưng catch exception và hiển thị empty state
2. **11 Stub controllers:** Chỉ fetch data qua ApiClient, truyền vào ViewData, return View()
3. **Views tồn tại:** 29 .cshtml files (layout, login, CRUD views) nhưng controllers chưa hoàn chỉnh
4. **Không được sử dụng:** START.bat chỉ khởi động React (port 3000) + WebApi (port 5231), không khởi động Web project

---

## 🔍 SO SÁNH

| Tiêu chí | React Admin | Razor Admin |
|----------|-------------|-------------|
| **Completeness** | ✅ 100% (25/25 pages) | 🟡 ~33% (4/15 working) |
| **UI/UX** | ✅ Modern (Bootstrap 5, responsive) | ❓ Unknown (views exist but untested) |
| **Authentication** | ✅ JWT (integrated với public site) | 🟡 Cookie (separate auth flow) |
| **API Integration** | ✅ Direct axios calls | 🟡 Via ApiClient wrapper (thêm 1 layer) |
| **Deployment** | ✅ Single React app (public + admin) | ❌ Cần deploy 2 projects (Web + WebApi) |
| **Maintenance** | ✅ Đã được develop & test | ❌ Chưa hoàn thiện, chưa test |
| **In Use** | ✅ START.bat starts React | ❌ Web project không được start |
| **Specification** | ❓ Unknown | ❓ Unknown |

---

## 📖 AUDIT REPORT (M-01) NÓI GÌ?

Từ `AUDIT_REPORT.md:119-125`:

> **Admin Dashboard** | 🟡 PARTIAL | `AdminDashboardController.cs:19-78` (stats API)<br/>`AdminDashboard.js` (React)<br/>❌ `Web/Areas/Admin/DashboardController.cs` (Razor stub)
> 
> ✅ React admin dashboard có charts (recharts)
> ❌ **Razor admin dashboard chỉ là stub** → nếu dùng Razor (port 5069) sẽ không có dashboard thật
> 
> **Admin CRUD** | 🟡 PARTIAL | Controllers có 28 endpoints admin<br/>React admin pages: 23 files<br/>Razor admin: **15/24 stub**
> 
> ✅ React admin pages có CRUD UI
> ❌ **Razor admin pages** (Web project) hầu hết chưa implement

**Khuyến nghị từ audit:**
> **Khuyến nghị:** Quyết định dùng React admin (port 3000/admin) hay Razor (port 5069). Nếu Razor thì cần complete 15 controllers còn thiếu.

---

## 🎯 QUYẾT ĐỊNH THEO PLAN

Từ user instructions (Bước 4):

> "React admin đã có đủ API và 23 trang, nên **mặc định chọn nó làm admin duy nhất và bỏ Razor stub**. Ngoại lệ: nếu spec bắt buộc phần ADMIN dùng MVC/Razor thì làm ngược lại, hoàn thiện Razor cho các chức năng bắt buộc. **Kiểm tra lại spec trước khi xoá gì**."

**Cần làm:**
1. ✅ Kiểm tra specification (README, requirements docs) xem có yêu cầu Razor không
2. ⏳ Nếu KHÔNG có yêu cầu Razor:
   - Archive Razor: `git tag archive/razor-admin`
   - Xóa `src/Web/` folder
   - Xóa khỏi solution file
   - Xóa references trong README/documentation
3. ⏳ Test admin flow: Login → Dashboard → CRUD → 403 cho non-admin

---

## 🔎 KIỂM TRA SPECIFICATION

**README.md (đã đọc dòng 1-80):**
- Không mention Razor admin
- Chỉ nói "Public React site + Admin Razor console + ASP.NET Core WebApi"
- Nhưng START.bat chỉ start React + WebApi (không start Web project)

**Cần check thêm:**
- Project requirements document
- VERIFICATION_CHECKLIST.md
- Commit messages (có thể có context)

---

## 🤔 RECOMMENDATION

**Evidence cho XÓALÀ:**
1. ✅ React admin 100% complete vs Razor 33% complete
2. ✅ START.bat không start Web project → không được sử dụng
3. ✅ React integrated auth (JWT) vs Razor separate auth (Cookie) → maintenance overhead
4. ✅ Single deployment (React) vs dual deployment (React + Web)
5. ✅ 11/15 Razor controllers chỉ là boilerplate stub

**Evidence cho GIỮ LẠI:**
1. ❓ README mention "Admin Razor console" (nhưng có thể outdated)
2. ❓ Specification chưa được kiểm tra đầy đủ
3. ❓ Có 29 .cshtml views (effort đã bỏ vào)

**KHUYẾN NGHỊ:**
→ **XÓA Razor Admin** (src/Web/) vì:
- React admin đã production-ready
- Razor admin chưa hoàn thiện và không được sử dụng
- Giảm maintenance burden

→ **NHƯNG:** Check specification docs trước khi xóa (theo plan Bước 4)

---

## 📝 NEXT STEPS

1. ✅ Tìm và đọc specification document (VERIFICATION_CHECKLIST, requirements.md, etc.)
2. ⏳ Nếu spec KHÔNG yêu cầu Razor:
   - Tag: `git tag archive/razor-admin HEAD`
   - Delete: `src/Web/`
   - Update: `GiveAID.V2.slnx` (remove Web project)
   - Update: README (remove port 5069 references)
   - Update: CORS config (remove port 5069 if exists)
3. ⏳ Test React admin:
   - Login as admin → dashboard loads
   - CRUD campaign → API calls work
   - Login as demo → /admin returns 403
4. ⏳ Commit: "refactor(M-01): remove Razor admin, React admin is primary"

---

**Câu hỏi cho user:**
Bạn có document specification/requirements nào đề cập đến việc **BẮT BUỘC** dùng Razor admin không? Hoặc tôi nên check files nào?
