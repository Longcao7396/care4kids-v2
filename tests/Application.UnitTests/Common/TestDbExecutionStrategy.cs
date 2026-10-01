using GiveAID.Application.Common.Interfaces;

namespace GiveAID.Tests.Unit.Application.Common;

/// <summary>
/// Test double for <see cref="IDbExecutionStrategy"/>. Invokes the action once,
/// optionally throws on a configurable trigger so rollback behavior can be tested.
/// </summary>
public sealed class TestDbExecutionStrategy : IDbExecutionStrategy
{
    public int InvocationCount { get; private set; }

    /// <summary>
    /// If set, throws this exception the next time ExecuteAsync is called (one-shot).
    /// Used to inject a failure AFTER the status transition but BEFORE commit,
    /// to assert that the transaction rolls back everything.
    /// </summary>
    public Func<Task>? InjectFailure { get; set; }

    public async Task<TResult> ExecuteAsync<TResult>(
        Func<CancellationToken, Task<TResult>> action,
        CancellationToken cancellationToken = default)
    {
        InvocationCount++;
        var injected = InjectFailure;
        if (injected != null)
        {
            InjectFailure = null; // one-shot
            await injected();
        }
        return await action(cancellationToken);
    }
}