using GiveAID.Application.Features.Statistics.DTOs;
using GiveAID.Application.Services;
using Microsoft.EntityFrameworkCore;

namespace GiveAID.Application.Features.Statistics.Queries.GetDashboard;

/// <summary>
/// Handler for GetDashboardStatsQuery.
/// </summary>
public class GetDashboardStatsQueryHandler : IRequestHandler<GetDashboardStatsQuery, DashboardStatsDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public GetDashboardStatsQueryHandler(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    public async Task<DashboardStatsDto> Handle(GetDashboardStatsQuery request, CancellationToken cancellationToken)
    {
        // Bug #2 fix: cache key now versioned so previously cached responses
        // (from before DonationsByMonth existed) are never served stale/incomplete.
        var cacheKey = "dashboard_stats_v2";
        var cached = _cacheService.Get<DashboardStatsDto>(cacheKey);
        if (cached != null)
        {
            return cached;
        }

        var today = DateTime.UtcNow.Date;
        var startOfMonth = new DateTime(today.Year, today.Month, 1);

        var completedDonations = _context.Donations.Where(d => d.PaymentStatus == "Completed");

        var totalRaised = await completedDonations.SumAsync(d => d.Amount, cancellationToken);
        var totalRaisedToday = await completedDonations.Where(d => d.DonationDate >= today).SumAsync(d => d.Amount, cancellationToken);
        var totalRaisedThisMonth = await completedDonations.Where(d => d.DonationDate >= startOfMonth).SumAsync(d => d.Amount, cancellationToken);

        var donationsToday = await completedDonations.CountAsync(d => d.DonationDate >= today, cancellationToken);
        var donationsThisMonth = await completedDonations.CountAsync(d => d.DonationDate >= startOfMonth, cancellationToken);

        var totalDonors = await _context.Donations
            .Where(d => d.PaymentStatus == "Completed" && d.UserId != null)
            .Select(d => d.UserId!.Value)
            .Distinct()
            .CountAsync(cancellationToken);

        var totalCampaigns = await _context.Campaigns.CountAsync(cancellationToken);
        var activeCampaigns = await _context.Campaigns.CountAsync(c => c.Status == "Active", cancellationToken);
        var totalCauses = await _context.Causes.CountAsync(c => c.IsActive, cancellationToken);
        var registeredUsers = await _context.Users.CountAsync(u => u.IsActive, cancellationToken);

        var recentDonations = await completedDonations
            .OrderByDescending(d => d.DonationDate)
            .Take(10)
            .Select(d => new RecentDonationDto
            {
                DonationId = d.DonationId,
                Amount = d.Amount,
                DonorName = d.IsAnonymous ? "Anonymous" : d.User!.FullName,
                CampaignName = d.Campaign!.CampaignName,
                CauseName = d.Cause!.CauseName,
                DonationDate = d.DonationDate,
                IsAnonymous = d.IsAnonymous
            })
            .ToListAsync(cancellationToken);

        // Bug #2 fix: aggregate donations by month via SQL GROUP BY (no in-memory
        // load of all rows). Covers the last 6 months, oldest to newest.
        var sixMonthsAgoStart = new DateTime(startOfMonth.Year, startOfMonth.Month, 1).AddMonths(-5);
        var monthlyGroups = await completedDonations
            .Where(d => d.DonationDate >= sixMonthsAgoStart)
            .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
            .Select(g => new MonthlyDonationDto
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                Total = g.Sum(d => d.Amount),
                Count = g.Count()
            })
            .ToListAsync(cancellationToken);

        // Fill in any months with zero donations so the chart always shows 6 points.
        var donationsByMonth = new List<MonthlyDonationDto>();
        for (var i = 5; i >= 0; i--)
        {
            var monthDate = startOfMonth.AddMonths(-i);
            var match = monthlyGroups.FirstOrDefault(m => m.Year == monthDate.Year && m.Month == monthDate.Month);
            donationsByMonth.Add(match ?? new MonthlyDonationDto
            {
                Year = monthDate.Year,
                Month = monthDate.Month,
                Total = 0,
                Count = 0
            });
        }

        // ── Step 1: recentUsers ──────────────────────────────────────────────
        // Global query filter on User is already active (HasQueryFilter u => !u.IsDeleted)
        // so soft-deleted users are excluded automatically. Take 10 most-recently created.
        var recentUsers = await _context.Users
            .OrderByDescending(u => u.CreatedAt)
            .Take(10)
            .Select(u => new RecentUserDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Email = u.Email,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync(cancellationToken);

        // ── Step 2: donationsByCampaign ────────────────────────────────────────
        // Aggregate completed donations that have a CampaignId, GROUP BY CampaignId.
        // Reuse the existing completedDonations IQueryable.
        // For donor count: count distinct UserId values; use default-if-null so NULL
        // user_ids (anonymous donations) don't collapse all anonymous donors into one row.
        var donationsByCampaign = await completedDonations
            .Where(d => d.CampaignId != null)
            .GroupBy(d => new { d.CampaignId, d.Campaign!.CampaignName, d.Campaign.GoalAmount, d.Campaign.RaisedAmount, CauseName = d.Campaign.Cause!.CauseName })
            .OrderByDescending(g => g.Sum(d => d.Amount))
            .Take(10)
            .Select(g => new CampaignStatsDto
            {
                CampaignId = g.Key.CampaignId!.Value,
                CampaignName = g.Key.CampaignName,
                CauseName = g.Key.CauseName,
                DonorCount = g.Where(d => d.UserId != null).Select(d => d.UserId!.Value).Distinct().Count(),
                RaisedAmount = g.Sum(d => d.Amount),
                GoalAmount = g.Key.GoalAmount,
                PercentageReached = g.Key.GoalAmount > 0
                    ? Math.Min(Math.Round(g.Sum(d => d.Amount) * 100m / g.Key.GoalAmount, 2), 100m)
                    : 0m
            })
            .ToListAsync(cancellationToken);

        // ── Step 3: donationsByCause ──────────────────────────────────────────
        // Donation.CauseId is non-nullable — direct path, no need to go via Campaign.
        // Only include causes that have at least one completed donation.
        // Compute: raisedAmount (sum of completed donations), donationCount, targetAmount.
        var donationsByCause = await completedDonations
            .GroupBy(d => new { d.CauseId, d.Cause!.CauseName, d.Cause.CauseCode, d.Cause.TargetAmount })
            .OrderByDescending(g => g.Sum(d => d.Amount))
            .Take(10)
            .Select(g => new DashboardCauseStatsDto
            {
                CauseId = g.Key.CauseId,
                CauseName = g.Key.CauseName,
                CauseCode = g.Key.CauseCode,
                RaisedAmount = g.Sum(d => d.Amount),
                TargetAmount = g.Key.TargetAmount,
                DonationCount = g.Count()
            })
            .ToListAsync(cancellationToken);

        var stats = new DashboardStatsDto
        {
            TotalDonations = totalRaised,
            TotalDonors = totalDonors,
            TotalCampaigns = totalCampaigns,
            ActiveCampaigns = activeCampaigns,
            TotalCauses = totalCauses,
            RegisteredUsers = registeredUsers,
            TotalRaisedThisMonth = totalRaisedThisMonth,
            TotalRaisedToday = totalRaisedToday,
            DonationsToday = donationsToday,
            DonationsThisMonth = donationsThisMonth,
            RecentDonations = recentDonations,
            DonationsByMonth = donationsByMonth,
            RecentUsers = recentUsers,
            DonationsByCampaign = donationsByCampaign,
            DonationsByCause = donationsByCause
        };

        _cacheService.Set(cacheKey, stats, TimeSpan.FromMinutes(5));

        return stats;
    }
}
