# 🚀 INSTALL — Run GiveAID v2.0 from a clean Windows machine

> Đọc file này từ đầu đến cuối nếu bạn chưa từng chạy project này.
> Tổng thời gian: ~10 phút nếu mạng tốt (lần đầu), ~30 giây (lần sau).

---

## 1. Yêu cầu phần mềm (prerequisites)

| Tool | Phiên bản tối thiểu | Cách cài |
|------|---------------------|----------|
| Windows | 10 / 11 (64-bit) | đã có sẵn |
| **.NET SDK** | **10.0** (khuyến nghị 10.0.401 trở lên) | <https://dotnet.microsoft.com/download/dotnet/10.0> → SDK → Windows x64 → cài .exe |
| **Node.js** | **Node 18 LTS, 20 LTS, hoặc 22+** | <https://nodejs.org/> → nút "LTS" lớn màu xanh → cài .msi |
| **npm** | đi kèm với Node.js | tự động có |
| **SQL Server LocalDB** | **BẮT BUỘC** — xem mục ⚠ bên dưới | cần cài riêng (không có sẵn trong .NET SDK) |

> ⚠ **QUAN TRỌNG — SQL Server LocalDB**:
>
> LocalDB **KHÔNG** được cài tự động bởi .NET SDK. Nó là một sản phẩm SQL Server
> riêng biệt, thường được cài kèm Visual Studio (với "Data Storage and Processing"
> hoặc "ASP.NET and web development" workload) hoặc SQL Server Express.
>
> **Có 3 cách cài LocalDB trên máy mới** (chọn **một**):
>
> 1. **SQL Server 2022/2025 Express (khuyến nghị, đơn giản nhất):**
>    <https://www.microsoft.com/sql-server/sql-server-downloads> → tải **Express**
>    → tick chọn **LocalDB** trong installer.
> 2. **Visual Studio Installer:** Modify VS → tab "Individual components" → tick
>    "SQL Server 2022/2025 Express LocalDB".
> 3. **Standalone LocalDB MSI:** nằm trong folder `...\x64\Setup\x64\SqlLocalDB.msi`
>    của bộ SQL Server Express ISO.
>
> Sau khi cài, mở PowerShell mới và kiểm tra:
> ```powershell
> sqllocaldb versions    # phải liệt kê version (vd 17.0.x)
> sqllocaldb info MSSQLLocalDB   # nếu lỗi "not installed" → cài lại
> ```
>
> Project dùng `(localdb)\MSSQLLocalDB` làm canonical instance — đây là tên
> instance mặc định của LocalDB, được tạo tự động khi user chạy `sqllocaldb create MSSQLLocalDB`
> hoặc khi có ứng dụng đầu tiên kết nối.

### Kiểm tra sau khi cài

Mở PowerShell mới (`Win + R` → gõ `powershell` → Enter) rồi gõ:

```powershell
dotnet --version        # phải ra 10.x (ví dụ 10.0.401)
node --version          # phải ra v18+ hoặc v20+
npm --version           # phải ra 9+
sqllocaldb versions     # phải liệt kê version SQL Server LocalDB
```

---

## 2. Lấy source code

### Cách A: Clone qua Git

```powershell
cd C:\Users\<TÊN_BẠN>\Desktop   # hoặc bất kỳ đâu
git clone <repo-url> "project NGO.v2"
cd "project NGO.v2"
```

### Cách B: Giải nén từ file .zip

