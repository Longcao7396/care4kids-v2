using GiveAID.Application.Features.Gallery.DTOs;
using Microsoft.EntityFrameworkCore;

namespace GiveAID.Application.Features.Gallery.Queries.GetAll;

/// <summary>
/// Handler for GetAllGalleryQuery.
/// </summary>
public class GetAllGalleryQueryHandler : IRequestHandler<GetAllGalleryQuery, GalleryPagedResult>
{
    private readonly IApplicationDbContext _context;

    public GetAllGalleryQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<GalleryPagedResult> Handle(GetAllGalleryQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Gallery
            .Include(g => g.Organization)
            .AsQueryable();

        if (!string.IsNullOrEmpty(request.Category))
        {
            query = query.Where(g => g.Category == request.Category);
        }

        // Count pre-pagination so the API can return the true total
        // (was previously returning items.Count() == only items on this page)
        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(g => g.DisplayOrder)
            .ThenByDescending(g => g.UploadedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new GalleryPagedResult
        {
            Items = items.Select(g => new GalleryDto
            {
                GalleryId = g.GalleryId,
                Title = g.Title,
                PhotoUrl = g.PhotoUrl,
                ThumbnailUrl = g.ThumbnailUrl,
                Category = g.Category,
                Tags = g.Tags,
                OrganizationId = g.OrganizationId,
                OrganizationName = g.Organization?.OrganizationName,
                DisplayOrder = g.DisplayOrder,
                IsFeatured = g.IsFeatured,
                UploadedAt = g.UploadedAt,
                PublicId = g.PublicId,
                OriginalFileName = g.OriginalFileName,
                FileSizeBytes = g.FileSizeBytes,
                ContentType = g.ContentType
            }),
            TotalCount = totalCount
        };
    }
}