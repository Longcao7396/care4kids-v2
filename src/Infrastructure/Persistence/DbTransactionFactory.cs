using GiveAID.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace GiveAID.Infrastructure.Persistence;

/// <summary>
/// Wraps EF Core's <see cref="IDbContextTransaction"/> as an
/// <see cref="IAppTransactionScope"/> so callers in the Application layer can
/// control transaction commit/rollback without referencing EF types.
/// </summary>
internal sealed class EfAppTransactionScope : IAppTransactionScope
{
    private readonly IDbContextTransaction _transaction;

    public EfAppTransactionScope(IDbContextTransaction transaction)
    {
        _transaction = transaction;
    }

    public Task CommitAsync(CancellationToken cancellationToken = default)
        => _transaction.CommitAsync(cancellationToken);

    public Task RollbackAsync(CancellationToken cancellationToken = default)
        => _transaction.RollbackAsync(cancellationToken);

    public ValueTask DisposeAsync() => _transaction.DisposeAsync();
}

/// <summary>
/// Creates EF Core transactions on the scoped DbContext.
/// All <c>SaveChangesAsync</c> calls and raw SQL UPDATEs issued through the same
/// DbContext (including those issued by <see cref="AtomicCampaignUpdater"/>) are
/// enlisted in the returned <see cref="IAppTransactionScope"/> automatically.
/// </summary>
public class DbTransactionFactory : IDbTransactionFactory
{
    private readonly GiveAIDDbContext _context;

    public DbTransactionFactory(GiveAIDDbContext context)
    {
        _context = context;
    }

    public async Task<IAppTransactionScope> BeginTransactionAsync(
        CancellationToken cancellationToken = default)
    {
        // BeginTransactionAsync on the DbContext opens the underlying connection if
        // necessary and starts a transaction; the returned IDbContextTransaction is
        // automatically tracked by EF Core, so subsequent SaveChangesAsync + raw SQL
        // on the same DbContext enlist in this transaction.
        var efTransaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        return new EfAppTransactionScope(efTransaction);
    }
}