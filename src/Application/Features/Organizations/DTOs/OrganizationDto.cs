namespace GiveAID.Application.Features.Organizations.DTOs;

/// <summary>
/// DTO for organization data.
/// </summary>
public class OrganizationDto
{
    public int OrganizationId { get; set; }
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
    public bool IsActive { get; set; }
    public bool IsFeatured { get; set; }
    public int DisplayOrder { get; set; }
}
