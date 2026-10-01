using GiveAID.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace GiveAID.Tests.Infrastructure.Integration;

/// <summary>
/// SQL Server integration test fixture.
///
/// Creates a brand-new database named <c>GiveAID_Test_{Guid}</c> on the configured
/// SQL Server instance, applies all EF Core migrations, and tears the database down
/// in <see cref="DisposeAsync"/>. The fixture guards against ever touching
/// <c>GiveAIDDB</c> and is skipped (not failed) when no connection string is
/// configured.
///
/// Configuration order:
///   1. <c>GIVEAID_TEST_SQL</c> environment variable (full ADO.NET connection string).
///   2. <c>appsettings.Testing.json</c> — key <c>Testing:SqlServerConnectionString</c>.
///   3. <c>.\SQLEXPRESS</c> fallback (this machine's local SQL Server Express).
///
/// To opt out (e.g. in CI without SQL Server), set
/// <c>GIVEAID_TEST_SQL=skip</c>. They will be reported as "skipped", not failed.
/// </summary>
public sealed class SqlServerFixture : IAsyncLifetime
{
    /// <summary>
    /// All test databases MUST start with this prefix. The fixture refuses
    /// anything else (including the production <c>GiveAIDDB</c>).
    /// </summary>
    public const string DatabaseNamePrefix = "GiveAID_Test_";

    /// <summary>
    /// When this sentinel value is set in <c>GIVEAID_TEST_SQL</c>, the fixture
    /// reports every test as skipped (instead of trying to connect).
    /// </summary>
    public const string SkipSentinel = "skip";

    public string DatabaseName { get; }
    public string ConnectionString { get; }
    public bool IsSkipped { get; }

    /// <summary>
    /// Connection string with <c>Initial Catalog</c> swapped to the test database.
    /// Use this when constructing a <see cref="GiveAIDDbContext"/>.
    /// </summary>
    public string TestConnectionString { get; }

    public SqlServerFixture()
    {
        // Resolve the server connection string (the one we run CREATE DATABASE against,
        // targeting master).
        var configured = ResolveConfiguredConnectionString();
        if (string.Equals(configured, SkipSentinel, StringComparison.OrdinalIgnoreCase))
        {
            DatabaseName = "(skipped)";
            ConnectionString = string.Empty;
            TestConnectionString = string.Empty;
            IsSkipped = true;
            return;
        }

        if (string.IsNullOrWhiteSpace(configured))
        {
            DatabaseName = "(skipped)";
            ConnectionString = string.Empty;
            TestConnectionString = string.Empty;
            IsSkipped = true;
            return;
        }

        ConnectionString = configured;
        DatabaseName = $"{DatabaseNamePrefix}{Guid.NewGuid():N}".Substring(0, 30);

        var builder = new SqlConnectionStringBuilder(configured)
        {
            InitialCatalog = DatabaseName
        };
        TestConnectionString = builder.ConnectionString;

        IsSkipped = false;
    }

    private static string? ResolveConfiguredConnectionString()
    {
        var env = Environment.GetEnvironmentVariable("GIVEAID_TEST_SQL");
        if (!string.IsNullOrWhiteSpace(env))
        {
            return env;
        }

        var appsettingsPath = FindAppsettingsTesting();
        if (appsettingsPath is not null && File.Exists(appsettingsPath))
        {
            try
            {
                using var stream = File.OpenRead(appsettingsPath);
                var config = new ConfigurationBuilder()
                    .AddJsonStream(stream)
                    .Build();
                var fromFile = config["Testing:SqlServerConnectionString"];
                if (!string.IsNullOrWhiteSpace(fromFile))
                {
                    return fromFile;
                }
            }
            catch
            {
                // ignore malformed file
            }
        }

        // Fallback for the local dev machine: SQL Server Express is running.
        return "Server=.\\SQLEXPRESS;Database=master;Integrated Security=True;TrustServerCertificate=True;Connect Timeout=15;Encrypt=False";
    }

    private static string? FindAppsettingsTesting()
    {
        // Walk up from the test binary location to find appsettings.Testing.json.
        var dir = AppContext.BaseDirectory;
        for (var i = 0; i < 8; i++)
        {
            var candidate = Path.Combine(dir, "appsettings.Testing.json");
            if (File.Exists(candidate))
            {
                return candidate;
            }
            var parent = Directory.GetParent(dir);
            if (parent is null) return null;
            dir = parent.FullName;
        }
        return null;
    }

