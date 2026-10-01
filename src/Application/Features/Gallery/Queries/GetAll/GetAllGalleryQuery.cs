using GiveAID.Application.Features.Gallery.DTOs;
using MediatR;

namespace GiveAID.Application.Features.Gallery.Queries.GetAll;

/// <summary>
/// Query to get all gallery items.
/// </summary>
public class GetAllGalleryQuery : IRequest<GalleryPagedResult>
{
    public string? Category { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// Paginated gallery result including total count (pre-pagination).
/// </summary>
public class GalleryPagedResult
{
    public IEnumerable<GalleryDto> Items { get; set; } = Array.Empty<GalleryDto>();
    public int TotalCount { get; set; }
}