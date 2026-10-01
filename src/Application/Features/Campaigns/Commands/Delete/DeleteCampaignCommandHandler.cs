using GiveAID.Application.Services;
using MediatR;

namespace GiveAID.Application.Features.Campaigns.Commands.Delete;

/// <summary>
/// Handler for DeleteCampaignCommand.
/// </summary>
public class DeleteCampaignCommandHandler : IRequestHandler<DeleteCampaignCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public DeleteCampaignCommandHandler(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    public async Task<bool> Handle(DeleteCampaignCommand request, CancellationToken cancellationToken)
    {
        var campaign = await _context.Campaigns.FindAsync(new object[] { request.CampaignId }, cancellationToken);

        if (campaign == null)
        {
            throw new InvalidOperationException($"Campaign with ID {request.CampaignId} not found.");
        }

        campaign.IsDeleted = true;
        campaign.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        _cacheService.InvalidateStatistics();

        return true;
    }
}
