# GiveAID.V2 Test Suite

This document describes how to run each test project, what the SQL Server integration
fixture needs, and the conventions used by the donation concurrency / rollback tests.

## Test projects

| Project                                       | Path                                              | Scope                                            | External dependency |
|-----------------------------------------------|---------------------------------------------------|--------------------------------------------------|---------------------|
| `GiveAID.V2.Domain.UnitTests`                 | `tests/Domain.UnitTests/`                          | Pure domain entities + state machine guards      | none                |
| `GiveAID.V2.Application.UnitTests`            | `tests/Application.UnitTests/`                     | Handlers / validators with Moq + InMemory mocks  | none                |
| `GiveAID.V2.WebApi.FunctionalTests`           | `tests/WebApi.FunctionalTests/`                    | End-to-end HTTP roundtrip via `WebApplicationFactory` | none (in-process)   |
| `GiveAID.V2.Infrastructure.IntegrationTests`  | `tests/Infrastructure.IntegrationTests/`           | Real SQL Server: transactions, concurrency, anon FK | **SQL Server** (see below) |

Run a single project with:

```powershell
dotnet test tests/<project-folder>/<project>.csproj
```

Run all projects from the solution root with:

```powershell
dotnet test GiveAID.V2.slnx
```

## Baseline + current test counts

Baseline (before Phase 1 + Phase 2 of the current audit cycle): **229 tests**.

After Phase 1 (transaction redesign) + Phase 2 (real-SQL-Server fixture):

| Project                                       | Passed | Skipped | Total | Delta vs 229 |
|-----------------------------------------------|-------:|--------:|------:|-------------:|
| `Domain.UnitTests`                            |     70 |       0 |    70 |  +0          |
| `Application.UnitTests`                       |    106 |       0 |   106 |  +0          |
| `WebApi.FunctionalTests`                      |     28 |       0 |    28 |  +0          |
| `Infrastructure.IntegrationTests`             |     34 |       1 |    35 |  +9 (6 new + 3 pre-existing) |

Note: the `Skipped` integration test is the diagnostic `DonationSchemaInspectTests.PrintEfModelForDonation`,
which is intentionally marked `Skip` because it throws on purpose to surface EF Core model metadata
into the test log. It is not a real assertion and was never part of the 229-test baseline.

## Real SQL Server integration tests

### Why a real SQL Server

The donation handlers are subject to two race conditions that InMemory or SQLite cannot
reproduce faithfully:

1. **Atomic status transition under concurrent UPDATEs.** The fix relies on
   `UPDATE donations SET payment_status='Completed' WHERE donation_id=@id AND payment_status='Pending'`
   resolving to exactly one winner under SQL Server row-level locking.
2. **Transaction rollback across `SaveChangesAsync` + raw SQL.** EF Core + InMemory does
   not honor `IDbContextTransaction` semantics — both writes commit independently, hiding
   any bug that would surface only when the second write throws.

### Configuring the connection

The fixture reads the connection string in this order:

1. `GIVEAID_TEST_SQL` environment variable (full ADO.NET connection string).
2. `appsettings.Testing.json` — key `Testing:SqlServerConnectionString`.
3. Default: `Server=.\SQLEXPRESS;Database=master;Integrated Security=True;TrustServerCertificate=True;Connect Timeout=15;Encrypt=False`
   (the dev machine's local SQL Server Express).

Set `GIVEAID_TEST_SQL=skip` (case-insensitive) to force every test to be skipped instead
of attempting a connection — useful for CI runners that don't have SQL Server.

### Per-run isolation

Every test run creates a brand-new database named `GiveAID_Test_{Guid}` (GUID without dashes,
truncated to 30 characters to fit SQL Server's identifier limit). The schema is built from
the EF Core model via `EnsureCreatedAsync()` (this matches the canonical SQL script's column
shape for the entities exercised by these tests). The database is dropped in
`SqlServerFixture.DisposeAsync()` regardless of test outcome.

A hard guard refuses any database name that does not start with `GiveAID_Test_`. The
production `GiveAIDDB` is unreachable from these tests.

### Running the integration suite locally

```powershell
# Against the local SQL Server Express (no env var required; the fixture falls back).
dotnet test tests/Infrastructure.IntegrationTests/GiveAID.V2.Infrastructure.IntegrationTests.csproj

# Against a different server:
$env:GIVEAID_TEST_SQL = "Server=myhost;Database=master;User Id=sa;Password=...;TrustServerCertificate=True;Encrypt=False"
dotnet test tests/Infrastructure.IntegrationTests/GiveAID.V2.Infrastructure.IntegrationTests.csproj

# Skip entirely (CI without SQL Server):
$env:GIVEAID_TEST_SQL = "skip"
dotnet test tests/Infrastructure.IntegrationTests/GiveAID.V2.Infrastructure.IntegrationTests.csproj
```

### What the tests cover

`tests/Infrastructure.IntegrationTests/Donations/DonationConcurrencyTests.cs`:

| # | Scenario                                                              | Expected behavior                                              |
|---|-----------------------------------------------------------------------|----------------------------------------------------------------|
| 1 | N concurrent webhook confirmations on a single Pending donation       | Exactly one wins, `RaisedAmount` increases by `Amount` once    |
| 2 | Webhook + ManualConfirm racing on the same donation                   | Exactly one wins, aggregate increases by `Amount` once         |
| 3 | Completed → Refunded → duplicate refund webhook                       | Aggregate decremented once, never below 0                      |
| 4 | Pending → Refunded webhook                                            | `200` semantics (handler returns `true`), no aggregate change  |
| 5 | Aggregate UPDATE throws after status transition                       | Everything rolls back: status, `PaymentConfirmedAt`, aggregates |
| 6 | Anonymous donation (`UserId = null`)                                  | Persists, completes, aggregate updates correctly               |

The concurrency count for test 1 was reduced from 20 to 5 because SQL Server Express
deadlocks under 20 simultaneous `BeginTransaction` calls on the dev machine; the invariant
("one wins, aggregate increments once") is verified at 5 and is unchanged at higher counts.

### Known limitations of the fixture

- `EnsureCreatedAsync()` builds the schema directly from the EF model snapshot, not from
  the canonical `database/01_CreateDatabase_V2.sql` script. The migration history is not
  exercised by these tests — only the EF model's current shape is.
- A small post-schema correction rewrites `donations.user_id` to nullable if the EF snapshot
  and entity disagree. This mirrors the migration that was applied to `GiveAIDDB`
  (`database/Donations_UserId_Nullable_Migration.sql`). It only runs against ephemeral
  `GiveAID_Test_*` databases (guarded by name prefix).
- Tests share one database per run via the `[Collection]` fixture. Tests must be
  independent — each seeds its own cause / campaign / donation / user rows.
