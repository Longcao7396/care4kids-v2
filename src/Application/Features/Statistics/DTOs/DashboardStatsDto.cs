namespace GiveAID.Application.Features.Statistics.DTOs;

/// <summary>
/// DTO for dashboard statistics.
/// </summary>
public class DashboardStatsDto
{
    public decimal TotalDonations { get; set; }
    public int TotalDonors { get; set; }
    public int TotalCampaigns { get; set; }
    public int ActiveCampaigns { get; set; }
    public int TotalCauses { get; set; }
    public int RegisteredUsers { get; set; }
    public decimal TotalRaisedThisMonth { get; set; }
    public decimal TotalRaisedToday { get; set; }
    public int DonationsToday { get; set; }
    public int DonationsThisMonth { get; set; }
    public List<RecentDonationDto> RecentDonations { get; set; } = new();

    /// <summary>
    /// Bug #2 fix: monthly donation totals for the trend chart (oldest to newest).
    /// </summary>
    public List<MonthlyDonationDto> DonationsByMonth { get; set; } = new();

    /// <summary>
    /// Recently registered users for the admin dashboard panel.
    /// </summary>
    public List<RecentUserDto> RecentUsers { get; set; } = new();

    /// <summary>
    /// Top campaigns by raised amount for the admin dashboard panel.
    /// </summary>
    public List<CampaignStatsDto> DonationsByCampaign { get; set; } = new();

    /// <summary>
    /// Causes with at least one completed donation, for the admin dashboard panel.
    /// </summary>
    public List<DashboardCauseStatsDto> DonationsByCause { get; set; } = new();
}

/// <summary>
/// Aggregated donation total/count for a single calendar month.
/// </summary>
public class MonthlyDonationDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Total { get; set; }
    public int Count { get; set; }
}

/// <summary>
/// A recently registered user for the admin dashboard recent-users panel.
/// </summary>
public class RecentUserDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Campaign-level donation statistics for the admin dashboard top-campaigns panel.
/// </summary>
public class CampaignStatsDto
{
    public int CampaignId { get; set; }
    public string CampaignName { get; set; } = string.Empty;
    public string CauseName { get; set; } = string.Empty;
    public int DonorCount { get; set; }
    public decimal RaisedAmount { get; set; }
    public decimal GoalAmount { get; set; }
    public decimal PercentageReached { get; set; }
}

/// <summary>
/// Cause-level donation statistics for the admin dashboard donations-by-cause panel.
/// Named DashboardCauseStatsDto to avoid collision with the existing CauseStatsDto
/// (which holds aggregate counts for the causes endpoint, not the dashboard).
/// </summary>
public class DashboardCauseStatsDto
{
    public int CauseId { get; set; }
    public string CauseName { get; set; } = string.Empty;
    public string? CauseCode { get; set; }
    public decimal RaisedAmount { get; set; }
    public decimal TargetAmount { get; set; }
    public int DonationCount { get; set; }
}