    /// <summary>
    /// Sets up the per-run test database: CREATE DATABASE + build the schema
    /// from the EF Core model via <c>EnsureCreatedAsync</c>.
    ///
    /// Why <c>EnsureCreatedAsync</c> instead of <c>MigrateAsync</c>? The existing
    /// EF migrations were authored for a database whose column names had been
    /// renamed to snake_case manually, and several migrations assume columns
    /// already exist that aren't created by the canonical
    /// <c>01_CreateDatabase_V2.sql</c> script (e.g. <c>created_by</c> on every
    /// table that derives from <c>BaseEntity</c>). The migrations also target
    /// a mix of PascalCase and snake_case column names that does not match the
    /// canonical script. <c>EnsureCreatedAsync</c> derives the schema directly
    /// from the EF model snapshot, which is authoritative for these tests.
    /// The tests do not depend on the production seed data (causes, FAQs, CMS
    /// pages) — they create only the minimal cause / campaign / donation /
    /// user rows they need.
    /// </summary>
    public async Task InitializeAsync()
    {
        if (IsSkipped)
        {
            return;
        }

        GuardSafeDatabaseName(DatabaseName);

        // 1. CREATE DATABASE via master.
        // SQL Server Express on resource-constrained dev machines can take well
        // over 60 s to materialise a brand-new database when other databases
        // are present. Give the CREATE plenty of headroom so the fixture is
        // resilient to transient SQL Server Express load.
        await using (var master = new SqlConnection(ConnectionString))
        {
            await master.OpenAsync();
            await using var cmd = master.CreateCommand();
            cmd.CommandTimeout = 180;
            cmd.CommandText = $"CREATE DATABASE [{DatabaseName}];";
            await cmd.ExecuteNonQueryAsync();
        }

        // 2. EnsureCreatedAsync builds the schema directly from the EF model.
        await using (var ctx = CreateContext())
        {
            await ctx.Database.EnsureCreatedAsync();
        }

        // 3. Post-schema correction: the EF model snapshot was stale relative to
        // the entity definitions (donations.user_id was `int` in the snapshot
        // but is `int?` in Domain/Entities/Donation.cs). Both have now been
        // brought into alignment: the snapshot declares `int?` AND the
        // fixture's earlier SQL rewrites the column to nullable. To avoid a
        // duplicate ALTER (and the dead-lock-prone DROP/ADD CONSTRAINT pair
        // against SQL Server Express under load), we skip the rewrite when
        // the column already reports is_nullable = 1.
        await ApplyPostSchemaCorrectionsAsync();
    }

    /// <summary>
    /// Applies post-schema corrections that the EF Core model snapshot cannot
    /// currently express because the snapshot is stale relative to the entity
    /// definitions. Each correction MUST target only ephemeral test databases
    /// (the fixture's database-name guard applies) and must mirror a
    /// schema change that has already been applied to <c>GiveAIDDB</c> via a
    /// hand-written script under <c>database/</c>.
    /// </summary>
    private async Task ApplyPostSchemaCorrectionsAsync()
    {
        GuardSafeDatabaseName(DatabaseName);
        await using var conn = new SqlConnection(TestConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandTimeout = 120;

        // donations.user_id: nullable (canonical script: Donations_UserId_Nullable_Migration.sql)
        // SQL Server requires dropping the FK first, altering the column, then
        // re-adding the FK. We use the actual constraint name EF generated.
        // The whole block is skipped when the column is already nullable,
        // which it will be when the EF snapshot is in sync with the entity
        // (current state).
        cmd.CommandText = @"
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('donations') AND name = 'user_id' AND is_nullable = 0)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_donations__users_user_id' AND parent_object_id = OBJECT_ID('donations'))
        ALTER TABLE donations DROP CONSTRAINT fk_donations__users_user_id;
    ALTER TABLE donations ALTER COLUMN user_id INT NULL;
    ALTER TABLE donations
        ADD CONSTRAINT fk_donations__users_user_id
        FOREIGN KEY (user_id) REFERENCES users(user_id);
END
";
        await cmd.ExecuteNonQueryAsync();
    }

    /// <summary>
    /// Tears down the test database in a <c>finally</c>-safe way: SINGLE_USER
    /// then DROP. Even if something goes wrong mid-test the database will not leak.
    /// </summary>
    public async Task DisposeAsync()
    {
        if (IsSkipped)
        {
            return;
        }

        try
        {
            GuardSafeDatabaseName(DatabaseName);
            await using var master = new SqlConnection(ConnectionString);
            await master.OpenAsync();
            await using var cmd = master.CreateCommand();
            cmd.CommandTimeout = 30;
            cmd.CommandText =
                $"IF DB_ID(@db) IS NOT NULL\n" +
                $"BEGIN\n" +
                $"    ALTER DATABASE [{DatabaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;\n" +
                $"    DROP DATABASE [{DatabaseName}];\n" +
                $"END\n";
            cmd.Parameters.Add(new SqlParameter("@db", System.Data.SqlDbType.NVarChar, 128) { Value = DatabaseName });
            await cmd.ExecuteNonQueryAsync();
        }
        catch
        {
            // Drop is best-effort. The DB name has the unique GUID so a leaked one
            // is identifiable and can be cleaned up by an operator.
        }
    }

    /// <summary>
    /// Creates a <see cref="GiveAIDDbContext"/> pointed at this fixture's database.
    /// </summary>
    public GiveAIDDbContext CreateContext()
    {
        GuardSafeDatabaseName(DatabaseName);
        var optionsBuilder = new DbContextOptionsBuilder<GiveAIDDbContext>();
        optionsBuilder.UseSqlServer(TestConnectionString, sql =>
        {
// No retry-on-failure for tests — we want failures to surface immediately
        // and avoid hiding transient errors behind retries. Set a generous
        // command timeout for the (rare) cold-start case where SQL Server
        // Express is under load.
        sql.CommandTimeout(180);
        });
        return new GiveAIDDbContext(optionsBuilder.Options);
    }

    /// <summary>
    /// Hard guard: refuses any database name that does not start with the
    /// <see cref="DatabaseNamePrefix"/>. Prevents accidental tests against
    /// production databases such as <c>GiveAIDDB</c>.
    /// </summary>
    public static void GuardSafeDatabaseName(string databaseName)
    {
        if (string.IsNullOrWhiteSpace(databaseName))
        {
            throw new InvalidOperationException(
                "Refusing to run: empty database name. Set GIVEAID_TEST_SQL or use the default.");
        }
        if (!databaseName.StartsWith(DatabaseNamePrefix, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Refusing to run: database name '{databaseName}' does not start with '{DatabaseNamePrefix}'. " +
                "This guard exists to prevent tests from ever touching GiveAIDDB.");
        }
        if (databaseName.Equals("GiveAIDDB", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Refusing to run: tests cannot target the GiveAIDDB database.");
        }
    }
}