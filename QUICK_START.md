# 🚀 QUICK START GUIDE - Give-AID NGO Platform

## ⏱️ 10-Minute Setup

### Prerequisites Checklist
- [ ] Visual Studio 2019/2022 hoặc VS Code
- [ ] .NET Framework 4.7.2+
- [ ] SQL Server 2019+ (Express/Developer/Standard)
- [ ] Node.js 16+ và npm
- [ ] Git (optional)

---

## 📦 Step 1: Database Setup (3 phút)

> **Single source of truth:** `(localdb)\MSSQLLocalDB` — matches
> `src/WebApi/appsettings.Development.json`. LocalDB ships with Visual Studio,
> nên **không cần cài SQL Server riêng**.

### Cách nhanh nhất: để ứng dụng tự tạo database

```powershell
cd "C:\Users\admin\Desktop\project NGO.v2"
dotnet run --project src\WebApi\GiveAID.V2.WebApi.csproj
# Lần chạy đầu tiên tự động tạo schema + seed admin user.
```

### Hoặc apply schema + seed tường minh

```powershell
powershell -ExecutionPolicy Bypass -File database\99_Apply-All.ps1
```

### Hoặc smoke-test kết nối (không ghi dữ liệu)

```powershell
powershell -ExecutionPolicy Bypass -File verify-database.ps1
```

✅ **Kết quả mong đợi:** Tất cả `[OK]` màu xanh, exit code `0`. Script sẽ in
hints cụ thể nếu có lỗi.

> Nếu trước đây bạn dùng `.\SQLEXPRESS` mà bảng trống, nhiều khả năng bạn
> đang connect vào **sai instance**. Xem README "Switching to SQL Server Express"
> nếu thực sự cần Express.

---

## 🔧 Step 2: Backend Setup (3 phút)

### Option A: Visual Studio

1. **Mở Solution**
   ```
   Mở: GiveAID.Web\GiveAID.Web.sln
   ```

2. **Restore NuGet Packages**
   ```
   Tools > NuGet Package Manager > Restore NuGet Packages
   ```

3. **Update Connection String** (chỉ khi cần — mặc định đã dùng LocalDB):
   ```json
   // src/WebApi/appsettings.Development.json
   "DefaultConnection": "Server=(localdb)\\MSSQLLocalDB;Database=GiveAIDDB;Integrated Security=True;MultipleActiveResultSets=True;TrustServerCertificate=True;Connect Timeout=15"
   ```

4. **Build & Run**
   ```
   Press F5 hoặc Click "IIS Express"
   ```

   Backend sẽ chạy tại: `https://localhost:44300`

### Option B: Command Line

```bash
cd GiveAID.Web

# Restore packages using the repository NuGet.config.
nuget restore GiveAID.Web.sln

# Build
msbuild GiveAID.Web.csproj /p:Configuration=Release

# Run (cần IIS Express trong PATH)
"C:\Program Files\IIS Express\iisexpress.exe" /path:%cd% /port:44300
```

✅ **Verify:** Mở browser và truy cập:
```
https://localhost:44300/api/causes
```
Nếu thấy JSON response → Backend OK!

---

## ⚛️ Step 3: Frontend Setup (2 phút)

```bash
# Navigate to client folder
cd C:\Users\admin\Desktop\project\GiveAID.Client

# Install dependencies
npm install

# Start development server
npm start
```

Frontend sẽ chạy tại: `http://localhost:3000`

✅ **Verify:** Browser tự động mở và hiển thị trang Home

---

## 🎯 Step 4: Test Everything (2 phút)

### Test 1: Login với Admin Account
```
URL: http://localhost:3000/login
Username: admin
Password: Admin@123
```

> **Lưu ý:** Trường login chỉ chấp nhận **username** (case-insensitive). Email không còn là identifier hợp lệ.

### Test 2: Login với Demo User
```
Username: demo
Password: Demo@123
```

### Test 3: Tạo User mới
```
URL: http://localhost:3000/register
Điền form → Submit
```

### Test 4: Xem Causes
```
URL: http://localhost:3000/causes
Nên thấy 3 causes: Children Welfare, Education, Healthcare
```

### Test 5: Make Donation
```
1. Login
2. Go to /donate
3. Select cause, enter amount
4. Fill card details (any test data)
5. Submit
```

---

## 🐛 Troubleshooting

### ❌ Problem: "Cannot connect to database"

**Solution:**
```powershell
# 1. Chạy verify-database.ps1 để chẩn đoán tự động
powershell -ExecutionPolicy Bypass -File verify-database.ps1

# 2. LocalDB chưa chạy?
sqllocaldb info MSSQLLocalDB
sqllocaldb start MSSQLLocalDB

# 3. Test connection thủ công
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -Q "SELECT @@VERSION"
```

### ❌ Problem: "CORS error" in browser console

**Solution:** Kiểm tra backend đang chạy ở đúng port 44300:
```
Web.config → Đảm bảo CORS header có:
Access-Control-Allow-Origin: http://localhost:3000
```

### ❌ Problem: "npm install failed"

**Solution:**
```bash
# Clear cache và thử lại
npm cache clean --force
npm install
```

### ❌ Problem: "NuGet packages not found"