1. Tải file `.zip` về `C:\Users\<TÊN_BẠN>\Desktop\` (hoặc ổ khác — **tránh `Program Files`**).
2. Giải nén ra `C:\Users\<TÊN_BẠN>\Desktop\project NGO.v2`.
3. Mở PowerShell tại thư mục đó.

> Tên thư mục **có thể đổi** — không bắt buộc phải là `project NGO.v2`. Scripts sẽ tự dò tìm file `GiveAID.V2.slnx`.

---

## 3. Cấu hình (configuration)

### Mặc định đã chạy được

Project **đã có sẵn** cấu hình dev an toàn để chạy local ngay:

| File | Vai trò | Đã có giá trị? |
|------|--------|----------------|
| `src/WebApi/appsettings.Development.json` | Connection string LocalDB + JWT secret 64-char (dev-only) | ✅ có sẵn |
| `src/WebApi/appsettings.json` | Template trống cho prod (KHÔNG có secret) | ✅ có sẵn |
| `src/WebApi/Properties/launchSettings.json` | Port 5231 + `ASPNETCORE_ENVIRONMENT=Development` | ✅ có sẵn |
| `GiveAID.Client/src/config.js` | Frontend trỏ về `http://localhost:5231/api/v1` | ✅ có sẵn |
| `START.bat` | Tự set env vars cho dev passwords | ✅ có sẵn |

### Tuỳ chỉnh (không bắt buộc)

Sao chép `GiveAID.Client/.env.example` → `GiveAID.Client/.env` nếu muốn override URL API/proxy.
Sao chép `.env.example` (root) → `.env` nếu muốn override cấu hình backend (JWT secret tuỳ chỉnh, connection string khác, v.v.).

> **Cả hai file `.env` này đều đã được .gitignore** — bạn có thể thêm secret thoải mái mà không sợ bị commit.

### KHÔNG cần đổi gì nếu chỉ chạy local dev

---

## 4. Khởi động — `npm start` (lệnh duy nhất)

Tại thư mục root của project:

```powershell
cd "<đường-dẫn-đến>\project NGO.v2"
npm install --prefix GiveAID.Client      # lần đầu mất 2-5 phút
npm start --prefix GiveAID.Client
```

Hoặc đơn giản hơn, **double-click `START.bat`** ở root project.

Sau ~20-60 giây:
- Backend sẽ chạy tại <http://localhost:5231>
- Frontend sẽ chạy tại <http://localhost:3000>
- Trình duyệt tự mở <http://localhost:3000>

> Lần đầu tiên, backend **tự động**:
> 1. Tạo database `GiveAIDDB` trên LocalDB (nếu chưa có)
> 2. Áp dụng EF Core migrations (tạo schema)
> 3. Seed admin user + demo data
>
> Nếu cần xem trạng thái, mở log: `GiveAID.Client\scripts\backend.log`

---

## 5. Tài khoản mặc định

| Role  | Username | Password    | Email                |
|-------|----------|-------------|----------------------|
| Admin | `admin`  | `Admin@123` | admin@give-aid.org   |
| User  | `demo`   | `Demo@123`  | demo@give-aid.org    |

> Trường login chỉ chấp nhận **username**, không phải email.

---

## 6. Tắt server

Double-click `STOP.bat` ở root project.

Hoặc trong PowerShell đang chạy, nhấn `Ctrl + C`.

Hoặc nếu treo: mở Task Manager → End task các process tên `dotnet` và `node`.

---

## 7. Troubleshooting (xử lý lỗi thường gặp)

### ❌ `dotnet` không tìm thấy
- Cài .NET SDK 10: <https://dotnet.microsoft.com/download/dotnet/10.0>
- **Đóng PowerShell, mở lại** (để PATH mới có hiệu lực).

### ❌ `node` / `npm` không tìm thấy
- Cài Node.js 18+ từ <https://nodejs.org/>
- **Đóng PowerShell, mở lại**.

### ❌ `npm install` lỗi / mạng chậm
```powershell
cd GiveAID.Client
npm cache clean --force
npm install --registry https://registry.npmmirror.com
```
(registry mirror Trung Quốc nhanh hơn nếu mạng quốc tế chậm.)

### ❌ Port 3000 hoặc 5231 đã bị chiếm
- Chạy `STOP.bat` rồi `START.bat` lại.
- Hoặc thủ công:
  ```powershell
  Get-NetTCPConnection -LocalPort 3000  # tìm PID
  Stop-Process -Id <PID> -Force
  Get-NetTCPConnection -LocalPort 5231
  Stop-Process -Id <PID> -Force
  ```

### ❌ `npm start` báo lỗi `Cannot find module 'react-scripts'`
- Quên chạy `npm install --prefix GiveAID.Client`. Chạy lại.

