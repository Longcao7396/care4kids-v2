using GiveAID.Application.Features.Organizations.DTOs;
using Microsoft.EntityFrameworkCore;

namespace GiveAID.Application.Features.Organizations.Queries.GetAll;

/// <summary>
/// Handler for GetAllOrganizationsQuery.
/// </summary>
public class GetAllOrganizationsQueryHandler : IRequestHandler<GetAllOrganizationsQuery, IEnumerable<OrganizationDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllOrganizationsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<OrganizationDto>> Handle(GetAllOrganizationsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Organizations.AsQueryable();

        if (request.ActiveOnly)
        {
            query = query.Where(o => o.IsActive);
        }

        if (!string.IsNullOrEmpty(request.Type))
        {
            query = query.Where(o => o.OrganizationType == request.Type);
        }

        var organizations = await query
            .OrderBy(o => o.DisplayOrder)
            .ThenBy(o => o.OrganizationName)
            .ToListAsync(cancellationToken);

        return organizations.Select(o => new OrganizationDto
        {
            OrganizationId = o.OrganizationId,
            OrganizationName = o.OrganizationName,
            OrganizationType = o.OrganizationType,
            Description = o.Description,
            LogoUrl = o.LogoUrl,
            WebsiteUrl = o.WebsiteUrl,
            ContactEmail = o.ContactEmail,
            ContactPhone = o.ContactPhone,
            Address = o.Address,
            RegistrationNumber = o.RegistrationNumber,
            Mission = o.Mission,
            Vision = o.Vision,
            ContributionAmount = o.ContributionAmount,
            ContributionType = o.ContributionType,
            IsActive = o.IsActive,
            IsFeatured = o.IsFeatured,
            DisplayOrder = o.DisplayOrder
        });
    }
}
