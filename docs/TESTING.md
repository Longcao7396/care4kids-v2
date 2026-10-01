# Testing Strategy — GiveAID v2.0

## 1. Goals

- **Confidence** that business rules in the domain layer hold.
- **Confidence** that API endpoints behave correctly under realistic conditions.
- **Regression safety** when refactoring or adding features.
- **Documentation**: tests act as executable specifications.

## 2. Test Pyramid

```
        ▲ Functional / API tests (27)
       │   ▲ Integration tests (28)
      │   │   ▲ Unit tests (Domain 71 + Application 43)
     ─┴───┴───┴─────────────────────────────────────
```

| Layer               | Project                                       | Count | Speed   |
|---------------------|-----------------------------------------------|-------|---------|
| Domain unit         | `tests/Domain.UnitTests/`                     | 71    | < 1s    |
| Application unit    | `tests/Application.UnitTests/`                | 43    | < 1s    |
| Infrastructure int. | `tests/Infrastructure.IntegrationTests/`      | 28    | ~3s     |
| WebApi functional   | `tests/WebApi.FunctionalTests/`               | 27    | ~1s     |
| **Total**           |                                               | **169** | **~5s** |

## 3. Frameworks & Tooling

- **xUnit** (`2.9.2`) — test runner
- **FluentAssertions** (`6.12.2`) — expressive assertions (`Should().Be()`, `Should().ThrowAsync<T>()`)
- **Moq** (`4.20.72`) — interface mocking
- **AutoFixture** (`4.18.1`) + **AutoMoq** (`4.13.1`) — automatic test data generation
- **Microsoft.AspNetCore.Mvc.Testing** — `WebApplicationFactory<Program>` for in-process API hosting
- **Microsoft.EntityFrameworkCore.InMemory** — in-memory database for integration tests
- **coverlet.collector** — code coverage collection

## 4. Conventions

### 4.1 Naming

```csharp
public class MethodName_StateUnderTest_ExpectedBehaviour { ... }
// e.g., LoginHandler_ValidCredentials_ReturnsToken
```

Or the simpler BDD-ish style:

```csharp
public class WhenLoggingInWithValidCredentials { ... }
```

This project uses the first style for clarity.

### 4.2 Arrange / Act / Assert

Every test follows the AAA pattern with blank lines between sections:

```csharp
[Fact]
public async Task Login_WithValidCredentials_ReturnsToken()
{
    // Arrange
    var user = new User { Email = "test@example.com", PasswordHash = _hasher.Hash("pwd"), IsActive = true };
    _ctx.Setup(c => c.Users).Returns(MockDbSet(new[] { user }).Object);

    // Act
    var result = await _handler.Handle(new LoginCommand("test@example.com", "pwd"), default);

    // Assert
    result.Should().NotBeNull();
    result.Token.Should().NotBeNullOrEmpty();
}
```

### 4.3 One Assert Per Test (Preferred)

A test should verify **one behaviour**. Use multiple `[Fact]`s rather than chaining assertions.

### 4.4 No Magic Strings

Use constants or test data builders when strings are repeated:

```csharp
private const string AdminUsername = "admin";
private const string AdminPassword = "Admin@123";
```

## 5. Domain Tests (`tests/Domain.UnitTests/`)

Test business logic in entities without any infrastructure dependencies.

### Coverage

| File                    | Tests | Focus                                      |
|-------------------------|-------|--------------------------------------------|
| `CampaignTests.cs`      | 12    | Progress %, status transitions, dates      |
| `DonationTests.cs`      | 12    | Amount validation, transaction id format   |
| `UserTests.cs`          | 17    | Role transitions, password rules, lock/unlock |
| `CauseTests.cs`         | 15    | Soft-delete, cause code uniqueness         |
| `EnumMappingTests.cs`   | 15    | Enum value ↔ string round-trip             |

### Example

```csharp
[Fact]
public void Campaign_ProgressPercentage_CalculatedCorrectly()
{
    var campaign = new Campaign { Goal = 1000m, Raised = 250m };
    campaign.GetProgressPercentage().Should().Be(25);
}
```

## 6. Application Tests (`tests/Application.UnitTests/`)

Test MediatR handlers with mocked `IApplicationDbContext`.

### Approach

```csharp
private readonly Mock<IApplicationDbContext> _ctx;
private readonly Mock<IJwtTokenService> _jwt;

public LoginHandlerTests()
{
    _ctx = new Mock<IApplicationDbContext>();
    _jwt = new Mock<IJwtTokenService>();
    _hasher = new Mock<IPasswordHasher>();
}

// Build a mock IQueryable<T> backed by a list:
private static Mock<DbSet<T>> BuildMockDbSet<T>(IEnumerable<T> data) where T : class
{
    var queryable = data.AsQueryable();
    var mockSet = new Mock<DbSet<T>>();
    mockSet.As<IQueryable<T>>().Setup(m => m.Provider).Returns(queryable.Provider);
    mockSet.As<IQueryable<T>>().Setup(m => m.Expression).Returns(queryable.Expression);
    mockSet.As<IQueryable<T>>().Setup(m => m.ElementType).Returns(queryable.ElementType);
    mockSet.As<IQueryable<T>>().Setup(m => m.GetEnumerator()).Returns(queryable.GetEnumerator());
    return mockSet;
}
```

