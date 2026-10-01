using FluentValidation;
using GiveAID.Application.Features.Campaigns.DTOs;
using GiveAID.Application.Features.Campaigns.Validators;
using GiveAID.Application.Services;
using GiveAID.Domain.Entities;
using MediatR;

namespace GiveAID.Application.Features.Campaigns.Commands.Create;

/// <summary>
/// Handler for CreateCampaignCommand.
/// </summary>
public class CreateCampaignCommandHandler : IRequestHandler<CreateCampaignCommand, CampaignDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IValidator<CreateCampaignCommand> _validator;
    private readonly ICacheService _cacheService;

    public CreateCampaignCommandHandler(
        IApplicationDbContext context,
        IValidator<CreateCampaignCommand> validator,
        ICacheService cacheService)
    {
        _context = context;
        _validator = validator;
        _cacheService = cacheService;
    }

    public async Task<CampaignDto> Handle(CreateCampaignCommand request, CancellationToken cancellationToken)
    {
        // M-02 FIX: ValidationBehavior now handles this automatically in the pipeline
        // Removed manual validator.ValidateAsync() call to avoid double validation

        var campaign = new Campaign
        {
            CauseId = request.CauseId,
            OrganizationId = request.OrganizationId,
            CampaignName = request.CampaignName,
            CampaignCode = request.CampaignCode,
            ProgrammeType = request.ProgrammeType,
            RegistrationRequired = request.RegistrationRequired,
            MaxParticipants = request.MaxParticipants,
            TargetBeneficiaries = request.TargetBeneficiaries,
            ExpectedBudget = request.ExpectedBudget,
            Description = request.Description,
            GoalAmount = request.GoalAmount,
            RaisedAmount = 0,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            ImageUrl = request.ImageUrl,
            BeneficiariesCount = request.BeneficiariesCount,
            Location = request.Location,
            Status = request.Status,
            IsFeatured = request.IsFeatured,
            DisplayOrder = request.DisplayOrder,
            CreatedBy = request.CreatedBy,
            CreatedAt = DateTime.UtcNow
        };

        _context.Campaigns.Add(campaign);
        await _context.SaveChangesAsync(cancellationToken);

        var cause = await _context.Causes.FindAsync(new object[] { campaign.CauseId }, cancellationToken);

        _cacheService.InvalidateStatistics();

        return new CampaignDto
        {
            CampaignId = campaign.CampaignId,
            CauseId = campaign.CauseId,
            CauseName = cause?.CauseName,
            OrganizationId = campaign.OrganizationId,
            CampaignName = campaign.CampaignName,
            CampaignCode = campaign.CampaignCode,
            ProgrammeType = campaign.ProgrammeType,
            RegistrationRequired = campaign.RegistrationRequired,
            MaxParticipants = campaign.MaxParticipants,
            TargetBeneficiaries = campaign.TargetBeneficiaries,
            ExpectedBudget = campaign.ExpectedBudget,
            Description = campaign.Description,
            GoalAmount = campaign.GoalAmount,
            RaisedAmount = campaign.RaisedAmount,
            StartDate = campaign.StartDate,
            EndDate = campaign.EndDate,
            ImageUrl = campaign.ImageUrl,
            BeneficiariesCount = campaign.BeneficiariesCount,
            Location = campaign.Location,
            Status = campaign.Status,
            IsFeatured = campaign.IsFeatured,
            DisplayOrder = campaign.DisplayOrder,
            CreatedBy = campaign.CreatedBy,
            CreatedAt = campaign.CreatedAt
        };
    }
}
