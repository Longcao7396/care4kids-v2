using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Features.Donations.Commands.ConfirmWebhook;
using GiveAID.Application.Services;
using GiveAID.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GiveAID.Application.Features.Donations.Commands.ConfirmWebhook;

/// <summary>
/// Handler for ConfirmWebhookCommand.
/// Phase 1 hardening:
/// - The status transition + SaveChangesAsync + aggregate UPDATEs run inside ONE
///   IDbContextTransaction on the scoped DbContext, so SaveChangesAsync and the raw
///   SQL UPDATEs share commit fate.
/// - The transactional block is wrapped in the EF Core retry execution strategy via
///   <see cref="IDbExecutionStrategy"/> (required when EnableRetryOnFailure is on).
/// - Atomic SQL UPDATE is the source of truth for "who wins the race"; aggregates
///   are updated only when 1 row was affected.
/// - Invalid transitions from the webhook (e.g. Pending -> Refunded) bubble up as
///   <see cref="InvalidOperationException"/> from the domain entity and are caught
///   at the outer scope (Step 5) — webhook returns 200 so Stripe does not retry
///   forever.
/// </summary>
public class ConfirmWebhookCommandHandler : IRequestHandler<ConfirmWebhookCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IPaymentGateway _paymentGateway;
    private readonly IEmailSender _emailSender;
    private readonly ICacheService _cacheService;
    private readonly INotificationService _notificationService;
    private readonly IAtomicCampaignUpdater _atomicCampaignUpdater;
    private readonly IDbTransactionFactory _dbTransactionFactory;
    private readonly IDbExecutionStrategy _executionStrategy;
    private readonly ILogger<ConfirmWebhookCommandHandler> _logger;

    public ConfirmWebhookCommandHandler(
        IApplicationDbContext context,
        IPaymentGateway paymentGateway,
        IEmailSender emailSender,
        ICacheService cacheService,
        INotificationService notificationService,
        IAtomicCampaignUpdater atomicCampaignUpdater,
        IDbTransactionFactory dbTransactionFactory,
        IDbExecutionStrategy executionStrategy,
        ILogger<ConfirmWebhookCommandHandler> logger)
    {
        _context = context;
        _paymentGateway = paymentGateway;
        _emailSender = emailSender;
        _cacheService = cacheService;
        _notificationService = notificationService;
        _atomicCampaignUpdater = atomicCampaignUpdater;
        _dbTransactionFactory = dbTransactionFactory;
        _executionStrategy = executionStrategy;
        _logger = logger;
    }

    public Task<bool> Handle(ConfirmWebhookCommand request, CancellationToken cancellationToken)
    {
        // Wrap in retry execution strategy: required when EnableRetryOnFailure is on,
        // otherwise EF throws on the user-initiated transaction.
        return _executionStrategy.ExecuteAsync(async ct =>
        {
            return await HandleInternalAsync(request, ct);
        }, cancellationToken);
    }

    private async Task<bool> HandleInternalAsync(ConfirmWebhookCommand request, CancellationToken cancellationToken)
    {
        // L-04: Verify webhook signature (Stripe validates timestamp + HMAC)
        var verification = await _paymentGateway.VerifyWebhookAsync(request.Payload, request.Signature);

        // L-04: Determine event ID for idempotency
        var eventId = verification.EventId ?? Guid.NewGuid().ToString();

        // L-04: Log the incoming webhook to WebhookLog table
        var webhookLog = new WebhookLog
        {
            Gateway = request.Gateway,
            EventType = verification.EventType ?? "unknown",
            EventId = eventId,
            RawPayload = verification.RawPayload ?? request.Payload,
            Signature = request.Signature,
            SignatureValid = verification.Valid,
            ProcessingStatus = "Processed",
            ReceivedAt = DateTime.UtcNow
        };
        _context.WebhookLogs.Add(webhookLog);

        if (!verification.Valid)
        {
            webhookLog.ProcessingStatus = "Failed";
            webhookLog.ErrorMessage = verification.ErrorMessage ?? "Invalid webhook signature";
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogWarning("Stripe webhook signature invalid: {Error}", verification.ErrorMessage);
            return false;
        }

        // L-04: Idempotency check — have we already processed this event ID?
        var existingLog = await _context.WebhookLogs
            .IgnoreQueryFilters()
            .Where(w => w.EventId == eventId && w.Gateway == request.Gateway && w.ProcessingStatus == "Processed")
            .Where(w => w.WebhookLogId != webhookLog.WebhookLogId) // exclude current
            .AnyAsync(cancellationToken);

        if (existingLog)
        {
            _logger.LogInformation(
                "Stripe webhook duplicate detected (idempotency). EventId={EventId} already processed. Skipping.",
                eventId);
            webhookLog.ProcessingStatus = "Duplicate";
            await _context.SaveChangesAsync(cancellationToken);
            return true; // Return 200 to Stripe — we handled it already
        }

        // L-04: Handle the event based on type
        var eventType = verification.EventType ?? "";
        var transactionId = verification.TransactionId ?? "";

        webhookLog.DonationTransactionId = transactionId;

        // Find the donation by transaction ID
        var donation = _context.Donations.FirstOrDefault(d =>
            d.GatewayTransactionId == transactionId);

        if (donation != null)
        {
            webhookLog.DonationId = donation.DonationId;
        }

        // L-04: Process based on event type
        try
        {
            if (eventType == "payment_intent.succeeded" || eventType == "charge.succeeded")
            {
                if (donation != null)
                {
                    await ProcessSuccessAsync(donation, eventId, cancellationToken);
                }
                else
                {
                    _logger.LogWarning(
                        "Webhook event {EventId} for transaction {TransactionId} — no matching donation found",
                        eventId, transactionId);
                }
            }
            else if (eventType == "payment_intent.payment_failed" || eventType == "charge.failed")
            {
                if (donation != null)
                {
                    await ProcessFailureAsync(donation, eventId, cancellationToken);
                }
            }
            else if (eventType == "charge.refunded")
            {
                if (donation != null)
                {
                    await ProcessRefundAsync(donation, eventId, cancellationToken);
                }
            }
            else
            {
                _logger.LogInformation(
                    "Unhandled Stripe event type: {EventType}. EventId={EventId}",
                    eventType, eventId);
                webhookLog.ProcessingStatus = "Ignored";
            }
        }
        catch (InvalidOperationException domainEx)
        {
            // Step 5: webhook robustness — invalid domain transitions (e.g. someone trying
            // to refund a Pending donation) must NOT cause an HTTP 500. Stripe would retry
            // forever. Log a warning and acknowledge the webhook.
            _logger.LogWarning(domainEx,
                "Webhook rejected due to invalid state transition. EventId={EventId}, EventType={EventType}, DonationId={DonationId}",
                eventId, eventType, donation?.DonationId);
            webhookLog.ProcessingStatus = "Rejected";
            webhookLog.ErrorMessage = domainEx.Message;
        }

        // L-04: Invalidate statistics cache after successful processing
        if (donation != null && (eventType.Contains("succeeded") || eventType.Contains("failed") || eventType.Contains("refunded")))
        {
            _cacheService.InvalidateStatistics();
        }

        webhookLog.ProcessedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    /// <summary>
    /// Handle Pending -> Completed. Atomic transition + aggregate updates in one transaction.
    /// The SaveChangesAsync and the raw SQL UPDATEs all share the same IDbContextTransaction.
    ///
    /// The atomic UPDATE always uses <c>Pending</c> as the source status — that is the only
    /// valid first-time transition. If the donation was already <c>Completed</c> when this
    /// handler ran (e.g. because the manual confirm beat us to it), the atomic UPDATE
    /// affects zero rows and the aggregate stays untouched. This prevents re-confirmation
    /// from double-counting when the same donation is confirmed twice in quick succession.
    /// </summary>
    private async Task ProcessSuccessAsync(Donation donation, string eventId, CancellationToken cancellationToken)
    {
        // Aggregate invariant (audit fix):
        //   campaigns.raised_amount = SUM(amount WHERE status='Completed')
        //   causes.raised_amount    = SUM(amount WHERE status='Completed')
        // The atomic SQL transition is the source of truth for "who wins the race".
        const string expectedFromStatus = "Pending";
        var previousStatus = donation.PaymentStatus;
        donation.MarkAsCompleted(); // domain early guard; sets PaymentConfirmedAt
        bool won = false;

        await using var tx = await _dbTransactionFactory.BeginTransactionAsync(cancellationToken);

        try
        {
            // Use the EXPECTED source status ("Pending") rather than the in-memory
            // previousStatus. The in-memory previousStatus might be "Completed" if
            // another handler committed before we got here, in which case the
            // donation has already been counted — we must NOT increment the
            // aggregate again. The atomic UPDATE with expectedFromStatus="Pending"
            // only matches Pending rows, so re-confirmations return 0 rows and
            // are no-ops.
            won = await _atomicCampaignUpdater.TryTransitionDonationStatusAsync(
                donation.DonationId, expectedFromStatus, "Completed", cancellationToken);

            if (won)
            {
                await _context.SaveChangesAsync(cancellationToken); // persist PaymentConfirmedAt etc.

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
                    "Webhook confirm lost race for DonationId={DonationId} (already in {Status}). Skipping aggregates.",
                    donation.DonationId, previousStatus);
            }

            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }

        // Trigger notification for successful donation (only when the transition actually happened).
        if (won && donation.UserId.HasValue)
        {
            var userId = donation.UserId.Value;
            var campaignName = donation.CampaignId.HasValue
                ? (await _context.Campaigns.FindAsync(new object[] { donation.CampaignId.Value }, cancellationToken))?.CampaignName
                : null;
            var causeName = (await _context.Causes.FindAsync(new object[] { donation.CauseId }, cancellationToken))?.CauseName;

            var title = "Donation Successful";
            var message = campaignName != null
                ? $"Your donation of ${donation.Amount:F2} to {campaignName} has been completed. Thank you!"
                : $"Your donation of ${donation.Amount:F2} to {causeName} has been completed. Thank you!";

            await _notificationService.CreateNotificationAsync(
                userId,
                "donation_completed",
                title,
                message,
                "Donation",
                donation.DonationId,
                cancellationToken);
        }

        _logger.LogInformation(
            "Donation {DonationId} processed via webhook (succeeded). EventId={EventId}, WonTransition={WonTransition}, PreviousStatus={PreviousStatus}",
            donation.DonationId, eventId, won, previousStatus);
    }

    /// <summary>
    /// Handle Pending -> Failed. No aggregate change (Pending donations never contributed).
    /// Uses atomic transition for race safety. Always uses <c>Pending</c> as source status so
    /// that Completed -> Failed (domain-invalid) returns zero rows and is treated as a no-op.
    /// </summary>
    private async Task ProcessFailureAsync(Donation donation, string eventId, CancellationToken cancellationToken)
    {
        const string expectedFromStatus = "Pending";
        var previousStatus = donation.PaymentStatus;
        donation.MarkAsFailed();
        bool won = false;

        await using var tx = await _dbTransactionFactory.BeginTransactionAsync(cancellationToken);

        try
        {
            // Step 5: Pending -> Failed is the only valid "failed" transition. Other
            // transitions (e.g. Completed -> Failed) are domain-invalid; the atomic SQL
            // with expectedFromStatus="Pending" will simply affect 0 rows and we treat it
            // as a no-op.
            won = await _atomicCampaignUpdater.TryTransitionDonationStatusAsync(
                donation.DonationId, expectedFromStatus, "Failed", cancellationToken);

            if (won)
            {
                await _context.SaveChangesAsync(cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }

        _logger.LogInformation(
            "Donation {DonationId} processed via webhook (failed). EventId={EventId}, WonTransition={WonTransition}, PreviousStatus={PreviousStatus}",
            donation.DonationId, eventId, won, previousStatus);
    }

    /// <summary>
    /// Handle Completed -> Refunded. Atomic transition + negative aggregate delta.
    /// Step 5: invalid transitions (e.g. Pending -> Refunded) bubble up as
    /// <see cref="InvalidOperationException"/> from MarkAsRefunded() and are caught at the
    /// outer scope (webhook robustness — return 200 to Stripe, do not 500).
    ///
    /// The atomic UPDATE always uses <c>Completed</c> as the source status. Duplicate refund
    /// webhooks (donation already Refunded) match zero rows and skip the aggregate decrement.
    /// </summary>
    private async Task ProcessRefundAsync(Donation donation, string eventId, CancellationToken cancellationToken)
    {
        const string expectedFromStatus = "Completed";
        var previousStatus = donation.PaymentStatus;
        donation.MarkAsRefunded(); // throws InvalidOperationException on Pending/Failed -> Refunded
        bool won = false;

        await using var tx = await _dbTransactionFactory.BeginTransactionAsync(cancellationToken);

        try
        {
            // Same rationale as ProcessSuccessAsync: pass the EXPECTED source status so
            // duplicate or out-of-order webhooks don't double-decrement the aggregate.
            won = await _atomicCampaignUpdater.TryTransitionDonationStatusAsync(
                donation.DonationId, expectedFromStatus, "Refunded", cancellationToken);

            if (won)
            {
                await _context.SaveChangesAsync(cancellationToken);

                // Known limitation: full donation amount is decremented; the gateway
                // abstraction does not expose the actually-refunded amount, so partial
                // refunds cannot be represented yet (would require extending
                // WebhookVerificationResult with a RefundedAmount field).
                if (donation.CampaignId.HasValue)
                {
                    await _atomicCampaignUpdater.IncrementRaisedAmountAsync(
                        donation.CampaignId.Value, -donation.Amount, cancellationToken);
                }

                await _atomicCampaignUpdater.ApplyCauseRaisedAmountDeltaAsync(
                    donation.CauseId, -donation.Amount, cancellationToken);
            }
            else
            {
                _logger.LogInformation(
                    "Webhook refund lost race for DonationId={DonationId} (already in {Status}). Skipping aggregates.",
                    donation.DonationId, previousStatus);
            }

            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }

        _logger.LogInformation(
            "Donation {DonationId} processed via webhook (refunded). EventId={EventId}, WonTransition={WonTransition}, PreviousStatus={PreviousStatus}",
            donation.DonationId, eventId, won, previousStatus);
    }
}