### Validator Tests

`LoginCommandValidatorTests` and `RegisterCommandValidatorTests` exercise each rule of the
FluentValidation definitions:

```csharp
[Theory]
[InlineData("")]
[InlineData("not-an-email")]
public void InvalidEmail_FailsValidation(string email)
{
    var cmd = new LoginCommand(email, "P@ssword1");
    _validator.Validate(cmd).IsValid.Should().BeFalse();
}
```

## 7. Infrastructure Tests (`tests/Infrastructure.IntegrationTests/`)

Test concrete implementations against real-ish dependencies (in-memory DB, real PBKDF2).

### Password Hasher (PBKDF2 SHA-256)

- Hash is non-empty
- Two hashes of the same password differ (random salt)
- `Verify` returns true for correct password
- `Verify` returns false for wrong password
- `Verify` returns false for null/empty hash

### JWT Token Service

- Issued token validates against the configured secret
- Issued token contains expected claims (`sub`, `email`, `role`, `jti`)
- Expired tokens fail validation (clock skew = 0)

### Memory Cache Service

- Set/Get round-trip
- TTL respected (entries disappear after timeout)
- Tag-based eviction works

## 8. Functional Tests (`tests/WebApi.FunctionalTests/`)

Spin up the **real** WebApi in-process using `WebApplicationFactory<Program>`, swap
SQL Server for InMemory, and exercise HTTP endpoints with `HttpClient`.

### Fixture

```csharp
public class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            // Swap DbContext
            var descriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(DbContextOptions<GiveAIDDbContext>));
            if (descriptor != null) services.Remove(descriptor);
            services.AddDbContext<GiveAIDDbContext>(opt =>
                opt.UseInMemoryDatabase($"GiveAIDTest_{Guid.NewGuid()}"));

            // Configure JWT for tests
            services.Configure<JwtSettings>(opts =>
            {
                opts.Secret = "TestSecretKeyForJwtTokenGenerationMustBeAtLeast64BytesLong-2024";
                opts.Issuer = "GiveAID.Test";
                opts.Audience = "GiveAID.Test.Client";
                opts.ExpiryMinutes = 60;
            });
        });
    }
}

[CollectionDefinition("ApiCollection")]
public class ApiCollection : ICollectionFixture<ApiWebApplicationFactory> { }
```

### Tests

| File                          | Tests | What's verified                                       |
|-------------------------------|-------|--------------------------------------------------------|
| `HealthControllerTests.cs`    | 5     | `/api/v1/health` returns 200, version field present    |
| `AuthControllerTests.cs`      | 5     | Login success/failure, JWT shape, register             |
| `CampaignsControllerTests.cs` | 4     | CRUD + featured filter                                 |
| `DonationsControllerTests.cs` | 3     | Create + list + stats                                  |
| `EndpointSmokeTests.cs`       | 6     | Every controller responds 200/401 (not 404/500)        |

## 9. Running Tests

### All tests

```powershell
dotnet test GiveAID.V2.slnx
```

### Single project

```powershell
dotnet test tests/Domain.UnitTests/GiveAID.V2.Domain.UnitTests.csproj
```

### With coverage

```powershell
dotnet test GiveAID.V2.slnx --collect:"XPlat Code Coverage"
# Generates coverage.cobertura.xml in each TestResults/<guid>/ folder
```

### Filter by name

```powershell
dotnet test --filter "FullyQualifiedName~LoginHandlerTests"
```

## 10. Coverage Targets

| Layer          | Target   | Current (approx.) |
|----------------|----------|--------------------|
| Domain         | ≥ 90%    | ~95%              |
| Application    | ≥ 80%    | ~85%              |
| Infrastructure | ≥ 70%    | ~75%              |
| WebApi         | ≥ 60%    | ~65%              |

(Exact numbers require running coverage tooling — targets are aspirational.)

## 11. What We Don't Test

- **React client** — covered manually + browser E2E (out of scope for the .NET test suite)
- **EF Core migrations** — exercised by integration tests using real SQL Express in CI
- **Static assets** — covered by manual smoke testing

## 12. CI Integration (future)

When CI is added (Phase 10+), the workflow will run:

```yaml
- dotnet restore
- dotnet build --no-restore
- dotnet test --no-build --verbosity normal
```

A PR cannot merge if `dotnet test` reports any failures.

## 13. Test Maintenance

- When you add a new entity, add a `XxxTests.cs` file with at least 3 tests (creation,
  validation rule, happy path)
- When you add a new endpoint, add at least one functional test (happy path) and one
  validation test
- Keep tests **fast** — no `Thread.Sleep`, no real network calls. Use `Task.Delay` only as a
  last resort in infrastructure tests, and keep it under 100ms
- Don't test framework code — only your own code
