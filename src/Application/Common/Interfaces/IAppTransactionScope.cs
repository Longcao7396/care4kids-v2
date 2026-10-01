namespace GiveAID.Application.Common.Interfaces;

/// <summary>
/// Application-layer abstraction over a database transaction scope.
/// Hides EF Core types so handlers stay EF-agnostic.
/// Created via <see cref="IDbTransactionFactory.BeginTransactionAsync"/>.
/// </summary>
public interface IAppTransactionScope : IAsyncDisposable
{
    /// <summary>
    /// Commits the transaction. After this call, the scope is disposed and any further
    /// use is undefined.
    /// </summary>
    Task CommitAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Rolls the transaction back. After this call, the scope is disposed.
    /// </summary>
    Task RollbackAsync(CancellationToken cancellationToken = default);
}