using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GiveAID.Domain.Entities;

public class Campaign : BaseEntity
{
    [Key]
    public int CampaignId { get; set; }

    [Required]
    public int CauseId { get; set; }

    public int? OrganizationId { get; set; }

    [Required]
    [MaxLength(200)]
    public string CampaignName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? CampaignCode { get; set; }

    [MaxLength(50)]
    public string? ProgrammeType { get; set; }

    public bool RegistrationRequired { get; set; }
    public int? MaxParticipants { get; set; }
    public int? TargetBeneficiaries { get; set; }
    public decimal? ExpectedBudget { get; set; }
    public decimal? ActualBudget { get; set; }

    public string? Description { get; set; }

    [Required]
    public decimal GoalAmount { get; set; }

    public decimal RaisedAmount { get; set; }

    [Required]
    public DateTime StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    public int? BeneficiariesCount { get; set; }

    [MaxLength(200)]
    public string? Location { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Active";

    public bool IsFeatured { get; set; }
    public int DisplayOrder { get; set; }

    // Navigation properties
    [ForeignKey("CauseId")]
    public virtual Cause? Cause { get; set; }

    [ForeignKey("OrganizationId")]
    public virtual Organization? Organization { get; set; }

    public virtual ICollection<CampaignRegistration> Registrations { get; set; } = new List<CampaignRegistration>();
    public virtual ICollection<CampaignReport> Reports { get; set; } = new List<CampaignReport>();
    public virtual ICollection<Donation> Donations { get; set; } = new List<Donation>();
}
