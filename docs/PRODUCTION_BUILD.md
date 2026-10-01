# Production Build & Deployment Guide — GiveAID v2.0

> **Audience:** Release engineers, DevOps, and the on-call rotation who are
> cutting a v2.0 build for a public environment (staging / production).

This document is the canonical checklist for producing a working production
build of GiveAID v2.0. It complements [`DEPLOYMENT.md`](DEPLOYMENT.md) (which
covers ongoing ops) and focuses specifically on **build**, **CORS**,
**environment configuration**, and **go-live smoke tests**.

> **TL;DR** — three commands, three env vars, three minutes:
>
> ```powershell
> # 1. Backend
> dotnet publish src\WebApi\GiveAID.V2.WebApi.csproj -c Release -o publish\api
> # 2. Frontend
> cd GiveAID.Client && npm run build
> # 3. Runtime CORS check
> powershell -File scripts\Test-Cors.ps1 -AllowedOrigin https://app.giveaid.org
> ```

---

## 1. Prerequisites

| Tool          | Version          | Notes                                              |
|---------------|------------------|----------------------------------------------------|
| .NET SDK      | **10.0.4xx**     | `dotnet --list-sdks` must show 10.x               |
| Node.js       | **18 LTS or 20+**| `node --version`                                   |
| npm           | 9+               | Bundled with Node.js                               |
| SQL Server    | 2019+ or LocalDB | (localdb)\MSSQLLocalDB on dev, real instance in prod |
| PowerShell    | 5.1+ / 7+       | Only required for the CORS smoke test              |

The solution targets `net10.0`. The build will fail on .NET 8 SDKs.

---

## 2. Backend Production Build

### 2.1 Build

```powershell
# Run from the repo root (where GiveAID.V2.slnx lives).
cd "<REPO_ROOT>"
dotnet restore GiveAID.V2.slnx
dotnet build  src\WebApi\GiveAID.V2.WebApi.csproj -c Release --nologo
```

Expected output: `Build succeeded. 11 Warning(s) 0 Error(s)`. The 11 warnings
are pre-existing **CS0108 / CS8601 / CS8604** in `Domain/Entities/*` and
`Application/Features/*` — they are **not** blocking and ship as-is. Track them
separately if you want a clean compile; nothing in this guide requires zero
warnings.

### 2.2 Publish

```powershell
dotnet publish src\WebApi\GiveAID.V2.WebApi.csproj `
    -c Release `
    -o publish\api `
    --no-restore
```

Artifacts land in `publish\api\GiveAID.V2.WebApi.dll` plus a self-contained
runtime folder. Run with:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Production"
dotnet .\publish\api\GiveAID.V2.WebApi.dll --urls http://0.0.0.0:5231
```

(Or hand the folder to IIS / a Linux systemd unit — see [`DEPLOYMENT.md`](DEPLOYMENT.md).)

### 2.3 appsettings — production-ready

`src\WebApi\appsettings.json` is committed with **no secrets**:
- `ConnectionStrings:DefaultConnection` is empty (must come from env var)
- `Jwt:Secret` is empty (must come from env var)
- `Smtp:*` and `PaymentGateway:StripeSecretKey` are empty
- `Cloudinary:*` is empty
- `Cors:AllowedOrigins` is empty (must be set via env var or `appsettings.Production.json`)
- `SeedData:Enabled` defaults to `true` in dev, **`false` in production**

`src\WebApi\appsettings.Production.json` exists and sets:
- `SeedData.Enabled = false` (no automatic seed in prod)
- `Cors.AllowedOrigins = ""` (you MUST override)
- `Logging.LogLevel.Default = Warning` (no Information spam in prod)

### 2.4 Required environment variables

