using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Features.Causes.Commands;
using GiveAID.Application.Services;

namespace GiveAID.Application.Features.Causes.Commands;

/// <summary>
/// Handler for DeleteCauseCommand.
/// </summary>
public class DeleteCauseCommandHandler : IRequestHandler<DeleteCauseCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public DeleteCauseCommandHandler(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    public async Task Handle(DeleteCauseCommand request, CancellationToken cancellationToken)
    {
        var cause = await _context.Causes.FindAsync(new object[] { request.CauseId }, cancellationToken);
        if (cause == null)
            throw new KeyNotFoundException($"Cause with ID {request.CauseId} not found");

        cause.IsDeleted = true;
        cause.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        _cacheService.InvalidateStatistics();
    }
}
