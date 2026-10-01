using GiveAID.Application.Features.Campaigns.DTOs;
using MediatR;

namespace GiveAID.Application.Features.Campaigns.Queries.GetAll;

/// <summary>
/// Query to get all campaigns.
/// </summary>
public class GetAllCampaignsQuery : IRequest<PagedCampaignsResult>
{
    public string? Status { get; set; }
    public int? CauseId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
    /// <summary>
    /// M-05: When true, returns only campaigns that require registration (events).
    /// </summary>
    public bool EventsOnly { get; set; } = false;
    /// <summary>
    /// Optional free-text search applied to campaign name and description.
    /// </summary>
    public string? SearchTerm { get; set; }
}

/// <summary>
/// Result of GetAllCampaignsQuery, including the true total count across all
/// pages (not just the current page's item count).
/// </summary>
public class PagedCampaignsResult
{
    public IEnumerable<CampaignDto> Items { get; set; } = Array.Empty<CampaignDto>();
    public int TotalCount { get; set; }
}
