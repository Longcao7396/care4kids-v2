namespace GiveAID.Application.Common.Interfaces;

/// <summary>
/// Application-layer abstraction over the EF Core DbContext transaction.
/// Use <see cref="IDbExecutionStrategy.ExecuteAsync"/> to wrap the entire transactional
/// block — user-initiated transactions are not allowed outside an execution strategy
/// when retry-on-failure is enabled (SQL Server).
/// </summary>
public interface IDbTransactionFactory
{
    /// <summary>
    /// Starts a new transaction on the scoped DbContext's underlying connection.
    /// All subsequent <c>SaveChangesAsync</c> calls and raw SQL UPDATEs issued through
    /// the same DbContext are enlisted in this transaction automatically.
    /// </summary>
    Task<IAppTransactionScope> BeginTransactionAsync(CancellationToken cancellationToken = default);
}