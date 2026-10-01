using GiveAID.Application.Features.Statistics.DTOs;
using GiveAID.Application.Services;
using Microsoft.EntityFrameworkCore;

namespace GiveAID.Application.Features.Statistics.Queries.GetOverview;

/// <summary>
/// Handler for GetOverviewStatsQuery.
/// </summary>
public class GetOverviewStatsQueryHandler : IRequestHandler<GetOverviewStatsQuery, OverviewStatsDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public GetOverviewStatsQueryHandler(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    public async Task<OverviewStatsDto> Handle(GetOverviewStatsQuery request, CancellationToken cancellationToken)
    {
        var cacheKey = "overview_stats";
        var cached = _cacheService.Get<OverviewStatsDto>(cacheKey);
        if (cached != null)
        {
            return cached;
        }

        var completedDonations = _context.Donations.Where(d => d.PaymentStatus == "Completed");

        var totalRaised = await completedDonations.SumAsync(d => d.Amount, cancellationToken);
        var totalDonations = await completedDonations.CountAsync(cancellationToken);
        var averageDonation = totalDonations > 0 ? totalRaised / totalDonations : 0;

        // Anonymous donations (UserId == null) must NOT count as registered donors.
        var totalDonors = await completedDonations
            .Where(d => d.UserId != null)
            .Select(d => d.UserId!.Value)
            .Distinct()
            .CountAsync(cancellationToken);
        var totalCampaigns = await _context.Campaigns.CountAsync(cancellationToken);
        var activeCampaigns = await _context.Campaigns.CountAsync(c => c.Status == "Active", cancellationToken);
        var totalBeneficiaries = await _context.Campaigns.SumAsync(c => c.BeneficiariesCount ?? 0, cancellationToken);

        var stats = new OverviewStatsDto
        {
            TotalRaised = totalRaised,
            TotalDonors = totalDonors,
            TotalCampaigns = totalCampaigns,
            ActiveCampaigns = activeCampaigns,
            TotalBeneficiaries = totalBeneficiaries,
            AverageDonation = averageDonation
        };

        _cacheService.Set(cacheKey, stats, TimeSpan.FromMinutes(10));

        return stats;
    }
}
