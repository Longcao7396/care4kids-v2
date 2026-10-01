using GiveAID.Application.Common.Interfaces;

namespace GiveAID.Tests.Unit.Application.Common;

/// <summary>
/// Test double for <see cref="IAppTransactionScope"/>. Records calls and no-ops
/// Commit / Rollback. The ExecutionStrategy test double can use this directly.
/// </summary>
public sealed class TestAppTransactionScope : IAppTransactionScope
{
    public int CommitCalls { get; private set; }
    public int RollbackCalls { get; private set; }
    public int DisposeCalls { get; private set; }

    public Task CommitAsync(CancellationToken cancellationToken = default)
    {
        CommitCalls++;
        return Task.CompletedTask;
    }

    public Task RollbackAsync(CancellationToken cancellationToken = default)
    {
        RollbackCalls++;
        return Task.CompletedTask;
    }

    public ValueTask DisposeAsync()
    {
        DisposeCalls++;
        return ValueTask.CompletedTask;
    }
}