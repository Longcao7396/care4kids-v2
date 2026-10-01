using MediatR;

namespace GiveAID.Application.Features.Organizations.Commands;

/// <summary>
/// Command to update an existing organization. Each optional field is
/// applied independently so the admin UI can submit partial updates.
/// </summary>
public class UpdateOrganizationCommand : IRequest<Unit>
{
    public int OrganizationId { get; set; }
    public string? OrganizationName { get; set; }
    public string? OrganizationType { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? Address { get; set; }
    public string? RegistrationNumber { get; set; }
    public string? Mission { get; set; }
    public string? Vision { get; set; }
    public decimal? ContributionAmount { get; set; }
    public string? ContributionType { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsFeatured { get; set; }
    public int? DisplayOrder { get; set; }
}
