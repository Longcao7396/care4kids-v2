using FluentAssertions;
using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Features.Donations.Commands.ManualConfirm;
using GiveAID.Application.Services;
using GiveAID.Domain.Entities;
using GiveAID.Tests.Unit.Application.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace GiveAID.Tests.Unit.Application.Donations;

/// <summary>
/// Targeted unit tests for the audit-fix aggregation behavior of
/// <see cref="ManualConfirmCommandHandler"/>.
///
/// Aggregate invariant:
///   campaigns.raised_amount = SUM(amount WHERE status='Completed')
///   causes.raised_amount    = SUM(amount WHERE status='Completed')
/// </summary>
public class ManualConfirmCommandHandlerTests
{
    private readonly Mock<IApplicationDbContext> _contextMock;
    private readonly Mock<ICacheService> _cacheServiceMock;
    private readonly Mock<IAtomicCampaignUpdater> _atomicUpdaterMock;
    private readonly Mock<IDbTransactionFactory> _dbTransactionFactoryMock;
    private readonly TestDbExecutionStrategy _executionStrategy;
    private readonly Mock<ILogger<ManualConfirmCommandHandler>> _loggerMock;

    private readonly List<Donation> _donations = new();
    private readonly List<(int DonationId, string From, string To)> _transitionCalls = new();
    private readonly List<(int CampaignId, decimal Amount)> _campaignIncrementCalls = new();
    private readonly List<(int CauseId, decimal Delta)> _causeDeltaCalls = new();

