using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Features.Causes.Commands;
using GiveAID.Application.Services;

namespace GiveAID.Application.Features.Causes.Commands;

/// <summary>
/// Handler for UpdateCauseCommand.
/// </summary>
public class UpdateCauseCommandHandler : IRequestHandler<UpdateCauseCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public UpdateCauseCommandHandler(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    public async Task Handle(UpdateCauseCommand request, CancellationToken cancellationToken)
    {
        var cause = await _context.Causes.FindAsync(new object[] { request.CauseId }, cancellationToken);
        if (cause == null)
            throw new KeyNotFoundException($"Cause with ID {request.CauseId} not found");

        if (!string.IsNullOrEmpty(request.CauseCode)) cause.CauseCode = request.CauseCode;
        if (!string.IsNullOrEmpty(request.CauseName)) cause.CauseName = request.CauseName;
        if (request.Description != null) cause.Description = request.Description;
        if (request.Icon != null) cause.Icon = request.Icon;
        if (request.TargetAmount.HasValue) cause.TargetAmount = request.TargetAmount.Value;
        if (request.ParentCauseId.HasValue) cause.ParentCauseId = request.ParentCauseId;
        if (request.IsActive.HasValue) cause.IsActive = request.IsActive.Value;
        if (request.DisplayOrder.HasValue) cause.DisplayOrder = request.DisplayOrder.Value;

        await _context.SaveChangesAsync(cancellationToken);

        _cacheService.InvalidateStatistics();
    }
}
