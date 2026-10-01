using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Features.Donations.Commands.ManualConfirm;
using GiveAID.Application.Services;
using Microsoft.Extensions.Logging;

namespace GiveAID.Application.Features.Donations.Commands.ManualConfirm;

/// <summary>
/// Handler for ManualConfirmCommand.
/// Phase 1 hardening:
/// - The entire block (load donation → SaveChangesAsync → atomic SQL transition →
///   aggregate UPDATEs → commit) runs under the EF Core retry execution strategy
///   (<see cref="IDbExecutionStrategy"/>) and a single IDbContextTransaction.
/// - Atomic SQL UPDATE is the source of truth for the race winner; aggregates are
///   updated only when 1 row was affected.
/// - SaveChangesAsync and the raw SQL UPDATEs share the same transaction because
///   they all run through the same scoped DbContext.
/// </summary>
public class ManualConfirmCommandHandler : IRequestHandler<ManualConfirmCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;
    private readonly IAtomicCampaignUpdater _atomicCampaignUpdater;
    private readonly IDbTransactionFactory _dbTransactionFactory;
    private readonly IDbExecutionStrategy _executionStrategy;
    private readonly ILogger<ManualConfirmCommandHandler> _logger;

    public ManualConfirmCommandHandler(
        IApplicationDbContext context,
        ICacheService cacheService,
        IAtomicCampaignUpdater atomicCampaignUpdater,
        IDbTransactionFactory dbTransactionFactory,
        IDbExecutionStrategy executionStrategy,
        ILogger<ManualConfirmCommandHandler> logger)
    {
        _context = context;
        _cacheService = cacheService;
        _atomicCampaignUpdater = atomicCampaignUpdater;
        _dbTransactionFactory = dbTransactionFactory;
        _executionStrategy = executionStrategy;
        _logger = logger;
    }

    public Task<bool> Handle(ManualConfirmCommand request, CancellationToken cancellationToken)
    {
        // Wrap the entire transactional block in the configured retry execution strategy
        // (required when EnableRetryOnFailure is on; otherwise EF throws on user-initiated tx).
        return _executionStrategy.ExecuteAsync(async ct =>
        {
            return await HandleInternalAsync(request, ct);
        }, cancellationToken);
    }

    private async Task<bool> HandleInternalAsync(ManualConfirmCommand request, CancellationToken cancellationToken)
    {
        var donation = await _context.Donations.FindAsync(
            new object[] { request.DonationId }, cancellationToken);

        if (donation == null)
        {
            throw new InvalidOperationException($"Donation with ID {request.DonationId} not found.");
        }

        // Domain early guard: MarkAsCompleted() throws on invalid transitions
        // (Refunded -> Completed, Failed -> Completed). This is best-effort fail-fast;
        // the atomic SQL transition below is the actual race winner.
        //
        // expectedFromStatus is the source state of the FIRST-TIME Pending->Completed
        // transition that actually contributes to the aggregates. If another handler
        // (e.g. a webhook) already won the race and committed before us, the atomic
        // UPDATE will affect 0 rows and we skip the aggregate increment. This is the
        // single fix that prevents the "race produces double-increment" symptom
        // observed in the WebhookAndManualConfirm_Racing_AggregateIncrementsOnce test
        // where the webhook re-confirmed an already-completed donation.
        const string expectedFromStatus = "Pending";
        var previousStatus = donation.PaymentStatus;
        donation.MarkAsCompleted();
        bool won = false;

        await using var tx = await _dbTransactionFactory.BeginTransactionAsync(cancellationToken);

        try
        {
            // Atomic SQL transition: who wins the race. Always uses "Pending" as the
            // source status — re-confirmations (in-memory status is "Completed") match
            // zero rows and skip the aggregate increment.
            won = await _atomicCampaignUpdater.TryTransitionDonationStatusAsync(
                donation.DonationId, expectedFromStatus, "Completed", cancellationToken);

            if (won)
            {
                // Persist side-effects set by MarkAsCompleted (PaymentConfirmedAt, etc.).
                // SaveChangesAsync runs on the same scoped DbContext, so EF auto-enlists
                // in the active transaction → one atomic commit with the SQL UPDATE below.
                await _context.SaveChangesAsync(cancellationToken);

                // Atomic aggregate updates in the same transaction.
                if (donation.CampaignId.HasValue)
                {
                    await _atomicCampaignUpdater.IncrementRaisedAmountAsync(
                        donation.CampaignId.Value, donation.Amount, cancellationToken);
                }

                await _atomicCampaignUpdater.ApplyCauseRaisedAmountDeltaAsync(
                    donation.CauseId, donation.Amount, cancellationToken);
            }
            else
            {
                _logger.LogInformation(
                    "Manual confirm lost race for DonationId={DonationId} (already in {Status}). Skipping aggregates.",
                    donation.DonationId, previousStatus);
            }

            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }

        // Invalidate statistics cache only when an actual transition occurred.
        if (won)
        {
            _cacheService.InvalidateStatistics();
        }

        return true;
    }
}