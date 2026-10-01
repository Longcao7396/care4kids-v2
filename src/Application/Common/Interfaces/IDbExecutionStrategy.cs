namespace GiveAID.Application.Common.Interfaces;

/// <summary>
/// Application-layer abstraction over EF Core's <c>IExecutionStrategy</c>.
/// Wraps the configured retry strategy so that user-initiated transactions can run
/// without throwing <c>InvalidOperationException: The configured execution strategy
/// 'SqlServerRetryingExecutionStrategy' does not support user-initiated transactions</c>.
///
/// Defined in Application so handlers stay EF-agnostic; implemented in Infrastructure.
/// </summary>
public interface IDbExecutionStrategy
{
    /// <summary>
    /// Executes <paramref name="action"/> under the configured retry policy.
    /// </summary>
    Task<TResult> ExecuteAsync<TResult>(
        Func<CancellationToken, Task<TResult>> action,
        CancellationToken cancellationToken = default);
}