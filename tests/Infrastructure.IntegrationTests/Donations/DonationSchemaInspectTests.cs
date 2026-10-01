using FluentAssertions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using GiveAID.Domain.Entities;
using GiveAID.Infrastructure.Persistence;

namespace GiveAID.Tests.Infrastructure.Integration.Donations;

[Collection(DonationSqlServerCollection.Name)]
public class DonationSchemaInspectTests
{
    private readonly SqlServerFixture _fixture;

    public DonationSchemaInspectTests(SqlServerFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact(Skip = "Diagnostic-only: throws on purpose to surface EF model metadata in the test log. Not a real assertion.")]
    public void PrintEfModelForDonation()
    {
        if (_fixture.IsSkipped) return;

        // Build a context but DO NOT touch the DB.
        using var ctx = _fixture.CreateContext();
        var entityType = ctx.Model.FindEntityType(typeof(Donation));
        var lines = new List<string>();
        if (entityType != null)
        {
            lines.Add("=== EF Model: Donation properties ===");
            foreach (var prop in entityType.GetProperties())
            {
                lines.Add($"  {prop.Name,-30} ClrType={prop.ClrType.Name,-10} IsNullable={prop.IsNullable}  Column={prop.GetColumnName()}");
            }
        }

        throw new Xunit.Sdk.XunitException(string.Join("\n", lines));
    }
}