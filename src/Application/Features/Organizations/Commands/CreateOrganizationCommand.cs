using MediatR;

namespace GiveAID.Application.Features.Organizations.Commands;

/// <summary>
/// Command to create a new organization (partner / NGO / supporter).
/// All write paths go through the Admin Partner Management screen, so this
/// command is admin-only.
/// </summary>
public class CreateOrganizationCommand : IRequest<int>
{
    public string OrganizationName { get; set; } = string.Empty;
    public string OrganizationType { get; set; } = string.Empty;
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
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
    public int DisplayOrder { get; set; }
}
