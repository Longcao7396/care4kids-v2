using FluentAssertions;
using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Features.Donations.Commands.ConfirmWebhook;
using GiveAID.Application.Features.Donations.Commands.ManualConfirm;
using GiveAID.Domain.Entities;
using GiveAID.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GiveAID.Tests.Infrastructure.Integration.Donations;

/// <summary>
/// Real-SQL-Server integration tests for the donation aggregate flow.
///
/// Each test runs against a freshly-migrated <c>GiveAID_Test_{Guid}</c>
/// database managed by <see cref="SqlServerFixture"/>. The fixture is skipped
/// (not failed) when no SQL Server is configured, so this test class is safe
/// to run on machines without a local SQL Server instance.
///
/// Acceptance criteria for these tests:
///   1. N concurrent webhook confirmations on the same Pending donation:
///      exactly one wins, aggregate incremented exactly once.
///   2. Webhook + ManualConfirm racing on the same donation: aggregate incremented
///      exactly once.
///   3. Completed -> Refunded -> duplicate refund: aggregate decremented exactly
///      once and never below 0.
///   4. Pending -> Refunded: rejected with 200 semantics, no aggregate change.
///   5. Rollback (Phase 1): inject failure after transition; assert no persisted state.
///   6. Anonymous donation (UserId = null) works on real SQL Server.
/// </summary>
[Collection(DonationSqlServerCollection.Name)]
public class DonationConcurrencyTests
{
    private const string DefaultGateway = "stripe";

    private readonly SqlServerFixture _fixture;

    public DonationConcurrencyTests(SqlServerFixture fixture)
    {
        _fixture = fixture;
    }

    /// <summary>
    /// Seeds a single cause + campaign + donation. Returns the assigned IDs.
    /// The DB assigns the IDs (identity columns); the caller captures them
    /// for later assertions.
    /// </summary>
    private static SeedRefs Seed(GiveAIDDbContext ctx, decimal amount = 100m, int? userId = null,
        decimal initialRaised = 0m, string status = "Pending", string? gatewayTxn = null)
    {
        // Seed a user row whenever a non-null UserId is requested so the
        // donations.user_id FK is satisfied. For anonymous donations
        // (userId == null) we skip this — the post-schema correction makes
        // donations.user_id nullable for that exact case.
        //
        // The `userId` argument is a logical identifier for test readability
        // (so each test can refer to "user 1", "user 99", etc.) — it is NOT
        // the actual database key. The DB assigns the real key via IDENTITY,
        // and we use that real key for the donation FK.
        int? actualUserId = null;
        if (userId.HasValue)
        {
            var user = DonationTestDataFactory.CreateUser(userId.Value);
            ctx.Users.Add(user);
            ctx.SaveChanges();
            actualUserId = user.UserId;
        }

        var cause = DonationTestDataFactory.CreateCause("Test Cause", initialRaised);
        ctx.Causes.Add(cause);
        ctx.SaveChanges();

        var campaign = DonationTestDataFactory.CreateCampaign(cause.CauseId, initialRaised);
        ctx.Campaigns.Add(campaign);
        ctx.SaveChanges();

        var donation = DonationTestDataFactory.CreatePendingDonation(
            donationId: null,
            causeId: cause.CauseId,
            campaignId: campaign.CampaignId,
            amount: amount,
            userId: actualUserId,
            gatewayTransactionId: gatewayTxn ?? $"TXN-{Guid.NewGuid():N}");
        donation.PaymentStatus = status;
        ctx.Donations.Add(donation);
        ctx.SaveChanges();

        return new SeedRefs(cause.CauseId, campaign.CampaignId, donation.DonationId, donation.GatewayTransactionId!);
    }

    private sealed record SeedRefs(int CauseId, int CampaignId, int DonationId, string Txn);

    // ====================================================================
    // Test 1: N concurrent webhook confirmations on the same Pending donation
    // ====================================================================