| Variable                                | Required? | Example                                                                  |
|-----------------------------------------|-----------|--------------------------------------------------------------------------|
| `ASPNETCORE_ENVIRONMENT`                | yes       | `Production`                                                             |
| `ConnectionStrings__DefaultConnection`  | yes       | `Server=prod-sql;Database=GiveAIDDB;User Id=sa;Password=***;TrustServerCertificate=True;MultipleActiveResultSets=True` |
| `Jwt__Secret`                           | yes       | **≥ 32 characters.** Random base64 string. Refuses to start otherwise.   |
| `Cors__AllowedOrigins`                  | yes       | `https://app.giveaid.org,https://www.giveaid.org`                        |
| `Smtp__SmtpUsername`                    | yes       | `apikey` (or SMTP username)                                              |
| `Smtp__SmtpPassword`                    | yes       | transactional email provider's app password                              |
| `Smtp__SmtpEnabled`                     | recommended | `true`                                                                 |
| `PaymentGateway__StripeSecretKey`       | yes (if Stripe) | `sk_live_...`                                                      |
| `PaymentGateway__StripeWebhookSecret`   | yes (if Stripe) | `whsec_...`                                                      |
| `Cloudinary__CloudName`                 | yes (if gallery uploads) | from Cloudinary dashboard                                   |
| `Cloudinary__ApiKey`                    | yes (if gallery uploads) | from Cloudinary dashboard                                   |
| `Cloudinary__ApiSecret`                 | yes (if gallery uploads) | from Cloudinary dashboard                                   |

> **Never commit any of these.** Use Azure App Settings, AWS Parameter Store,
> Kubernetes Secrets, or `dotnet user-secrets` for dev. The committed
> `appsettings.*.json` files contain **only placeholders**.

---

## 3. Frontend Production Build

### 3.1 Build

```powershell
cd GiveAID.Client
npm ci          # if you have a lockfile; otherwise `npm install`
npm run build
```

Expected output: `Compiled with warnings.` plus the gzip-sizes table. The
**two ESLint warnings** in `LoginPage.js` (`react-hooks/exhaustive-deps`)
are not blocking — fix in a future PR.

Output goes to `GiveAID.Client\build\`:
```
build/
├── index.html                  ← entry point
├── asset-manifest.json         ← tells the host which JS/CSS to load
└── static/
    ├── js/main.<hash>.js       ← ~337 kB gzipped
    ├── css/main.<hash>.css     ← ~78 kB gzipped
    └── media/                  ← fonts, images
```

### 3.2 Configure the API endpoint

The frontend reads the API base URL from two places at build time:

1. **`src/config.js`** — defaults to `http://localhost:5231/api/v1`
2. **`REACT_APP_API_URL`** env var — **override at build time**

For a production build pointing at your API:

```powershell
# Windows (cmd / PowerShell)
set REACT_APP_API_URL=https://api.giveaid.org/api/v1
npm run build

# Linux / macOS
REACT_APP_API_URL=https://api.giveaid.org/api/v1 npm run build
```

The build **bakes** the URL into the JS bundle (CRA replaces `process.env.*`
references). Verify with:

```powershell
Select-String -Path build\static\js\*.js -Pattern "api.giveaid.org" | Select-Object -First 1
```

If the match returns, the URL was embedded. If you see `localhost:5231`, the
build used the default — rebuild with `REACT_APP_API_URL` set.

### 3.3 Deploy the static build

Upload `GiveAID.Client\build\` to any static host. Examples:

| Host          | How                                                                                     |
|---------------|-----------------------------------------------------------------------------------------|
| IIS           | `New-WebSite -Name "GiveAID.Web" -Port 443 -PhysicalPath "C:\inetpub\giveaid-web"`      |
| Nginx         | `root /var/www/giveaid-web;` then `nginx -s reload`                                     |
| AWS S3 + CF   | `aws s3 sync build\ s3://app.giveaid.org --delete`                                      |
| Azure Static  | `az staticwebapp deploy --app-location build`                                           |
| Netlify       | `netlify deploy --prod --dir=build`                                                     |

`package.json` has `"homepage": "/"` so the bundle works **at the root of any
domain**. If you need to host under a sub-path (e.g. `/portal/`), change
`homepage` and rebuild.

---

## 4. CORS Configuration

### 4.1 What the policy does

`src\WebApi\Program.cs` registers a single CORS policy named `"ReactDev"`:

```csharp
var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"]
                     ?? "http://localhost:3000,http://localhost:3001";
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactDev", policy =>
    {
        policy.WithOrigins(originsList)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
```

Then in the pipeline:
```csharp
app.UseCors("ReactDev");  // <-- before auth
app.UseAuthentication();
app.UseAuthorization();
```

Key points:
- `WithOrigins(...)` — **whitelist only.** Never uses `AllowAnyOrigin()`.
- `AllowCredentials()` — **enabled**, so cookies / `Authorization` headers work.
- The list is read from `Cors:AllowedOrigins`, comma-separated, and trimmed.

### 4.2 Production whitelist

