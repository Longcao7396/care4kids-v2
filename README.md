# GiveAID v2.0

> NGO donation & welfare platform — Clean Architecture rewrite
> Public React site + Admin dashboard + ASP.NET Core WebApi

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-213%2F213-success)]()
[![License](https://img.shields.io/badge/license-Proprietary-blue)]()

## Database Setup — single source of truth

This project targets **one** local SQL Server instance for day-to-day development:

```
(localdb)\MSSQLLocalDB
```

This is the instance baked into `src/WebApi/appsettings.Development.json` and the
fallback in `src/Infrastructure/Persistence/GiveAIDDbContextFactory.cs`. It
ships with **Visual Studio** (and is installed by the **.NET SDK** on Windows),
so no separate SQL Server install is required.

> If you previously used `.\SQLEXPRESS` you were almost certainly looking at the
> **wrong database** when you saw empty tables after a migration or upload. All
> PowerShell scripts and SQL files now default to LocalDB. See
> [Switching to SQL Server Express](#switching-to-sql-server-express-optional)
> below if you really need Express.

### Verify the database is reachable

A single PowerShell script is the canonical health check. It detects which
instance your appsettings actually point at, pings it, checks that
`GiveAIDDB` exists, and counts rows in the key tables.

```powershell
powershell -ExecutionPolicy Bypass -File verify-database.ps1
```

Expected: green `[OK]` lines for **Connectivity**, **Database existence**, and
**Row counts**, followed by a `[OK] Database is reachable…` verdict. Exit
code `0` means everything is healthy; non-zero means the script will print
hints specific to the failure.

### Set up the database from scratch

Option A — **let the application do it** (recommended for new devs):

```powershell
dotnet run --project src/WebApi/GiveAID.V2.WebApi.csproj
# First start runs migrations + seeds admin user automatically.
```

Option B — **explicit apply** (preferred for CI):

```powershell
# From repo root
powershell -ExecutionPolicy Bypass -File database\99_Apply-All.ps1
# Reads (localdb)\MSSQLLocalDB from appsettings.Development.json.
```

Option C — **sqlcmd** (debugging only):

```powershell
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -Q "IF DB_ID('GiveAIDDB') IS NULL CREATE DATABASE GiveAIDDB"
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -d master -i "database\01_CreateDatabase_V2.sql"
```

### Switching to SQL Server Express (optional)

If you have SQL Server Express installed and want to use it instead:

1. Enable **TCP/IP** and **Named Pipes** in
   `SQL Server Configuration Manager → Protocols for SQLEXPRESS`.
2. Update the connection string in
   `src/WebApi/appsettings.Development.json` to
   `Server=.\SQLEXPRESS;Database=GiveAIDDB;Integrated Security=True;MultipleActiveResultSets=True;TrustServerCertificate=True;Connect Timeout=15`.
3. Tell every script/seed to use Express instead of LocalDB:
   ```powershell
   powershell -File verify-database.ps1 -Server ".\SQLEXPRESS"
   powershell -File database\99_Apply-All.ps1 -Server ".\SQLEXPRESS"
   ```

### Troubleshooting — "I see empty tables!"

Run the verification script first. The most common causes are:

| Symptom | Likely cause | Fix |
|---|---|---|
| `Could not connect to (localdb)\MSSQLLocalDB` | LocalDB not installed or stopped | `sqllocaldb start MSSQLLocalDB` |
| `Database 'GiveAIDDB' does NOT exist` | First run never happened | `dotnet run --project src/WebApi` (auto-creates) **or** `database\99_Apply-All.ps1` |
| `MISSING (table does not exist)` | Schema out of sync | `database\99_Apply-All.ps1` (drops + recreates) |
| `Some key tables are empty` | Seed never ran | `database\99_Apply-All.ps1` (idempotent re-seed) |
| Empty tables in **SSMS** but app shows data | You connected to a different instance | Re-check: `SELECT @@SERVERNAME` in the same SSMS query window |

## Overview

GiveAID v2.0 is a full rewrite of the legacy ASP.NET WebForms + IIS Express stack on a
modern **Clean Architecture** foundation. The solution separates concerns into four layers,
supports CQRS via MediatR, soft delete pattern, audit logging, and ships with a comprehensive 
automated test suite (213 tests, 100% pass rate).

## Tech Stack

| Layer            | Technology                                                 |
|------------------|------------------------------------------------------------|
| Domain           | C# / .NET 10, pure POCOs, no dependencies                  |
| Application      | MediatR (CQRS), FluentValidation, AutoMapper               |
| Infrastructure   | EF Core 10 (SQL Server), JWT, SMTP, Stripe, MemoryCache, Audit Log |
| WebApi           | ASP.NET Core 10 Web API, JWT bearer, Scalar OpenAPI        |
| Client           | React 18 + React Router + Axios (Public + Admin Dashboard) |
| Tests            | xUnit + FluentAssertions + Moq + WebApplicationFactory     |

## Repository Layout

```
project-NGO/
├── src/
│   ├── Domain/                    # Entities, value objects, enums (no deps)
│   ├── Application/               # CQRS handlers, validators, DTOs
│   ├── Infrastructure/            # EF Core, JWT, Email, Payment, Cache, Audit Log
│   └── WebApi/                    # REST API (port 5231)
├── tests/
│   ├── Domain.UnitTests/          # 70 tests
│   ├── Application.UnitTests/     # 87 tests
│   ├── Infrastructure.IntegrationTests/  # 28 tests
│   └── WebApi.FunctionalTests/    # 28 tests
├── GiveAID.Client/                # React 18 public site + admin dashboard (port 3000)
├── database/                      # SQL migrations + seeds
├── docs/                          # Architecture, API, deployment
└── GiveAID.V2.slnx
```

## Quick Start

### Prerequisites

- .NET 10 SDK (tested on 10.0.401)
- Node.js 18 LTS / 20 LTS / 22+ (tested on v24.18.0)
- **SQL Server LocalDB** — required, NOT bundled with .NET SDK. Three install options:
  - Install SQL Server 2022/2025 Express with LocalDB option: <https://www.microsoft.com/sql-server/sql-server-downloads>
  - Or Visual Studio Installer → Modify → Individual components → tick "SQL Server Express LocalDB"
  - Or install `SqlLocalDB.msi` from the SQL Server Express media.
- *(Optional)* Visual Studio 2022 / Rider / VS Code — only needed if you want to edit C# code; the project runs fine from the command line via `START.bat`.

### 1. Database

The project uses `(localdb)\MSSQLLocalDB` as its single source of truth.
LocalDB is created on first use and the `MSSQLLocalDB` instance is generated
automatically by the .NET driver on first connection attempt.

```powershell
# Recommended: let EF Core create + seed it on first run
dotnet run --project src/WebApi/GiveAID.V2.WebApi.csproj

# Or apply the full schema + seeds explicitly
powershell -ExecutionPolicy Bypass -File database\99_Apply-All.ps1

# Or just smoke-test the connection (no writes)
powershell -ExecutionPolicy Bypass -File verify-database.ps1
```

See the **Database Setup** section above for the canonical instance
(`(localdb)\MSSQLLocalDB`) and how to switch to `.\SQLEXPRESS` if you
already have it installed.

### 2. Backend

```powershell
cd "C:\Users\admin\Desktop\project NGO.v2"
dotnet restore
dotnet build
dotnet run --project src/WebApi/GiveAID.V2.WebApi.csproj
# API at http://localhost:5231
# OpenAPI at http://localhost:5231/scalar/v1
```

### 3. Frontend (Public Site + Admin Dashboard)

```powershell
cd GiveAID.Client
npm install
npm start
# Public site: http://localhost:3000
# Admin dashboard: http://localhost:3000/admin
# Login: admin / Admin@123
```

### 4. Run Tests

```powershell
dotnet test GiveAID.V2.slnx
# Expected: 213 passed, 0 failed
```

## Default Credentials

| Role       | Username | Password    | Email                |
|------------|----------|-------------|----------------------|
| Admin      | admin    | Admin@123   | admin@give-aid.org   |
| User       | demo     | Demo@123    | demo@give-aid.org    |

**Note:** Login requires **username**, not email. Use `admin` or `demo` in the username field.

## Architecture Highlights

- **Clean Architecture** with strict dependency direction (Domain ← Application ← Infrastructure ← WebApi)
- **CQRS** via MediatR — Commands and Queries segregated in `src/Application/Features/`
- **Envelope JSON contract** — every response is `{success, message, data, errors?}` for predictable client handling
- **JWT auth** with refresh tokens, role-based policy (`Admin`)
- **Rate limiting** (100 req/min/IP) via `AspNetCoreRateLimit`
- **Soft delete pattern** — all entities support soft delete with `IsDeleted` flag and global query filters
- **Audit log MVP** — automatic tracking of Create/Update/Delete operations with JSON snapshots
- **React 18** SPA with axios interceptors that auto-attach JWT and unwrap envelopes
- **React Admin Dashboard** — 25 admin pages for full CRUD management

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full architecture document.

## API Surface

24 controllers covering authentication, causes, campaigns, donations, gallery,
team/achievements/careers, FAQs, contact, conversations, invitations, CMS, statistics, and admin tools.

All endpoints live under `/api/v1/`. See [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md).

## Project Status

| Phase | Description                              | Status |
|-------|------------------------------------------|--------|
| 1     | Planning, scaffolding, dependencies      | ✅      |
| 2     | Domain entities + enums                  | ✅      |
| 3     | Application (CQRS + validators)          | ✅      |
| 4     | Infrastructure (EF, JWT, Email, Stripe)  | ✅      |
| 5     | WebApi (28 controllers + Scalar)         | ✅      |
| 6     | React client (public + admin dashboard)  | ✅      |
| 7     | Soft delete pattern + Audit log MVP      | ✅      |
| 8     | Tests (213 tests, 100% pass)             | ✅      |
| 9     | Documentation + cutover                  | ✅      |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API_REFERENCE.md)
- [Database Schema](docs/DATABASE.md)
- [Project Map](docs/PROJECT_MAP.md)
- [Conventions](docs/CONVENTIONS.md)
- [Migration Guide](docs/MIGRATION_GUIDE.md)
- [Testing Strategy](docs/TESTING.md)
- [Deployment & Runbook](docs/DEPLOYMENT.md)
- [Production Build Guide](docs/PRODUCTION_BUILD.md)

## 🤖 For AI Agents

**If you're an AI agent reading this codebase, START with [AI_GUIDE.md](AI_GUIDE.md)**

It contains quick patterns for:
- JWT authentication flow
- CQRS/MediatR patterns
- Clean Architecture structure
- Troubleshooting shortcuts

---

## License

Proprietary — internal NGO project. All rights reserved.
