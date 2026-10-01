using GiveAID.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GiveAID.Infrastructure.Persistence;

/// <summary>
/// Wraps EF Core's <see cref="IExecutionStrategy"/> (configured for retry-on-failure
/// against SQL Server) as the Application-layer abstraction
/// <see cref="IDbExecutionStrategy"/>. Handlers must execute their transactional blocks
/// through this strategy or EF Core will throw on the user-initiated transaction.
/// </summary>
public class EfDbExecutionStrategy : IDbExecutionStrategy
{
    private readonly GiveAIDDbContext _context;

    public EfDbExecutionStrategy(GiveAIDDbContext context)
    {
        _context = context;
    }

    public Task<TResult> ExecuteAsync<TResult>(
        Func<CancellationToken, Task<TResult>> action,
        CancellationToken cancellationToken = default)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return strategy.ExecuteAsync(action, cancellationToken);
    }
}