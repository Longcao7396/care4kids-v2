using FluentAssertions;
using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Features.Donations.Commands.ConfirmWebhook;
using GiveAID.Application.Services;
using GiveAID.Domain.Entities;
using GiveAID.Tests.Unit.Application.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MockQueryable.Moq;
using Moq;

namespace GiveAID.Tests.Unit.Application.Donations;

/// <summary>
/// Targeted unit tests for the audit-fix aggregation behavior of
/// <see cref="ConfirmWebhookCommandHandler"/>.
///
/// Aggregate invariant:
///   campaigns.raised_amount = SUM(amount WHERE status='Completed')
///   causes.raised_amount    = SUM(amount WHERE status='Completed')
/// </summary>
public class ConfirmWebhookCommandHandlerTests
{
    private readonly Mock<IApplicationDbContext> _contextMock;
    private readonly Mock<IPaymentGateway> _paymentGatewayMock;
    private readonly Mock<IEmailSender> _emailSenderMock;
    private readonly Mock<ICacheService> _cacheServiceMock;
    private readonly Mock<INotificationService> _notificationServiceMock;
    private readonly Mock<IAtomicCampaignUpdater> _atomicUpdaterMock;
    private readonly Mock<IDbTransactionFactory> _dbTransactionFactoryMock;
    private readonly TestDbExecutionStrategy _executionStrategy;
    private readonly Mock<ILogger<ConfirmWebhookCommandHandler>> _loggerMock;

    private readonly List<(int DonationId, string From, string To)> _transitionCalls = new();
    private readonly List<(int CampaignId, decimal Amount)> _campaignIncrementCalls = new();
    private readonly List<(int CauseId, decimal Delta)> _causeDeltaCalls = new();
    private readonly List<Donation> _donations = new();
    private readonly List<WebhookLog> _webhookLogs = new();

