namespace GiveAID.Application.Features.Campaigns.DTOs;

/// <summary>
/// DTO for campaign data.
/// </summary>
public class CampaignDto
{
    public int CampaignId { get; set; }
    public int CauseId { get; set; }
    public string? CauseName { get; set; }
    public int? OrganizationId { get; set; }
    public string? OrganizationName { get; set; }
    public string CampaignName { get; set; } = string.Empty;
    public string? CampaignCode { get; set; }
    public string? ProgrammeType { get; set; }
    public bool RegistrationRequired { get; set; }
    public int? MaxParticipants { get; set; }
    public int? TargetBeneficiaries { get; set; }
    public decimal? ExpectedBudget { get; set; }
    public decimal? ActualBudget { get; set; }
    public string? Description { get; set; }
    public decimal GoalAmount { get; set; }
    public decimal RaisedAmount { get; set; }
    public decimal PercentageReached { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? DaysRemaining { get; set; }
    public string? ImageUrl { get; set; }
    public int? BeneficiariesCount { get; set; }
    public string? Location { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsFeatured { get; set; }
    public int DisplayOrder { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public int DonorCount { get; set; }
}
