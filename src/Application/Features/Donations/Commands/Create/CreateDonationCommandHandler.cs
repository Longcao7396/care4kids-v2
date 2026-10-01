using System.Data.Common;
using FluentValidation;
using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Features.Donations.DTOs;
using GiveAID.Application.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GiveAID.Application.Features.Donations.Commands.Create;

/// <summary>
/// Handler for CreateDonationCommand.
/// SECURITY (C-05): UserId comes ONLY from the authenticated JWT token via the controller.
/// - Authenticated user: UserId from JWT claims (stored as valid int)
/// - Anonymous user: UserId is null (no authenticated user)
/// The controller has already resolved the UserId - we trust it completely here.
/// </summary>
/// <remarks>
/// M-13 Idempotency Redesign:
/// - Client MUST provide IdempotencyKey for retry safety (recommended)
/// - If no key provided, server generates a new Guid (no deduplication)
/// - Server only deduplicates when SAME IdempotencyKey is sent twice
/// - SAME donation details (email + campaign + amount) can be made multiple times
/// - GetHashCode() is NEVER used for idempotency (non-stable across processes)
/// </remarks>
public class CreateDonationCommandHandler : IRequestHandler<CreateDonationCommand, DonationDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPaymentGateway _paymentGateway;
    // M-02 NOTE: Validator is no longer used in handler - ValidationBehavior handles it
    // Keeping field for backward compatibility with unit tests
    private readonly IValidator<CreateDonationCommand> _validator;
    private readonly IDbTransactionFactory _dbTransactionFactory;
    private readonly IDbExecutionStrategy _executionStrategy;
    private readonly ILogger<CreateDonationCommandHandler> _logger;

    public CreateDonationCommandHandler(
        IApplicationDbContext context,
        IPaymentGateway paymentGateway,
        IValidator<CreateDonationCommand> validator,
        IDbTransactionFactory dbTransactionFactory,
        IDbExecutionStrategy executionStrategy,
        ILogger<CreateDonationCommandHandler> logger)
    {
        _context = context;
        _paymentGateway = paymentGateway;
        _validator = validator; // Kept for unit test compatibility
        _dbTransactionFactory = dbTransactionFactory;
        _executionStrategy = executionStrategy;
        _logger = logger;
    }

    public Task<DonationDto> Handle(CreateDonationCommand request, CancellationToken cancellationToken)
    {
        // Phase 1: Wrap the transactional block in the retry execution strategy
        // (required because EnableRetryOnFailure is on, otherwise EF throws on the
        // user-initiated transaction).
        return _executionStrategy.ExecuteAsync(async ct =>
        {
            return await HandleInternalAsync(request, ct);
        }, cancellationToken);
    }

    private async Task<DonationDto> HandleInternalAsync(CreateDonationCommand request, CancellationToken cancellationToken)
    {
        // M-02 FIX: ValidationBehavior now handles this automatically in the pipeline
        // Removed manual validator.ValidateAsync() call to avoid double validation

        // ── Cause validation ────────────────────────────────────────────
        // The Cause table's IsActive flag is the SINGLE SOURCE OF TRUTH for
        // which causes may receive donations. We do NOT maintain a hard-coded
        // whitelist of cause codes here — admins can promote / demote any
        // cause by toggling IsActive, and that change must immediately take
        // effect at this layer too. The Donation page UI already hides
        // inactive causes from the public dropdown, but this guard enforces
        // the same business rule independently on the server so that:
        //   * direct API consumers (mobile apps, scripts, internal tools)
        //     cannot bypass the UI filter,
        //   * historical donations referencing a cause that has since been
        //     deactivated remain untouched (only NEW donations are rejected).
        //
        // The Cause global query filter excludes soft-deleted rows
        // (`!c.IsDeleted`) — so a soft-deleted cause returns null here,
        // which is treated the same as "not found".
        var cause = await _context.Causes
            .FindAsync(new object[] { request.CauseId }, cancellationToken);
        if (cause == null)
        {
            throw new ValidationException(
                $"Cause with ID {request.CauseId} was not found.");
        }
        if (!cause.IsActive)
        {
            throw new ValidationException(
                $"Cause with ID {request.CauseId} is not currently accepting donations.");
        }

        // L-05: Check if campaign exists and is not expired (if donating to a campaign)
        if (request.CampaignId.HasValue)
        {
            var campaign = await _context.Campaigns.FindAsync(new object[] { request.CampaignId.Value }, cancellationToken);
            if (campaign == null)
            {
                throw new ValidationException("Campaign not found.");
            }
            // L-05: Reject donations to expired campaigns
            if (campaign.EndDate.HasValue && campaign.EndDate.Value < DateTime.UtcNow)
            {
                throw new ValidationException("This campaign has expired and is no longer accepting donations.");
            }
        // L-05: Reject donations if campaign is not Active
        // Only "Active" campaigns should accept donations
        var validCampaignStatuses = new[] { "Active" };
        if (campaign.Status != null && !validCampaignStatuses.Contains(campaign.Status))
        {
            throw new ValidationException($"This campaign is not currently accepting donations (Status: {campaign.Status}). Only active campaigns accept donations.");
        }
        }

        // UserId has already been resolved by the controller from JWT claims.
        // - Authenticated: UserId is the authenticated user's ID
        // - Anonymous: UserId is null
        // We use it directly without further validation (controller is the source of truth).
        int? userId = request.UserId;

        // M-13 Idempotency Redesign:
        // ============================================================
        // Idempotency is CLIENT RESPONSIBILITY. The client MUST provide
        // an IdempotencyKey (GUID) to prevent duplicate donations from
        // network retries or double-clicks.
        //
        // BEHAVIOR:
        // - Client provides IdempotencyKey → check for existing, return if found
        // - No IdempotencyKey provided → server generates NEW Guid, NO deduplication
        //   (allows same donor to donate twice the same amount - legitimate)
        //
        // IMPORTANT: We NO LONGER use fingerprint-based deduplication.
        // GetHashCode() is NOT stable across processes/framework versions.
        // Same email + campaign + amount = ALLOWED (different donations).
        // ============================================================

        string? idempotencyKey = request.IdempotencyKey;

        if (!string.IsNullOrEmpty(idempotencyKey))
        {
            // M-13: Client provided IdempotencyKey - check for existing donation
            // For authenticated users: check by UserId + IdempotencyKey
            // For anonymous (no user): check by IdempotencyKey only
            Domain.Entities.Donation? existing;
            
            if (userId.HasValue)
            {
                existing = await _context.Donations
                    .FirstOrDefaultAsync(d => 
                        d.UserId == userId.Value && 
                        d.IdempotencyKey == idempotencyKey, 
                        cancellationToken);
            }
            else
            {
                // Anonymous donation - key must be globally unique (no user context)
                existing = await _context.Donations
                    .FirstOrDefaultAsync(d => d.IdempotencyKey == idempotencyKey, 
                        cancellationToken);
            }

            if (existing != null)
            {
                // M-13: Duplicate detected - return existing (idempotent response)
                _logger.LogInformation(
                    "M-13 Idempotency: Duplicate donation detected. Key={IdempotencyKey}, " +
                    "ExistingDonationId={DonationId}, UserId={UserId}, IsAnonymous={IsAnonymous}",
                    idempotencyKey, existing.DonationId, userId, !userId.HasValue);
                    
                return MapToDto(existing);
            }
            
            _logger.LogInformation(
                "M-13 Idempotency: New donation with client-provided key. Key={IdempotencyKey}, " +
                "UserId={UserId}, IsAnonymous={IsAnonymous}",
                idempotencyKey, userId, !userId.HasValue);
        }
        else
        {
            // M-13: No IdempotencyKey provided - generate server-side Guid
            // NO deduplication - allows same person to donate twice same amount
            idempotencyKey = Guid.NewGuid().ToString();
            
            _logger.LogInformation(
                "M-13 Idempotency: No client key provided, generated server key. " +
                "GeneratedKey={GeneratedKey}, UserId={UserId}, IsAnonymous={IsAnonymous}",
                idempotencyKey, userId, !userId.HasValue);
        }

        var donation = new Domain.Entities.Donation
        {
            // UserId is already resolved: authenticated user's ID or null for anonymous
            UserId = userId,
            CauseId = request.CauseId,
            CampaignId = request.CampaignId,
            OrganizationId = request.OrganizationId,
            Amount = request.Amount,
            PaymentMethod = request.PaymentMethod,
            PaymentStatus = "Pending",
            Message = request.Message,
            IsAnonymous = request.IsAnonymous,
            // M-13: Use the idempotency key (client-provided or generated fingerprint)
            IdempotencyKey = idempotencyKey,
            DonationDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        // Create payment intent if using Stripe
        if (request.PaymentMethod == "stripe")
        {
            var amountInCents = (long)(request.Amount * 100);
            var result = await _paymentGateway.CreatePaymentIntentAsync(
                amountInCents,
                "usd",
                0, // Will update after save
                request.Email ?? "");

            if (result.Success)
            {
                donation.TransactionId = result.TransactionId;
                donation.GatewayTransactionId = result.TransactionId;
            }
        }

        // C-04.2: Both donation insert AND campaign RaisedAmount update MUST be in the same
        // transaction so that either both commit or both rollback.
        // C-04.1: Campaign RaisedAmount is updated with atomic SQL to prevent lost updates
        //         under concurrent load.
        // Use IDbTransactionFactory (defined in Application, implemented in Infrastructure) to start
        // a transaction on the same scoped DbContext. Phase 1: this is now
        // Database.BeginTransactionAsync() so SaveChangesAsync and any raw SQL UPDATEs share the
        // same transaction automatically (EF auto-enlistment).
        //
        // Aggregate invariant (audit fix):
        //   campaigns.raised_amount  = SUM(amount WHERE status='Completed')
        //   causes.raised_amount     = SUM(amount WHERE status='Completed')
        // Because the invariant counts ONLY Completed donations, a Pending donation must NOT
        // contribute to the aggregates. Incrementing at creation time was double-counting once
        // the webhook/manual confirm later incremented again on the Pending->Completed transition.
        // The aggregates are now updated exclusively on a genuine Pending->Completed transition
        // (in ConfirmWebhookCommandHandler / ManualConfirmCommandHandler).
        await using var tx = await _dbTransactionFactory.BeginTransactionAsync(cancellationToken);

        try
        {
            _context.Donations.Add(donation);
            await _context.SaveChangesAsync(cancellationToken);

            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }

        return MapToDto(donation);
    }

    private DonationDto MapToDto(Domain.Entities.Donation donation)
    {
        return new DonationDto
        {
            DonationId = donation.DonationId,
            UserId = donation.UserId,
            CauseId = donation.CauseId,
            CampaignId = donation.CampaignId,
            OrganizationId = donation.OrganizationId,
            Amount = donation.Amount,
            PaymentMethod = donation.PaymentMethod,
            PaymentStatus = donation.PaymentStatus,
            CardLastFour = donation.CardLastFour,
            CardType = donation.CardType,
            TransactionId = donation.TransactionId,
            Message = donation.Message,
            IsAnonymous = donation.IsAnonymous,
            ReceiptSent = donation.ReceiptSent,
            DonationDate = donation.DonationDate,
            CreatedAt = donation.CreatedAt
        };
    }
}