    public ConfirmWebhookCommandHandlerTests()
    {
        _contextMock = new Mock<IApplicationDbContext>();
        _paymentGatewayMock = new Mock<IPaymentGateway>();
        _emailSenderMock = new Mock<IEmailSender>();
        _cacheServiceMock = new Mock<ICacheService>();
        _notificationServiceMock = new Mock<INotificationService>();
        _atomicUpdaterMock = new Mock<IAtomicCampaignUpdater>();
        _dbTransactionFactoryMock = new Mock<IDbTransactionFactory>();
        _executionStrategy = new TestDbExecutionStrategy();
        _loggerMock = new Mock<ILogger<ConfirmWebhookCommandHandler>>();

        // Donations queryable
        var mockDonationSet = _donations.AsQueryable().BuildMockDbSet();
        mockDonationSet.Setup(s => s.FindAsync(It.IsAny<object[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((object[] ids, CancellationToken _) =>
                _donations.FirstOrDefault(d => d.DonationId == Convert.ToInt32(ids[0])));
        _contextMock.Setup(c => c.Donations).Returns(mockDonationSet.Object);

        // WebhookLogs queryable
        var mockWebhookSet = _webhookLogs.AsQueryable().BuildMockDbSet();
        _contextMock.Setup(c => c.WebhookLogs).Returns(mockWebhookSet.Object);

        // Campaigns/Causes — minimal FindAsync stubs (used by notification enrichment)
        var campaigns = new List<Campaign>
        {
            new Campaign { CampaignId = 11, CampaignName = "C1" }
        }.AsQueryable().BuildMockDbSet();
        campaigns.Setup(s => s.FindAsync(It.IsAny<object[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((object[] ids, CancellationToken _) =>
                campaigns.Object.FirstOrDefault(c => c.CampaignId == Convert.ToInt32(ids[0])));
        _contextMock.Setup(c => c.Campaigns).Returns(campaigns.Object);

        var causes = new List<Cause>
        {
            new Cause { CauseId = 7, CauseName = "Cause1" }
        }.AsQueryable().BuildMockDbSet();
        causes.Setup(s => s.FindAsync(It.IsAny<object[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((object[] ids, CancellationToken _) =>
                causes.Object.FirstOrDefault(c => c.CauseId == Convert.ToInt32(ids[0])));
        _contextMock.Setup(c => c.Causes).Returns(causes.Object);

        _contextMock.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        // Phase 1: IDbTransactionFactory returns an IAppTransactionScope.
        _dbTransactionFactoryMock
            .Setup(f => f.BeginTransactionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new TestAppTransactionScope());

        // Default: TryTransitionDonationStatusAsync returns true (the transition won).
        // Tests that need the opposite behavior override this.
        _atomicUpdaterMock
            .Setup(u => u.TryTransitionDonationStatusAsync(
                It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .Callback<int, string, string, CancellationToken>(
                (id, from, to, _) => _transitionCalls.Add((id, from, to)))
            .ReturnsAsync(true);

        _atomicUpdaterMock
            .Setup(u => u.IncrementRaisedAmountAsync(
                It.IsAny<int>(), It.IsAny<decimal>(),
                It.IsAny<CancellationToken>()))
            .Callback<int, decimal, CancellationToken>(
                (cid, amt, _) => _campaignIncrementCalls.Add((cid, amt)))
            .Returns(Task.FromResult(1));

        _atomicUpdaterMock
            .Setup(u => u.ApplyCauseRaisedAmountDeltaAsync(
                It.IsAny<int>(), It.IsAny<decimal>(),
                It.IsAny<CancellationToken>()))
            .Callback<int, decimal, CancellationToken>(
                (causeId, delta, _) => _causeDeltaCalls.Add((causeId, delta)))
            .Returns(Task.FromResult(1));
    }

    private ConfirmWebhookCommandHandler MakeHandler() => new(
        _contextMock.Object,
        _paymentGatewayMock.Object,
        _emailSenderMock.Object,
        _cacheServiceMock.Object,
        _notificationServiceMock.Object,
        _atomicUpdaterMock.Object,
        _dbTransactionFactoryMock.Object,
        _executionStrategy,
        _loggerMock.Object);

    private void SetupValidWebhook(string eventType, string txnId, string eventId)
    {
        _paymentGatewayMock
            .Setup(p => p.VerifyWebhookAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new WebhookVerificationResult
            {
                Valid = true,
                EventType = eventType,
                EventId = eventId,
                TransactionId = txnId,
                RawPayload = "{}"
            });
    }

    // ====================================================================
    // Test 2: First confirmation (Pending → Completed) via webhook
    // ====================================================================

    [Fact]
    public async Task Handle_PaymentIntentSucceeded_PendingDonation_IncrementsAggregatesOnce()
    {
        _donations.Add(new Donation
        {
            DonationId = 1,
            CauseId = 7,
            CampaignId = 11,
            Amount = 250m,
            PaymentStatus = "Pending",
            GatewayTransactionId = "TXN-1"
        });
        SetupValidWebhook("payment_intent.succeeded", "TXN-1", "evt-1");

        var handler = MakeHandler();
        await handler.Handle(new ConfirmWebhookCommand { Gateway = "stripe", Payload = "{}", Signature = "sig" },
            CancellationToken.None);

        _transitionCalls.Should().ContainSingle().Which.Should().Be((1, "Pending", "Completed"));
        _campaignIncrementCalls.Should().ContainSingle().Which.Should().Be((11, 250m));
        _causeDeltaCalls.Should().ContainSingle().Which.Should().Be((7, 250m));
    }

    // ====================================================================
    // Test 3: Duplicate webhook (Completed → Completed) does NOT increment
    // (the atomic SQL `WHERE payment_status='Pending'` matches 0 rows)
    // ====================================================================

    [Fact]
    public async Task Handle_DuplicateSucceededWebhook_AlreadyCompleted_DoesNotIncrementAggregates()
    {
        _atomicUpdaterMock
            .Setup(u => u.TryTransitionDonationStatusAsync(
                It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _donations.Add(new Donation
        {
            DonationId = 2,
            CauseId = 7,
            CampaignId = 11,
            Amount = 250m,
            PaymentStatus = "Completed",
            PaymentConfirmedAt = DateTime.UtcNow.AddMinutes(-1),
            GatewayTransactionId = "TXN-2"
        });
        SetupValidWebhook("payment_intent.succeeded", "TXN-2", "evt-2");

        var handler = MakeHandler();
        await handler.Handle(new ConfirmWebhookCommand { Gateway = "stripe", Payload = "{}", Signature = "sig" },
            CancellationToken.None);

        _campaignIncrementCalls.Should().BeEmpty(
            "re-delivering a succeeded webhook must not double-count the aggregates");
        _causeDeltaCalls.Should().BeEmpty();
    }

    // ====================================================================
    // Test 4: Webhook idempotency on already-completed donation
    // ====================================================================

    [Fact]
    public async Task Handle_WebhookAfterCompletion_DoesNotIncrementAgain()
    {
        _atomicUpdaterMock
            .Setup(u => u.TryTransitionDonationStatusAsync(
                It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _donations.Add(new Donation
        {
            DonationId = 3,
            CauseId = 7,
            CampaignId = 11,
            Amount = 100m,
            PaymentStatus = "Completed",
            PaymentConfirmedAt = DateTime.UtcNow.AddMinutes(-5),
            GatewayTransactionId = "TXN-3"
        });
        SetupValidWebhook("charge.succeeded", "TXN-3", "evt-3");

        var handler = MakeHandler();
        await handler.Handle(new ConfirmWebhookCommand { Gateway = "stripe", Payload = "{}", Signature = "sig" },
            CancellationToken.None);

        _campaignIncrementCalls.Should().BeEmpty();
        _causeDeltaCalls.Should().BeEmpty();
    }

    // ====================================================================
    // Test 5: Webhook replay idempotency — Stripe may retry the same event.
    // ====================================================================

    [Fact]
    public async Task Handle_ConcurrentWebhookReplay_OnlyFirstIncrementApplies()
    {
        // First replay wins; subsequent replays return false from the atomic transition.
        var callCount = 0;
        _atomicUpdaterMock
            .Setup(u => u.TryTransitionDonationStatusAsync(
                It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => Interlocked.Increment(ref callCount) == 1);

        _donations.Add(new Donation
        {
            DonationId = 4,
            CauseId = 7,
            CampaignId = 11,
            Amount = 999m,
            PaymentStatus = "Pending",
            GatewayTransactionId = "TXN-4"
        });
        SetupValidWebhook("payment_intent.succeeded", "TXN-4", "evt-4");

        var handler = MakeHandler();

        // First delivery — transition wins.
        await handler.Handle(new ConfirmWebhookCommand { Gateway = "stripe", Payload = "{}", Signature = "sig" },
            CancellationToken.None);
        _campaignIncrementCalls.Should().ContainSingle();
        _causeDeltaCalls.Should().ContainSingle();

        // Replay (different eventId would normally be a different webhook, but the
        // donation status is already 'Completed', so the SQL transition returns false).
        // Reset the mocks and override to return false for the second call.
        _atomicUpdaterMock
            .Setup(u => u.TryTransitionDonationStatusAsync(
                It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // NB: in real life Stripe sends a different eventId for the replay; the
        // outer handler rejects it via WebhookLogs dedup. We test the inner
        // "transition lost" path by simulating the SQL UPDATE missing 0 rows.
        // Force webhook dedup log lookup to return false so we reach the inner path:
        _webhookLogs.Add(new WebhookLog { EventId = "evt-4-replay", Gateway = "stripe", ProcessingStatus = "Processed" });

        await handler.Handle(new ConfirmWebhookCommand { Gateway = "stripe", Payload = "{}", Signature = "evt-4-replay" },
            CancellationToken.None);

        _campaignIncrementCalls.Should().ContainSingle(
            "the second webhook replay must not increment again");
        _causeDeltaCalls.Should().ContainSingle();
    }

    // ====================================================================
    // Test 6: Anonymous donation (UserId = null) still updates aggregates
    // ====================================================================

    [Fact]
    public async Task Handle_PaymentIntentSucceeded_AnonymousDonation_StillUpdatesAggregates()
    {
        _donations.Add(new Donation
        {
            DonationId = 5,
            CauseId = 7,
            CampaignId = 11,
            Amount = 75m,
            PaymentStatus = "Pending",
            UserId = null,
            IsAnonymous = true,
            GatewayTransactionId = "TXN-5"
        });
        SetupValidWebhook("payment_intent.succeeded", "TXN-5", "evt-5");

        var handler = MakeHandler();
        await handler.Handle(new ConfirmWebhookCommand { Gateway = "stripe", Payload = "{}", Signature = "sig" },
            CancellationToken.None);

        _campaignIncrementCalls.Should().ContainSingle().Which.Should().Be((11, 75m));
        _causeDeltaCalls.Should().ContainSingle().Which.Should().Be((7, 75m));
    }

    // ====================================================================
    // Test 7: Pending → Failed must NOT change aggregates
    // ====================================================================

    [Fact]
    public async Task Handle_PaymentFailed_PendingDonation_DoesNotChangeAggregates()
    {
        _donations.Add(new Donation
        {
            DonationId = 6,
            CauseId = 7,
            CampaignId = 11,
            Amount = 300m,
            PaymentStatus = "Pending",
            GatewayTransactionId = "TXN-6"
        });
        SetupValidWebhook("payment_intent.payment_failed", "TXN-6", "evt-6");

        var handler = MakeHandler();
        await handler.Handle(new ConfirmWebhookCommand { Gateway = "stripe", Payload = "{}", Signature = "sig" },
            CancellationToken.None);

        _campaignIncrementCalls.Should().BeEmpty(
            "Pending donations never contributed to aggregates, so transitioning to Failed is a no-op");
        _causeDeltaCalls.Should().BeEmpty();
    }

    // ====================================================================
    // Test 8: Completed → Refunded decrements aggregates
    // ====================================================================

    [Fact]
    public async Task Handle_Refunded_CompletedDonation_DecrementsAggregates()
    {
        _donations.Add(new Donation
        {
            DonationId = 7,
            CauseId = 7,
            CampaignId = 11,
            Amount = 500m,
            PaymentStatus = "Completed",
            PaymentConfirmedAt = DateTime.UtcNow.AddMinutes(-10),
            GatewayTransactionId = "TXN-7"
        });
        SetupValidWebhook("charge.refunded", "TXN-7", "evt-7");

        var handler = MakeHandler();
        await handler.Handle(new ConfirmWebhookCommand { Gateway = "stripe", Payload = "{}", Signature = "sig" },
            CancellationToken.None);

        _transitionCalls.Should().ContainSingle().Which.Should().Be((7, "Completed", "Refunded"));
        _campaignIncrementCalls.Should().ContainSingle().Which.Should().Be((11, -500m));
        _causeDeltaCalls.Should().ContainSingle().Which.Should().Be((7, -500m));
    }

    // Step 5 webhook robustness: a Pending → Refunded transition from the webhook
    // (e.g. someone messing with Stripe) must NOT 500 the webhook. The handler
    // catches the domain exception, logs it as a warning, and returns true.
    [Fact]
    public async Task Handle_Refunded_PendingDonation_DoesNotPropagateException()
    {
        _donations.Add(new Donation
        {
            DonationId = 8,
            CauseId = 7,
            CampaignId = 11,
            Amount = 100m,
            PaymentStatus = "Pending",
            GatewayTransactionId = "TXN-8"
        });
        SetupValidWebhook("charge.refunded", "TXN-8", "evt-8");

        var handler = MakeHandler();

        // Must NOT throw — webhook returns success (200) so Stripe does not retry forever.
        var act = async () => await handler.Handle(
            new ConfirmWebhookCommand { Gateway = "stripe", Payload = "{}", Signature = "sig" },
            CancellationToken.None);

        await act.Should().NotThrowAsync("webhook robustness — invalid transitions must not 500 the webhook");
        _campaignIncrementCalls.Should().BeEmpty();
        _causeDeltaCalls.Should().BeEmpty();
    }

    [Fact]
    public async Task Handle_DuplicateRefundWebhook_DoesNotDoubleDecrement()
    {
        _atomicUpdaterMock
            .Setup(u => u.TryTransitionDonationStatusAsync(
                It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _donations.Add(new Donation
        {
            DonationId = 9,
            CauseId = 7,
            CampaignId = 11,
            Amount = 500m,
            PaymentStatus = "Refunded",
            GatewayTransactionId = "TXN-9"
        });
        SetupValidWebhook("charge.refunded", "TXN-9", "evt-9");

        var handler = MakeHandler();
        await handler.Handle(new ConfirmWebhookCommand { Gateway = "stripe", Payload = "{}", Signature = "sig" },
            CancellationToken.None);

        _campaignIncrementCalls.Should().BeEmpty(
            "duplicate refund webhooks must not double-decrement the aggregate");
        _causeDeltaCalls.Should().BeEmpty();
    }

    // ====================================================================
    // Phase 1 rollback test: a failure during the aggregate UPDATE rolls back
    // the whole block — including SaveChangesAsync — so donation status +
    // PaymentConfirmedAt + aggregates are all unchanged.
    // (Whether the exception propagates or is swallowed by the outer catch is
    // a separate concern from the transactional rollback semantics that the
    // Phase 1 fix is responsible for.)
    // ====================================================================

    [Fact]
    public async Task Handle_WhenAggregateUpdateFails_TransactionIsRolledBack()
    {
        _donations.Add(new Donation
        {
            DonationId = 60,
            CauseId = 7,
            CampaignId = 11,
            Amount = 800m,
            PaymentStatus = "Pending",
            GatewayTransactionId = "TXN-60"
        });
        SetupValidWebhook("payment_intent.succeeded", "TXN-60", "evt-60");

        // Capture every scope the factory yields so we can assert rollback.
        var capturedScopes = new List<TestAppTransactionScope>();
        _dbTransactionFactoryMock
            .Setup(f => f.BeginTransactionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                var scope = new TestAppTransactionScope();
                capturedScopes.Add(scope);
                return scope;
            });

        // Inject failure AFTER SaveChangesAsync but during the aggregate UPDATE.
        // Use a non-domain exception (DbUpdateException) so the outer catch
        // (which only swallows InvalidOperationException from MarkAsRefunded)
        // does not interfere — the focus of this test is the transaction
        // rollback, not exception propagation.
        _atomicUpdaterMock
            .Setup(u => u.IncrementRaisedAmountAsync(
                It.IsAny<int>(), It.IsAny<decimal>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Microsoft.EntityFrameworkCore.DbUpdateException("Simulated aggregate-write failure"));

        var handler = MakeHandler();
        try
        {
            await handler.Handle(
                new ConfirmWebhookCommand { Gateway = "stripe", Payload = "{}", Signature = "sig" },
                CancellationToken.None);
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException)
        {
            // Expected — the simulated aggregate-write failure propagates so Stripe
            // can retry. The transactional rollback below is the real assertion.
        }

        // The transactional scope that wraps the inner ProcessSuccessAsync must have
        // been rolled back, NOT committed.
        capturedScopes.Should().NotBeEmpty(
            "the handler must open at least one IAppTransactionScope for the inner work");
        capturedScopes.Should().OnlyContain(s => s.CommitCalls == 0,
            "no transaction may commit when an aggregate UPDATE throws");
        capturedScopes.Should().Contain(s => s.RollbackCalls == 1,
            "at least one scope must roll back");
        capturedScopes.Should().OnlyContain(s => s.DisposeCalls >= 1,
            "all scopes must be disposed");
    }
}