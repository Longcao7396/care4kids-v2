namespace GiveAID.Tests.Infrastructure.Integration.Donations;

/// <summary>
/// All SQL Server integration tests share one <see cref="SqlServerFixture"/>.
/// xUnit creates one fixture instance per test class that includes this
/// collection definition, so the database is created once and dropped once
/// per test run.
/// </summary>
[CollectionDefinition(Name)]
public sealed class DonationSqlServerCollection : ICollectionFixture<SqlServerFixture>
{
    public const string Name = "DonationSqlServerCollection";
}