Set the env var **before** starting the API:

```powershell
$env:Cors__AllowedOrigins = "https://app.giveaid.org,https://www.giveaid.org"
```

The CORS policy is enforced **only on the listed origins**. Anything else
will receive a successful response without the `Access-Control-Allow-Origin`
header — the browser will block the response on the client side, exactly as
desired.

> **WARNING:** do **not** set `Cors:AllowedOrigins` to `*` or include a
> wildcard. `AllowCredentials()` is incompatible with `AllowAnyOrigin()` in
> modern browsers — the policy will refuse to register and the request will
> be denied.

### 4.3 Verifying CORS headers

Run the smoke test (see §6). Or hit it manually:

```powershell
# Preflight from an allowed origin
curl -X OPTIONS `
     -H "Origin: https://app.giveaid.org" `
     -H "Access-Control-Request-Method: GET" `
     -H "Access-Control-Request-Headers: authorization,content-type" `
     -i `
     https://api.giveaid.org/api/v1/causes
```

Expected response headers:
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.giveaid.org
Access-Control-Allow-Methods: GET
Access-Control-Allow-Headers: authorization,content-type
Access-Control-Allow-Credentials: true
Vary: Origin
```

A request from a rogue origin (`https://evil.example.com`) must **not**
include `Access-Control-Allow-Origin` at all.

---

## 5. Frontend ↔ Backend Connectivity Matrix

| Origin                              | Backend default  | Works?  | Why                                                      |
|-------------------------------------|------------------|---------|----------------------------------------------------------|
| `http://localhost:3000`             | Allow            | ✅      | Listed in default `appsettings.json`                     |
| `http://localhost:3001`             | Allow            | ✅      | Listed in default `appsettings.json`                     |
| `https://app.giveaid.org`           | Deny by default  | ✅ only when `Cors__AllowedOrigins` is set in prod env | Env var is the single switch |
| `https://staging.giveaid.org`       | Deny             | ❌ until you add it | Same as above                                            |
| `*` (wildcard)                      | Not used         | ❌      | Policy is `WithOrigins(...)` — wildcard is rejected       |

---

## 6. Runtime Integration Test

A self-contained smoke test is in `scripts/Test-Cors.ps1`. It:

1. Boots the WebApi in **Production** mode on port 5231.
2. Sets `Cors__AllowedOrigins` to two test origins.
3. Issues an `OPTIONS` preflight from an **allowed** origin → expects 204 with
   `Access-Control-Allow-Origin: <allowed>` and `Allow-Credentials: true`.
4. Issues an `OPTIONS` preflight from a **rogue** origin → expects the rogue
   origin to **NOT** be echoed back.
5. Issues a real `GET /healthz` from an allowed origin → expects 200 with the
   CORS echo headers.
6. Cleans up the backend process.

Run it:

```powershell
# Run from the repo root.
cd "<REPO_ROOT>"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\Test-Cors.ps1
```

Customize for your environment:

```powershell
powershell -File scripts\Test-Cors.ps1 `
    -AllowedOrigin  "https://app.giveaid.org" `
    -AllowedOrigin2 "https://www.giveaid.org" `
    -RogueOrigin    "https://evil.example.com" `
    -ApiPort        5231
```

A green `ALL CORS CHECKS PASSED` means the production CORS policy is wired
correctly end-to-end. A red bar lists the failed assertions.

---

## 7. Production Readiness Checklist

Tick every box before flipping DNS.

### 7.1 Code
- [x] `src/WebApi/Program.cs` uses `WithOrigins(...)` (not `AllowAnyOrigin()`)
- [x] No `[EnableCors]` attributes on controllers (CORS is policy-driven)
- [x] `appsettings.json` and `appsettings.Production.json` contain **no secrets**
- [x] `src/config.js` reads `REACT_APP_API_URL` env var with a dev fallback
- [x] `src/setupProxy.js` is dev-only (not bundled in `npm run build`)

### 7.2 Build verification (this run)
- [x] `dotnet build src/WebApi/GiveAID.V2.WebApi.csproj -c Release` → 0 errors
- [x] `dotnet build src/WebApi/GiveAID.V2.WebApi.csproj -c Debug`   → 0 errors
- [x] `dotnet build src/Web/GiveAID.V2.Web.csproj -c Release`        → 0 errors
- [x] `cd GiveAID.Client && npm run build`                            → compiled, ~337 kB JS gzipped
- [x] `powershell scripts/Test-Cors.ps1`                              → all checks passed