**Solution:**
```bash
# Trong Visual Studio Package Manager Console:
Update-Package -reinstall

# Hoặc command line:
nuget restore GiveAID.Web.sln
```

### ❌ Problem: Backend port 44300 already in use

**Solution:**
```bash
# Find process using port
netstat -ano | findstr :44300

# Kill process (replace PID)
taskkill /PID <PID> /F

# Hoặc đổi port trong Properties > Web > Project Url
```

---

## 📊 Default Data Seeded

### Users
| Username | Password | Role | Email |
|----------|----------|------|-------|
| admin | Admin@123 | Admin | admin@give-aid.org |
| demo | Demo@123 | User | demo@give-aid.org |

### Causes (3)
- Children Welfare (Target: $100,000)
- Education (Target: $75,000)
- Healthcare (Target: $150,000)

---

## 🌐 API Endpoints Reference

### Base URL: `https://localhost:44300/api`

#### Authentication
```
POST /auth/register    - Register new user
POST /auth/login       - Login
GET  /auth/me          - Get current user (requires token)
POST /auth/logout      - Logout
```

#### Causes
```
GET    /causes              - Get all causes
GET    /causes/{id}         - Get cause details
POST   /causes              - Create cause (Admin)
PUT    /causes/{id}         - Update cause (Admin)
DELETE /causes/{id}         - Delete cause (Admin)
GET    /causes/stats        - Get statistics (Admin)
```

#### Donations
```
GET  /donations              - Get user donations
GET  /donations/{id}         - Get donation details
POST /donations              - Create donation
GET  /donations/stats        - Get statistics (Admin)
```

#### Programmes
```
GET  /programmes                    - Get all programmes
GET  /programmes/{id}               - Get programme details
POST /programmes/{id}/register      - Register for programme
GET  /programmes/my-registrations   - Get user registrations
GET  /programmes/{id}/registrations - Get programme registrations (Admin)
POST /programmes                    - Create programme (Admin)
PUT  /programmes/{id}               - Update programme (Admin)
```

---

## 🔐 JWT Authentication

**How to use in API calls:**

```javascript
// After login, save token
const token = response.data.token;
localStorage.setItem('token', token);

// Use in subsequent requests
axios.get('/api/causes', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 📱 Test with Postman

1. **Import Collection:** Create new collection
2. **Set Variables:**
   - `baseUrl`: `https://localhost:44300/api`
   - `token`: (will be set after login)

3. **Login Request:**
   ```
   POST {{baseUrl}}/auth/login
   Body (JSON):
   {
     "username": "admin",
     "password": "Admin@123"
   }
   ```

4. **Copy token from response** → Set as variable

5. **Test Protected Endpoint:**
   ```
   GET {{baseUrl}}/donations
   Headers:
   Authorization: Bearer {{token}}
   ```

---

## 📁 Project Structure Summary

```
project/
├── Database/                    # SQL scripts
│   └── NGO_Database_Schema_V2.sql
│
├── GiveAID.Web/                # Backend (ASP.NET)
│   ├── Controllers/            # API Controllers
│   ├── Models/                 # Entity Models
│   ├── Data/                   # DbContext
│   ├── Helpers/                # JWT Helper
│   └── Web.config              # Configuration
│
└── GiveAID.Client/             # Frontend (React)
    ├── src/
    │   ├── components/         # Navbar, Footer
    │   ├── pages/              # All pages
    │   ├── services/           # API services
    │   ├── contexts/           # Auth context
    │   └── App.js
    └── package.json
```

---

## 🎨 Design Tokens

```css
/* Colors */
--primary-navy: #0F172A
--primary-slate: #1E293B
--accent-sky: #38BDF8
--accent-orange: #F97316
--text-light: #F8FAFC

/* Typography */
Font: Inter (Google Fonts)
Headings: 700-800 weight
Body: 400-500 weight

/* Spacing */
Border radius: 8px (cards), 12px (buttons)
Shadow: 0 4px 6px rgba(0,0,0,0.1)
```

---

## 🚀 Next Steps After Setup

1. ✅ **Explore Features:**
   - Try making a donation
   - Register for a programme
   - Browse causes

2. ✅ **Customize:**
   - Update logo and branding
   - Modify color scheme in `styles/variables.css`
   - Add your organization information

3. ✅ **Deploy:**
   - Backend to Azure App Service or IIS
   - Frontend to Netlify/Vercel
   - Database to Azure SQL

4. ✅ **Extend:**
   - Add admin dashboard
   - Implement email notifications
   - Add payment gateway (Stripe/PayPal)
   - Generate reports

---

## 📞 Support & Resources

- 📖 **Full Documentation:** See `README.md`
- 🗄️ **Database Schema:** See `Database/NGO_Database_ERD.md`
- 🔄 **API Reference:** See section above
- 🐛 **Issues:** Check Troubleshooting section

---

## ✅ Success Checklist

Sau khi setup, bạn nên có thể:

- [ ] Truy cập backend API tại https://localhost:44300/api/causes
- [ ] Truy cập frontend tại http://localhost:3000
- [ ] Login với admin account
- [ ] Xem danh sách causes
- [ ] Tạo donation
- [ ] Xem programmes
- [ ] Register cho programme
- [ ] View dashboard

**Nếu tất cả ✅ → Setup thành công! 🎉**

---

**Chúc bạn phát triển thành công! 💚**
