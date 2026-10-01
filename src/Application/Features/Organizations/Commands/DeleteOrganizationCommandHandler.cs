using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Services;
using Microsoft.EntityFrameworkCore;

namespace GiveAID.Application.Features.Organizations.Commands;

/// <summary>
/// Handler for <see cref="DeleteOrganizationCommand"/>. Performs a soft
/// delete and flips <c>IsActive</c> to <c>false</c> so the public
/// /our-partners page no longer surfaces this organization.
/// </summary>
public class DeleteOrganizationCommandHandler : IRequestHandler<DeleteOrganizationCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public DeleteOrganizationCommandHandler(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    public async Task<Unit> Handle(DeleteOrganizationCommand request, CancellationToken cancellationToken)
    {
        var entity = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(_context.Organizations, o => o.OrganizationId == request.OrganizationId, cancellationToken);
        if (entity == null)
        {
            throw new KeyNotFoundException($"Organization {request.OrganizationId} not found");
        }

        entity.IsDeleted = true;
        entity.DeletedAt = DateTime.UtcNow;
        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        _cacheService.InvalidateStatistics();

        return Unit.Value;
    }
}