### 7.3 Runtime secrets
- [ ] `Jwt__Secret` is set, ≥ 32 chars, **different from dev**
- [ ] `ConnectionStrings__DefaultConnection` points at prod SQL Server
- [ ] `Smtp__*` points at transactional provider (SendGrid / Postmark)
- [ ] `PaymentGateway__StripeSecretKey` is a `sk_live_` key (not `sk_test_`)
- [ ] `Cors__AllowedOrigins` is set to your real frontend origin(s)
- [ ] `Cloudinary__*` is set (if gallery uploads are needed)

### 7.4 Runtime smoke test
- [ ] `GET /healthz` returns 200
- [ ] `OPTIONS` preflight from your frontend origin returns 204 with CORS headers
- [ ] `OPTIONS` preflight from an unknown origin returns 204 **without** CORS headers
- [ ] `POST /api/v1/auth/login` from your frontend origin succeeds
- [ ] HTTPS redirect works (`http://...` → `https://...`)
- [ ] No startup errors in the first 60 seconds of logs

---

## 8. Troubleshooting

### Symptom: `Access to XMLHttpRequest at 'https://api...' from origin 'https://app...' has been blocked by CORS`

1. Confirm `Cors__AllowedOrigins` includes the **exact** origin (no trailing
   slash, correct protocol — `https://` vs `http://`).
2. Restart the API after changing env vars (config is read at startup).
3. Open DevTools → Network → preflight request → verify the response headers.
   If `Access-Control-Allow-Origin` is missing, the origin isn't on the list.
4. Confirm the request actually went to the API you think it did. Browsers
   may 301/302 to a different host on misconfigured DNS.

### Symptom: `Jwt:Secret must be at least 32 characters long`

The application refuses to start in non-Development environments if the
secret is missing or too short. Set the env var:

```powershell
$env:Jwt__Secret = "<at least 32 random characters>"
```

### Symptom: 401 after successful login

- The browser is sending cookies / `Authorization` headers, so the request
  must have CORS + credentials. Both ends must be configured — backend with
  `AllowCredentials()`, frontend with `axios.withCredentials = true` (we
  already set this implicitly through `Authorization` headers).
- `Cors:AllowedOrigins` must be a **specific origin list** when credentials
  are enabled. The browser will reject `*` with credentials.

### Symptom: `npm run build` fails with "out of memory"

`react-scripts build` is memory-hungry. On Windows:

```powershell
$env:NODE_OPTIONS = "--max-old-space-size=4096"
npm run build
```

### Symptom: API starts but seed step crashes

In Production, `SeedData.Enabled` is `false` by default — no seeding is
attempted. If you flipped it to `true` for a brand-new environment, the app
will run the seed and may fail if the schema is missing. Use:

```bash
dotnet ef database update --project src/Infrastructure `
                          --startup-project src/WebApi
```

…to apply migrations explicitly, then restart the API.

### Symptom: WebApi starts but frontend bundle shows `localhost:5231` URLs

You forgot to set `REACT_APP_API_URL` at build time. Rebuild:

```powershell
cd GiveAID.Client
$env:REACT_APP_API_URL = "https://api.giveaid.org/api/v1"
npm run build
```

The build is **static** — there is no runtime config switch for the API URL.
You must rebuild and redeploy.

---

## 9. What this document does NOT cover

- **CI/CD pipeline config** — see your platform's docs (Azure DevOps, GitHub
  Actions, etc.). The commands in §2 / §3 are what your pipeline should run.
- **Reverse-proxy / TLS termination** — see [`DEPLOYMENT.md`](DEPLOYMENT.md) §3.
- **Database migrations on production** — see
  [`MIGRATION_GUIDE.md`](MIGRATION_GUIDE.md).
- **Operational runbook / on-call** — see
  [`RUNBOOK.md`](RUNBOOK.md).

---

## 10. Change log

| Date         | Change                                                                                       |
|--------------|----------------------------------------------------------------------------------------------|
| Sep 27, 2026 | Initial production-build & CORS verification (this commit)                                  |
| Sep 27, 2026 | Added `scripts/Test-Cors.ps1` runtime integration test                                      |
| Sep 27, 2026 | Added `scripts/Debug-Cors.ps1` for ad-hoc header inspection                                  |