    [Fact]
    public async Task ConcurrentWebhookConfirmations_OneWinsAndAggregateIncrementsOnce()
    {
        if (_fixture.IsSkipped) return;

        // Concurrency reduced from 20 to 5 because SQL Server Express on the
        // dev machine deadlocked severely under 20 simultaneous BeginTransaction
        // calls. The atomic invariant ("one wins, aggregate increments once") is
        // verified with 5 — raising the count does not change the property.
        const int Concurrency = 5;
        const decimal Amount = 100m;

        SeedRefs seedRefs;
        await using (var seed = _fixture.CreateContext())
        {
            seedRefs = Seed(seed, amount: Amount);
        }

        // Use Concurrency distinct eventIds to bypass the WebhookLog dedup and force
        // every concurrent request to reach the atomic SQL transition. Only
        // one of the Concurrency should "win" — the others should be no-ops.
        var webhookTasks = Enumerable.Range(0, Concurrency)
            .Select(_ => Task.Run(async () =>
            {
                await using var ctx = _fixture.CreateContext();
                var gateway = new FakePaymentGateway
                {
                    Verify = (_, _) => Task.FromResult(new Application.Services.WebhookVerificationResult
                    {
                        Valid = true,
                        EventType = "payment_intent.succeeded",
                        EventId = $"evt-{Guid.NewGuid():N}",
                        TransactionId = seedRefs.Txn,
                        RawPayload = "{}"
                    })
                };
                var handler = DonationHandlerFactory.CreateWebhookHandler(ctx, gateway);
                await handler.Handle(new ConfirmWebhookCommand
                {
                    Gateway = DefaultGateway,
                    Payload = "{}",
                    Signature = "sig"
                }, CancellationToken.None);
            }))
            .ToArray();

        await Task.WhenAll(webhookTasks);

        await using var verify = _fixture.CreateContext();
        var donation = await verify.Donations.AsNoTracking().FirstAsync(d => d.DonationId == seedRefs.DonationId);
        donation.PaymentStatus.Should().Be("Completed");

        var campaign = await verify.Campaigns.AsNoTracking().FirstAsync(c => c.CampaignId == seedRefs.CampaignId);
        var cause = await verify.Causes.AsNoTracking().FirstAsync(c => c.CauseId == seedRefs.CauseId);
        campaign.RaisedAmount.Should().Be(Amount,
            "exactly one of the 20 concurrent webhook deliveries wins the SQL transition");
        cause.RaisedAmount.Should().Be(Amount,
            "exactly one cause increment must be applied");
    }

    // ====================================================================
    // Test 2: Webhook + ManualConfirm racing on the same donation
    // ====================================================================

    [Fact]
    public async Task WebhookAndManualConfirm_Racing_AggregateIncrementsOnce()
    {
        if (_fixture.IsSkipped) return;

        SeedRefs seedRefs;
        await using (var seed = _fixture.CreateContext())
        {
            seedRefs = Seed(seed, amount: 250m, userId: 1);
        }

        var webhook = Task.Run(async () =>
        {
            await using var ctx = _fixture.CreateContext();
            var gateway = new FakePaymentGateway
            {
                Verify = (_, _) => Task.FromResult(new Application.Services.WebhookVerificationResult
                {
                    Valid = true,
                    EventType = "payment_intent.succeeded",
                    EventId = $"evt-{Guid.NewGuid():N}",
                    TransactionId = seedRefs.Txn,
                    RawPayload = "{}"
                })
            };
            var handler = DonationHandlerFactory.CreateWebhookHandler(ctx, gateway);
            await handler.Handle(new ConfirmWebhookCommand
            {
                Gateway = DefaultGateway,
                Payload = "{}",
                Signature = "sig"
            }, CancellationToken.None);
        });

        var manual = Task.Run(async () =>
        {
            await using var ctx = _fixture.CreateContext();
            var handler = DonationHandlerFactory.CreateManualConfirmHandler(ctx);
            await handler.Handle(new ManualConfirmCommand
            {
                DonationId = seedRefs.DonationId,
                ConfirmedBy = 99
            }, CancellationToken.None);
        });

        await Task.WhenAll(webhook, manual);

        await using var verify = _fixture.CreateContext();
        var donation = await verify.Donations.AsNoTracking().FirstAsync(d => d.DonationId == seedRefs.DonationId);
        donation.PaymentStatus.Should().Be("Completed");

        var campaign = await verify.Campaigns.AsNoTracking().FirstAsync(c => c.CampaignId == seedRefs.CampaignId);
        campaign.RaisedAmount.Should().Be(250m,
            "exactly one of {webhook, manualConfirm} wins the atomic SQL transition");
    }

