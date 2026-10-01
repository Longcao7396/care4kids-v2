namespace GiveAID.Application.Common.Interfaces;

/// <summary>
/// Provides atomic database operations that cannot be expressed safely through EF Core
/// change tracking (e.g., incrementing a counter that must not lose updates under
/// concurrent load).
/// </summary>
public interface IAtomicCampaignUpdater
{
    /// <summary>
    /// Atomically transitions <c>donations.payment_status</c> from <paramref name="fromStatus"/>
    /// to <paramref name="toStatus"/>. The single SQL statement
    /// <c>UPDATE donations SET payment_status = @to WHERE donation_id = @id AND payment_status = @from</c>
    /// is the source of truth for "who wins" a concurrent race.
    /// </summary>
    /// <returns>
    /// <c>true</c> iff exactly 1 row was updated (the caller may safely apply side-effects
    /// and update aggregates). <c>false</c> iff the row was already in another state, was deleted,
    /// or another caller won the race. The handler must NOT update aggregates on <c>false</c>.
    /// </returns>
    Task<bool> TryTransitionDonationStatusAsync(
        int donationId,
        string fromStatus,
        string toStatus,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Atomically applies a signed delta to <c>campaigns.raised_amount</c>.
    /// Safe against concurrent donation race conditions.
    /// When a transaction has been started on the same scoped DbContext, this UPDATE
    /// enlists in that transaction automatically.
    /// </summary>
    /// <returns>The number of rows actually updated by the SQL statement (0 or 1).</returns>
    Task<int> IncrementRaisedAmountAsync(
        int campaignId,
        decimal amount,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Atomically applies a signed delta to <c>causes.raised_amount</c>.
    /// Positive delta increments (Pending → Completed), negative delta decrements
    /// (Completed → Refunded). The UPDATE is guarded by
    /// <c>raised_amount + @delta &gt;= 0</c> so the column never goes negative even
    /// under concurrent decrements; if the guard blocks the update, the returned
    /// row count is 0 and the column stays at 0 (the floor).
    /// </summary>
    /// <returns>The number of rows actually updated by the SQL statement (0 or 1).</returns>
    Task<int> ApplyCauseRaisedAmountDeltaAsync(
        int causeId,
        decimal delta,
        CancellationToken cancellationToken = default);
}