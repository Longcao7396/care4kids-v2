using System.Runtime.CompilerServices;
using GiveAID.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GiveAID.Infrastructure.Persistence;

/// <summary>
/// Provides atomic database operations that cannot be safely expressed through EF Core
/// change tracking due to race conditions (e.g., read-modify-write on campaign RaisedAmount,
/// or concurrent donation status transitions).
/// Uses raw SQL against the scoped <see cref="GiveAIDDbContext"/>, which means every
/// UPDATE automatically enlists in the active <c>IDbContextTransaction</c> started by
/// <see cref="DbTransactionFactory"/>. Combined with <c>SaveChangesAsync</c> on the same
/// scoped context, the entire donation-state-transition-plus-aggregate-update block
/// commits or rolls back as one transaction.
/// </summary>
public class AtomicCampaignUpdater : IAtomicCampaignUpdater
{
    private readonly GiveAIDDbContext _context;
    private readonly ILogger<AtomicCampaignUpdater> _logger;

    public AtomicCampaignUpdater(GiveAIDDbContext context, ILogger<AtomicCampaignUpdater> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <inheritdoc/>
    /// SQL: UPDATE donations SET payment_status = @to WHERE donation_id = @id AND payment_status = @from
    /// The row count returned by the database is the source of truth for "who won the race".
    public Task<bool> TryTransitionDonationStatusAsync(
        int donationId,
        string fromStatus,
        string toStatus,
        CancellationToken cancellationToken = default)
    {
        // FormattableStringFactory.Create turns (string, args[]) into a FormattableString
        // so that Database.ExecuteSqlInterpolatedAsync parameterizes it correctly.
        var sql = FormattableStringFactory.Create(
            "UPDATE donations SET payment_status = {0} " +
            "WHERE donation_id = {1} AND payment_status = {2}",
            toStatus, donationId, fromStatus);
        return ExecuteTransitionAsync(sql, cancellationToken);
    }

    private async Task<bool> ExecuteTransitionAsync(FormattableString sql, CancellationToken cancellationToken)
    {
        var rowsAffected = await _context.Database.ExecuteSqlInterpolatedAsync(sql, cancellationToken);
        _logger.LogInformation(
            "AtomicCampaignUpdater.TryTransitionDonationStatusAsync SQL={Sql} RowsAffected={Rows}",
            sql.Format, rowsAffected);
        return rowsAffected == 1;
    }

    /// <inheritdoc/>
    /// C-04.1 FIX: atomic SQL UPDATE. The scoped DbContext's connection is reused; EF
    /// auto-enlists in the active IDbContextTransaction, so this UPDATE shares commit
    /// fate with SaveChangesAsync on the same context.
    public async Task<int> IncrementRaisedAmountAsync(
        int campaignId,
        decimal amount,
        CancellationToken cancellationToken = default)
    {
        var sql = FormattableStringFactory.Create(
            "UPDATE campaigns SET raised_amount = raised_amount + {0} " +
            "WHERE campaign_id = {1}",
            amount, campaignId);
        var rowsAffected = await _context.Database.ExecuteSqlInterpolatedAsync(sql, cancellationToken);

        if (rowsAffected == 0)
        {
            _logger.LogWarning(
                "AtomicCampaignUpdater.IncrementRaisedAmountAsync affected 0 rows. CampaignId={CampaignId}, Delta={Delta}",
                campaignId, amount);
        }

        return rowsAffected;
    }

    /// <inheritdoc/>
    /// Floor-guard clause <c>raised_amount + @delta &gt;= 0</c> prevents the column from
    /// going negative under concurrent decrements. If the guard blocks the update, 0 rows
    /// are affected and the column stays at its current value (the floor).
    public async Task<int> ApplyCauseRaisedAmountDeltaAsync(
        int causeId,
        decimal delta,
        CancellationToken cancellationToken = default)
    {
        var sql = FormattableStringFactory.Create(
            "UPDATE causes SET raised_amount = raised_amount + {0} " +
            "WHERE cause_id = {1} AND raised_amount + {0} >= 0",
            delta, causeId);
        var rowsAffected = await _context.Database.ExecuteSqlInterpolatedAsync(sql, cancellationToken);

        if (rowsAffected == 0)
        {
            _logger.LogWarning(
                "AtomicCampaignUpdater.ApplyCauseRaisedAmountDeltaAsync affected 0 rows. CauseId={CauseId}, Delta={Delta}",
                causeId, delta);
        }

        return rowsAffected;
    }
}