    public ManualConfirmCommandHandlerTests()
    {
        _contextMock = new Mock<IApplicationDbContext>();
        _cacheServiceMock = new Mock<ICacheService>();
        _atomicUpdaterMock = new Mock<IAtomicCampaignUpdater>();
        _dbTransactionFactoryMock = new Mock<IDbTransactionFactory>();
        _executionStrategy = new TestDbExecutionStrategy();
        _loggerMock = new Mock<ILogger<ManualConfirmCommandHandler>>();

        var mockDonationSet = new Mock<DbSet<Donation>>();
        mockDonationSet.Setup(s => s.FindAsync(It.IsAny<object[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((object[] ids, CancellationToken _) =>
                _donations.FirstOrDefault(d => d.DonationId == Convert.ToInt32(ids[0])));
        _contextMock.Setup(c => c.Donations).Returns(mockDonationSet.Object);
        _contextMock.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        // Phase 1: IDbTransactionFactory returns an IAppTransactionScope.
        _dbTransactionFactoryMock
            .Setup(f => f.BeginTransactionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new TestAppTransactionScope());

        // TryTransitionDonationStatusAsync — simulate "the donation row was in the expected
        // state, so the SQL UPDATE affected 1 row" (i.e. transition won). Tests that need
        // the opposite (transition lost) override this setup.
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

    private ManualConfirmCommandHandler MakeHandler() => new(
        _contextMock.Object,
        _cacheServiceMock.Object,
        _atomicUpdaterMock.Object,
        _dbTransactionFactoryMock.Object,
        _executionStrategy,
        _loggerMock.Object);

    // ====================================================================
    // Test 2: First confirmation (Pending → Completed) increments aggregates
    // ====================================================================

    [Fact]
    public async Task Handle_PendingDonation_IncrementsCampaignAndCauseAggregatesOnce()
    {
        _donations.Add(new Donation
        {
            DonationId = 1,
            CauseId = 7,
            CampaignId = 11,
            Amount = 250m,
            PaymentStatus = "Pending"
        });

        var handler = MakeHandler();
        await handler.Handle(new ManualConfirmCommand { DonationId = 1, ConfirmedBy = 99 },
            CancellationToken.None);

        _transitionCalls.Should().ContainSingle().Which.Should().Be((1, "Pending", "Completed"));
        _campaignIncrementCalls.Should().ContainSingle()
            .Which.Should().Be((11, 250m));
        _causeDeltaCalls.Should().ContainSingle()
            .Which.Should().Be((7, 250m));
    }

    // ====================================================================
    // Test 3: Duplicate confirmation (Completed → Completed) does NOT increment
    // (atomic SQL transition returns false because the row is no longer 'Pending')
    // ====================================================================

    [Fact]
    public async Task Handle_AlreadyCompletedDonation_DoesNotIncrementAggregates()
    {
        // TryTransition returns false because the SQL `WHERE payment_status='Pending'`
        // matched 0 rows when the donation is already 'Completed'.
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
            PaymentConfirmedAt = DateTime.UtcNow.AddMinutes(-1)
        });

        var handler = MakeHandler();
        await handler.Handle(new ManualConfirmCommand { DonationId = 2, ConfirmedBy = 99 },
            CancellationToken.None);

        _campaignIncrementCalls.Should().BeEmpty();
        _causeDeltaCalls.Should().BeEmpty();
    }

    // ====================================================================
    // Test 4: Manual confirm after webhook already completed → no double count
    // ====================================================================

    [Fact]
    public async Task Handle_AfterWebhookConfirm_DoesNotDoubleCount()
    {
        _atomicUpdaterMock
            .Setup(u => u.TryTransitionDonationStatusAsync(
                It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _donations.Add(new Donation
        {
            DonationId = 3,
            CauseId = 8,
            CampaignId = 12,
            Amount = 100m,
            PaymentStatus = "Completed",
            PaymentConfirmedAt = DateTime.UtcNow.AddMinutes(-5),
            GatewayTransactionId = "TXN-WEBHOOK"
        });

        var handler = MakeHandler();
        await handler.Handle(new ManualConfirmCommand { DonationId = 3, ConfirmedBy = 99 },
            CancellationToken.None);

        _campaignIncrementCalls.Should().BeEmpty(
            "the aggregates were already incremented when the webhook confirmation fired");
        _causeDeltaCalls.Should().BeEmpty();
    }

    // ====================================================================
    // Test 5: Concurrent aggregate update safety — concurrent confirms of distinct
    // pending donations against the same campaign/cause both contribute via the
    // atomic updater (which performs a database-side UPDATE).
    // ====================================================================

    [Fact]
    public async Task Handle_MultipleConcurrentConfirmations_AllRoutesThroughAtomicUpdater()
    {
        _donations.Add(new Donation
        {
            DonationId = 10,
            CauseId = 7,
            CampaignId = 11,
            Amount = 100m,
            PaymentStatus = "Pending"
        });
        _donations.Add(new Donation
        {
            DonationId = 11,
            CauseId = 7,
            CampaignId = 11,
            Amount = 200m,
            PaymentStatus = "Pending"
        });

        var handler = MakeHandler();

        await Task.WhenAll(
            handler.Handle(new ManualConfirmCommand { DonationId = 10, ConfirmedBy = 99 },
                CancellationToken.None),
            handler.Handle(new ManualConfirmCommand { DonationId = 11, ConfirmedBy = 99 },
                CancellationToken.None));

        _campaignIncrementCalls.Should().HaveCount(2,
            "both donations target the same campaign but each gets its own atomic UPDATE");
        _campaignIncrementCalls.Sum(c => c.Amount).Should().Be(300m);
        _causeDeltaCalls.Should().HaveCount(2);
        _causeDeltaCalls.Sum(c => c.Delta).Should().Be(300m);
    }

    // ====================================================================
    // Test 6: Anonymous donation (UserId = null) still updates aggregates
    // ====================================================================

    [Fact]
    public async Task Handle_AnonymousDonation_StillUpdatesAggregates()
    {
        _donations.Add(new Donation
        {
            DonationId = 20,
            CauseId = 13,
            CampaignId = 14,
            Amount = 50m,
            PaymentStatus = "Pending",
            UserId = null,
            IsAnonymous = true
        });

        var handler = MakeHandler();
        await handler.Handle(new ManualConfirmCommand { DonationId = 20, ConfirmedBy = 99 },
            CancellationToken.None);

        _campaignIncrementCalls.Should().ContainSingle().Which.Should().Be((14, 50m));
        _causeDeltaCalls.Should().ContainSingle().Which.Should().Be((13, 50m));
    }

    // ====================================================================
    // Test 8: Refund semantics — ManualConfirmCommand has no refund code path
    // (refund is webhook-only). Calling ManualConfirm on a Refunded donation
    // hits the domain state machine which forbids Refunded->Completed, so the
    // handler MUST throw and MUST NOT modify aggregates.
    // ====================================================================

    [Fact]
    public async Task Handle_RefundedDonation_ThrowsAndDoesNotModifyAggregates()
    {
        _donations.Add(new Donation
        {
            DonationId = 30,
            CauseId = 9,
            CampaignId = 19,
            Amount = 500m,
            PaymentStatus = "Refunded"
        });

        var handler = MakeHandler();
        var act = async () => await handler.Handle(
            new ManualConfirmCommand { DonationId = 30, ConfirmedBy = 99 },
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>(
            "Refunded -> Completed is not a valid domain transition");
        _campaignIncrementCalls.Should().BeEmpty();
        _causeDeltaCalls.Should().BeEmpty();
    }

    // ====================================================================
    // Phase 1 rollback test: inject a failure AFTER the SQL transition but BEFORE
    // commit, and verify the transaction rolls back (no commit, the throw propagates).
    // The aggregates are NEVER updated when the rollback fires.
    // ====================================================================

    [Fact]
    public async Task Handle_WhenAtomicUpdaterThrows_TransactionRollsBack()
    {
        _donations.Add(new Donation
        {
            DonationId = 50,
            CauseId = 7,
            CampaignId = 11,
            Amount = 250m,
            PaymentStatus = "Pending"
        });

        // Simulate a failure AFTER TryTransition but BEFORE commit (e.g. DB connection
        // drops while writing to the aggregate). The handler must propagate the
        // exception and the transaction must roll back.
        _atomicUpdaterMock
            .Setup(u => u.IncrementRaisedAmountAsync(
                It.IsAny<int>(), It.IsAny<decimal>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Simulated aggregate-write failure"));

        var capturedScopes = new List<TestAppTransactionScope>();
        _dbTransactionFactoryMock
            .Setup(f => f.BeginTransactionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                var scope = new TestAppTransactionScope();
                capturedScopes.Add(scope);
                return scope;
            });

        var handler = MakeHandler();
        var act = async () => await handler.Handle(
            new ManualConfirmCommand { DonationId = 50, ConfirmedBy = 99 },
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();

        capturedScopes.Should().ContainSingle();
        var scope = capturedScopes[0];
        scope.CommitCalls.Should().Be(0, "the failure must prevent commit");
        scope.RollbackCalls.Should().Be(1, "the catch block must roll the transaction back");
        scope.DisposeCalls.Should().BeGreaterThanOrEqualTo(1, "the scope must be disposed");

        // ApplyCauseRaisedAmountDeltaAsync must NOT have been called after the rollback fired.
        _causeDeltaCalls.Should().BeEmpty(
            "after IncrementRaisedAmountAsync throws, the cause UPDATE must be skipped");
    }
}