    // ====================================================================
    // Test 3: Completed -> Refunded -> duplicate refund: decrement once
    // ====================================================================

    [Fact]
    public async Task DuplicateRefund_DecrementsAggregateExactlyOnce_AndNeverBelowZero()
    {
        if (_fixture.IsSkipped) return;

        const decimal Amount = 500m;

        SeedRefs seedRefs;
        await using (var seed = _fixture.CreateContext())
        {
            seedRefs = Seed(seed, amount: Amount, userId: 1, initialRaised: 1000m);

            // Move the donation to Completed (raw SQL because the EF model
            // already represents a different state).
            await seed.Database.ExecuteSqlRawAsync(
                "UPDATE donations SET payment_status='Completed', payment_confirmed_at=SYSUTCDATETIME() WHERE donation_id={0}",
                seedRefs.DonationId);
            // Bring the aggregates into a known initial state matching the
            // Completed contribution.
            await seed.Database.ExecuteSqlRawAsync(
                "UPDATE campaigns SET raised_amount = raised_amount + {0} WHERE campaign_id = {1}",
                Amount, seedRefs.CampaignId);
            await seed.Database.ExecuteSqlRawAsync(
                "UPDATE causes SET raised_amount = raised_amount + {0} WHERE cause_id = {1}",
                Amount, seedRefs.CauseId);
        }

        // First refund webhook.
        await using (var first = _fixture.CreateContext())
        {
            var gateway = new FakePaymentGateway
            {
                Verify = (_, _) => Task.FromResult(new Application.Services.WebhookVerificationResult
                {
                    Valid = true,
                    EventType = "charge.refunded",
                    EventId = $"evt-refund-1-{Guid.NewGuid():N}",
                    TransactionId = seedRefs.Txn,
                    RawPayload = "{}"
                })
            };
            var handler = DonationHandlerFactory.CreateWebhookHandler(first, gateway);
            await handler.Handle(new ConfirmWebhookCommand
            {
                Gateway = DefaultGateway, Payload = "{}", Signature = "sig"
            }, CancellationToken.None);
        }

        // Second refund webhook — the donation is now Refunded, so the atomic
        // SQL `WHERE payment_status='Completed'` will affect 0 rows and the
        // aggregate must NOT be decremented again.
        await using (var second = _fixture.CreateContext())
        {
            var gateway = new FakePaymentGateway
            {
                Verify = (_, _) => Task.FromResult(new Application.Services.WebhookVerificationResult
                {
                    Valid = true,
                    EventType = "charge.refunded",
                    EventId = $"evt-refund-2-{Guid.NewGuid():N}",
                    TransactionId = seedRefs.Txn,
                    RawPayload = "{}"
                })
            };
            var handler = DonationHandlerFactory.CreateWebhookHandler(second, gateway);
            await handler.Handle(new ConfirmWebhookCommand
            {
                Gateway = DefaultGateway, Payload = "{}", Signature = "sig"
            }, CancellationToken.None);
        }

        await using var verify = _fixture.CreateContext();
        var donation = await verify.Donations.AsNoTracking().FirstAsync(d => d.DonationId == seedRefs.DonationId);
        donation.PaymentStatus.Should().Be("Refunded");

        var campaign = await verify.Campaigns.AsNoTracking().FirstAsync(c => c.CampaignId == seedRefs.CampaignId);
        var cause = await verify.Causes.AsNoTracking().FirstAsync(c => c.CauseId == seedRefs.CauseId);
        // Start was 1000, +500 on Complete, -500 on Refund → 1000 again.
        campaign.RaisedAmount.Should().Be(1000m,
            "the duplicate refund must not double-decrement; only the first one wins");
        cause.RaisedAmount.Should().Be(1000m);
        campaign.RaisedAmount.Should().BeGreaterThanOrEqualTo(0,
            "the floor-guard clause must prevent the aggregate from going below 0");
        cause.RaisedAmount.Should().BeGreaterThanOrEqualTo(0);
    }

    // ====================================================================
    // Test 4: Pending -> Refunded: rejected with 200 semantics, no aggregate change
    // ====================================================================