### ❌ Backend crash với `STATUS_DLL_NOT_FOUND` / SNI error
- Project đã có fix `AppContext.SetSwitch("Switch.Microsoft.Data.SqlClient.UseManagedNetworkingOnWindows", true)` ở `Program.cs` để dùng managed networking, không cần file native SNI.
- Nếu vẫn lỗi: xoá thư mục `GiveAID.Client\node_modules` rồi `npm install` lại, **hoặc** thử `dotnet clean` + `dotnet build`.

### ❌ Database `GiveAIDDB` not found
- Backend **tự động tạo database** lần đầu chạy. Đợi ~30 giây.
- Nếu muốn kiểm tra nhanh:
  ```powershell
  sqlcmd -S "(localdb)\MSSQLLocalDB" -E -Q "SELECT name FROM sys.databases WHERE name='GiveAIDDB'"
  ```

### ❌ `Database connection failed` / `Cannot connect to LocalDB`
```powershell
sqllocaldb info MSSQLLocalDB       # xem trạng thái instance
sqllocaldb versions                # xem version LocalDB đã cài
sqllocaldb start MSSQLLocalDB      # start nếu đang stop
```

- **Nếu `sqllocaldb` không tồn tại / `'sqllocaldb' is not recognized`**: LocalDB chưa được cài. Quay lại mục ⚠ ở phần 1 và cài SQL Server Express hoặc LocalDB MSI.
- **Nếu `sqllocaldb versions` rỗng**: LocalDB chưa được cài đúng cách. Reinstall.
- **Nếu `info MSSQLLocalDB` báo instance không tồn tại**: tạo instance bằng `sqllocaldb create MSSQLLocalDB`.
- **Nếu đã cài LocalDB nhưng vẫn không connect được**: chạy `Repair` cho SQL Server từ Add/Remove Programs.

### ❌ `Migration failed` / schema out of sync
- Xoá DB rồi để backend tự tạo lại:
  ```powershell
  sqlcmd -S "(localdb)\MSSQLLocalDB" -E -Q "DROP DATABASE IF EXISTS GiveAIDDB"
  ```
  Sau đó `npm start` lại.

### ❌ CORS error trong browser console
- Backend đang chạy sai port (không phải 5231). Kiểm tra `backend.log`.
- Hoặc frontend không chạy ở 3000. Kiểm tra `frontend.log`.

### ❌ API không kết nối được từ frontend
1. Mở <http://localhost:5231/healthz> trên browser — phải ra `Healthy`.
2. Mở DevTools (F12) → Network → xem request `/api/v1/...` có status 200 không.
3. Nếu status 0 (network error) → frontend không proxy được → kiểm tra backend có chạy không.

### ❌ Node / .NET version sai
- Yêu cầu tối thiểu: Node 18+ và .NET 10 SDK.
- Mở PowerShell mới sau khi cài đặt.

---

## 8. Các lệnh hữu ích

| Lệnh | Mô tả |
|------|-------|
| `npm start --prefix GiveAID.Client` | Khởi động toàn bộ stack (frontend + backend) |
| `npm stop --prefix GiveAID.Client` | Tắt tất cả các process GiveAID dev |
| `npm install --prefix GiveAID.Client` | Cài dependencies React |
| `dotnet restore GiveAID.V2.slnx` | Restore NuGet packages |
| `dotnet build GiveAID.V2.slnx` | Build backend |
| `dotnet test GiveAID.V2.slnx` | Chạy test suite (~213 tests) |
| `powershell -ExecutionPolicy Bypass -File scripts\verify-database.ps1` | Verify database reachable + populated |
| `powershell -ExecutionPolicy Bypass -File database\99_Apply-All.ps1` | Drop + tạo lại database từ script SQL |

---

## 9. Liên hệ hỗ trợ

Khi báo lỗi, gửi kèm:

1. File `GiveAID.Client\scripts\backend.log`
2. File `GiveAID.Client\scripts\frontend.log`
3. Ảnh chụp màn hình lỗi
4. Output của `dotnet --version`, `node --version`, `sqllocaldb info MSSQLLocalDB`