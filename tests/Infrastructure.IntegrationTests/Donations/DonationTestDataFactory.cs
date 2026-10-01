using GiveAID.Domain.Entities;

namespace GiveAID.Tests.Infrastructure.Integration.Donations;

/// <summary>
/// Helpers to seed minimal cause / campaign / donation / user rows for the
/// real-SQL-Server concurrency tests. Every entity is created with values
/// sufficient to satisfy the EF Core model + the snake_case NOT NULL columns
/// created by <c>01_CreateDatabase_V2.sql</c>.
/// </summary>
internal static class DonationTestDataFactory
{
    public const string DefaultGateway = "stripe";

    public static Cause CreateCause(string causeName = "Test Cause", decimal raisedAmount = 0m)
        => new()
        {
            // CauseId is IDENTITY in the DB; let SQL Server assign it.
            CauseId = 0,
            CauseName = causeName,
            TargetAmount = 100_000m,
            RaisedAmount = raisedAmount,
            IsActive = true,
            DisplayOrder = 1
        };

    public static Campaign CreateCampaign(int causeId, decimal raisedAmount = 0m, string status = "Active")
        => new()
        {
            CampaignId = 0,
            CauseId = causeId,
            CampaignName = $"Test Campaign",
            GoalAmount = 100_000m,
            RaisedAmount = raisedAmount,
            StartDate = DateTime.UtcNow.AddDays(-10),
            EndDate = DateTime.UtcNow.AddDays(60),
            Status = status
        };

    public static User CreateUser(int userId, string usernamePrefix = "user")
        => new()
        {
            // UserId is IDENTITY in the DB; let SQL Server assign it.
            UserId = 0,
            // Email has a UNIQUE constraint; include a Guid suffix so each test
            // in the shared-fixture collection can seed a user without colliding.
            Username = $"{usernamePrefix}{userId}_{Guid.NewGuid():N}".Substring(0, 30),
            Email = $"{usernamePrefix}{userId}_{Guid.NewGuid():N}@example.test",
            PasswordHash = "hashed",
            FullName = $"Test User {userId}",
            Role = "User",
            IsActive = true,
            IsVerified = true
        };

    public static Donation CreatePendingDonation(
        int? donationId,
        int causeId,
        int? campaignId,
        decimal amount,
        int? userId = null,
        string gatewayTransactionId = "TXN-default")
        => new()
        {
            DonationId = donationId ?? 0,
            UserId = userId,
            CauseId = causeId,
            CampaignId = campaignId,
            Amount = amount,
            PaymentMethod = "stripe",
            PaymentStatus = "Pending",
            GatewayTransactionId = gatewayTransactionId,
            DonationDate = DateTime.UtcNow
        };
}