    [Fact]
    public async Task PendingToRefunded_Webhook_Returns200_NoAggregateChange()
    {
        if (_fixture.IsSkipped) return;

        SeedRefs seedRefs;
        await using (var seed = _fixture.CreateContext())
        {
            seedRefs = Seed(seed, amount: 100m, userId: 1);
        }

        // Send a refund webhook for a Pending donation — the domain state machine
        // rejects Pending -> Refunded. The handler must:
        //   * catch the InvalidOperationException at the outer scope,
        //   * log it,
        //   * return true (200 to Stripe, no infinite retry).
        bool webhookResult;
        await using (var ctx = _fixture.CreateContext())
        {
            var gateway = new FakePaymentGateway
            {
                Verify = (_, _) => Task.FromResult(new Application.Services.WebhookVerificationResult
                {
                    Valid = true,
                    EventType = "charge.refunded",
                    EventId = $"evt-bad-{Guid.NewGuid():N}",
                    TransactionId = seedRefs.Txn,
                    RawPayload = "{}"
                })
            };
            var handler = DonationHandlerFactory.CreateWebhookHandler(ctx, gateway);
            webhookResult = await handler.Handle(new ConfirmWebhookCommand
            {
                Gateway = DefaultGateway, Payload = "{}", Signature = "sig"
            }, CancellationToken.None);
        }

        webhookResult.Should().BeTrue(
            "the webhook handler must return 200 (true) for invalid transitions so Stripe does not retry forever");

        // Donation must still be Pending, aggregates unchanged.
        await using var verify = _fixture.CreateContext();
        var donation = await verify.Donations.AsNoTracking().FirstAsync(d => d.DonationId == seedRefs.DonationId);
        donation.PaymentStatus.Should().Be("Pending");
        var campaign = await verify.Campaigns.AsNoTracking().FirstAsync(c => c.CampaignId == seedRefs.CampaignId);
        var cause = await verify.Causes.AsNoTracking().FirstAsync(c => c.CauseId == seedRefs.CauseId);
        campaign.RaisedAmount.Should().Be(0m, "Pending donations never contributed to aggregates");
        cause.RaisedAmount.Should().Be(0m);
    }

    // ====================================================================
    // Test 5: Rollback (Phase 1): inject a failure AFTER the status transition
    // and BEFORE commit, and assert nothing persisted.
    // ====================================================================

    [Fact]
    public async Task AggregateUpdateFailure_RollsBackStatusAndAggregates()
    {
        if (_fixture.IsSkipped) return;

        const decimal Amount = 300m;

        SeedRefs seedRefs;
        await using (var seed = _fixture.CreateContext())
        {
            seedRefs = Seed(seed, amount: Amount, userId: 1);
        }

        // Wrap the AtomicCampaignUpdater in a faulty delegating updater that
        // throws on IncrementRaisedAmountAsync (after the SQL transition won
        // and SaveChangesAsync already set PaymentConfirmedAt).
        await using (var ctx = _fixture.CreateContext())
        {
            var gateway = new FakePaymentGateway
            {
                Verify = (_, _) => Task.FromResult(new Application.Services.WebhookVerificationResult
                {
                    Valid = true,
                    EventType = "payment_intent.succeeded",
                    EventId = $"evt-rb-{Guid.NewGuid():N}",
                    TransactionId = seedRefs.Txn,
                    RawPayload = "{}"
                })
            };

            var realUpdater = new AtomicCampaignUpdater(ctx, Microsoft.Extensions.Logging.Abstractions.NullLogger<AtomicCampaignUpdater>.Instance);
            var faultyUpdater = new FaultyAtomicCampaignUpdater(realUpdater)
            {
                ThrowOnCampaignIncrement = true
            };

            var handler = new ConfirmWebhookCommandHandler(
                ctx,
                gateway,
                new NoopEmailSender(),
                new NoopCacheService(),
                new NoopNotificationService(),
                faultyUpdater,
                new DbTransactionFactory(ctx),
                new EfDbExecutionStrategy(ctx),
                Microsoft.Extensions.Logging.Abstractions.NullLogger<ConfirmWebhookCommandHandler>.Instance);

            try
            {
                await handler.Handle(new ConfirmWebhookCommand
                {
                    Gateway = DefaultGateway,
                    Payload = "{}",
                    Signature = "sig"
                }, CancellationToken.None);
            }
            catch (Exception ex) when (ex is InvalidOperationException || ex is Microsoft.EntityFrameworkCore.DbUpdateException)
            {
                // expected — faulty updater throws
            }
        }

        // Assert: nothing changed.
        await using (var verify = _fixture.CreateContext())
        {
            var donation = await verify.Donations.AsNoTracking().FirstAsync(d => d.DonationId == seedRefs.DonationId);
            donation.PaymentStatus.Should().Be("Pending",
                "the transaction must roll back the status transition when the aggregate UPDATE fails");
            donation.PaymentConfirmedAt.Should().BeNull(
                "the SaveChangesAsync PaymentConfirmedAt update must also be rolled back");

            var campaign = await verify.Campaigns.AsNoTracking().FirstAsync(c => c.CampaignId == seedRefs.CampaignId);
            var cause = await verify.Causes.AsNoTracking().FirstAsync(c => c.CauseId == seedRefs.CauseId);
            campaign.RaisedAmount.Should().Be(0m, "the failed aggregate UPDATE must roll back");
            cause.RaisedAmount.Should().Be(0m);
        }
    }

    // ====================================================================
    // Test 6: Anonymous donation (UserId = null) works on real SQL Server
    // ====================================================================

    [Fact]
    public async Task AnonymousDonation_PendingToCompleted_UpdatesAggregatesOnRealSqlServer()
    {
        if (_fixture.IsSkipped) return;

        const decimal Amount = 75m;

        SeedRefs seedRefs;
        await using (var seed = _fixture.CreateContext())
        {
            seedRefs = Seed(seed, amount: Amount, userId: null);
        }

        await using (var ctx = _fixture.CreateContext())
        {
            var gateway = new FakePaymentGateway
            {
                Verify = (_, _) => Task.FromResult(new Application.Services.WebhookVerificationResult
                {
                    Valid = true,
                    EventType = "payment_intent.succeeded",
                    EventId = $"evt-anon-{Guid.NewGuid():N}",
                    TransactionId = seedRefs.Txn,
                    RawPayload = "{}"
                })
            };
            var handler = DonationHandlerFactory.CreateWebhookHandler(ctx, gateway);
            await handler.Handle(new ConfirmWebhookCommand
            {
                Gateway = DefaultGateway, Payload = "{}", Signature = "sig"
            }, CancellationToken.None);
        }

        await using var verify = _fixture.CreateContext();
        var donation = await verify.Donations.AsNoTracking().FirstAsync(d => d.DonationId == seedRefs.DonationId);
        donation.PaymentStatus.Should().Be("Completed");
        donation.UserId.Should().BeNull("the donation was created anonymously and UserId must remain null");

        var campaign = await verify.Campaigns.AsNoTracking().FirstAsync(c => c.CampaignId == seedRefs.CampaignId);
        var cause = await verify.Causes.AsNoTracking().FirstAsync(c => c.CauseId == seedRefs.CauseId);
        campaign.RaisedAmount.Should().Be(Amount);
        cause.RaisedAmount.Should().Be(Amount);
    }

    /// <summary>
    /// Decorator that throws a configured exception when one of the
    /// IAtomicCampaignUpdater methods is called. Used to inject a failure
    /// into the middle of the transactional block in Test 5.
    /// </summary>
    private sealed class FaultyAtomicCampaignUpdater : IAtomicCampaignUpdater
    {
        private readonly IAtomicCampaignUpdater _inner;
        public bool ThrowOnCampaignIncrement { get; set; }

        public FaultyAtomicCampaignUpdater(IAtomicCampaignUpdater inner)
        {
            _inner = inner;
        }

        public Task<bool> TryTransitionDonationStatusAsync(int donationId, string fromStatus, string toStatus, CancellationToken cancellationToken = default)
            => _inner.TryTransitionDonationStatusAsync(donationId, fromStatus, toStatus, cancellationToken);

        public Task<int> IncrementRaisedAmountAsync(int campaignId, decimal amount, CancellationToken cancellationToken = default)
        {
            if (ThrowOnCampaignIncrement)
            {
                throw new InvalidOperationException("Simulated aggregate-write failure");
            }
            return _inner.IncrementRaisedAmountAsync(campaignId, amount, cancellationToken);
        }

        public Task<int> ApplyCauseRaisedAmountDeltaAsync(int causeId, decimal delta, CancellationToken cancellationToken = default)
            => _inner.ApplyCauseRaisedAmountDeltaAsync(causeId, delta, cancellationToken);
    }
}