using FluentValidation;
using GiveAID.Application.Features.Campaigns.DTOs;
using GiveAID.Application.Features.Campaigns.Validators;
using GiveAID.Application.Services;
using GiveAID.Domain.Entities;
using MediatR;

namespace GiveAID.Application.Features.Campaigns.Commands.Update;

/// <summary>
/// Handler for UpdateCampaignCommand.
/// </summary>
public class UpdateCampaignCommandHandler : IRequestHandler<UpdateCampaignCommand, CampaignDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IValidator<UpdateCampaignCommand> _validator;
    private readonly ICacheService _cacheService;

    public UpdateCampaignCommandHandler(
        IApplicationDbContext context,
        IValidator<UpdateCampaignCommand> validator,
        ICacheService cacheService)
    {
        _context = context;
        _validator = validator;
        _cacheService = cacheService;
    }

    public async Task<CampaignDto> Handle(UpdateCampaignCommand request, CancellationToken cancellationToken)
    {
        // M-02 FIX: ValidationBehavior now handles this automatically in the pipeline
        // Removed manual validator.ValidateAsync() call to avoid double validation

        var campaign = await _context.Campaigns.FindAsync(new object[] { request.CampaignId }, cancellationToken);

        if (campaign == null)
        {
            throw new InvalidOperationException($"Campaign with ID {request.CampaignId} not found.");
        }

        // Update only provided fields
        if (request.CauseId.HasValue) campaign.CauseId = request.CauseId.Value;
        if (request.OrganizationId.HasValue) campaign.OrganizationId = request.OrganizationId.Value;
        if (request.CampaignName != null) campaign.CampaignName = request.CampaignName;
        if (request.CampaignCode != null) campaign.CampaignCode = request.CampaignCode;
        if (request.ProgrammeType != null) campaign.ProgrammeType = request.ProgrammeType;
        if (request.RegistrationRequired.HasValue) campaign.RegistrationRequired = request.RegistrationRequired.Value;
        if (request.MaxParticipants.HasValue) campaign.MaxParticipants = request.MaxParticipants;
        if (request.TargetBeneficiaries.HasValue) campaign.TargetBeneficiaries = request.TargetBeneficiaries;
        if (request.ExpectedBudget.HasValue) campaign.ExpectedBudget = request.ExpectedBudget;
        if (request.ActualBudget.HasValue) campaign.ActualBudget = request.ActualBudget;
        if (request.Description != null) campaign.Description = request.Description;
        if (request.GoalAmount.HasValue) campaign.GoalAmount = request.GoalAmount.Value;
        if (request.StartDate.HasValue) campaign.StartDate = request.StartDate.Value;
        if (request.EndDate.HasValue) campaign.EndDate = request.EndDate;
        if (request.ImageUrl != null) campaign.ImageUrl = request.ImageUrl;
        if (request.BeneficiariesCount.HasValue) campaign.BeneficiariesCount = request.BeneficiariesCount;
        if (request.Location != null) campaign.Location = request.Location;
        if (request.Status != null) campaign.Status = request.Status;
        if (request.IsFeatured.HasValue) campaign.IsFeatured = request.IsFeatured.Value;
        if (request.DisplayOrder.HasValue) campaign.DisplayOrder = request.DisplayOrder.Value;

        campaign.UpdatedAt = DateTime.UtcNow;

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
            ActualBudget = campaign.ActualBudget,
            Description = campaign.Description,
            GoalAmount = campaign.GoalAmount,
            RaisedAmount = campaign.RaisedAmount,
            PercentageReached = campaign.GoalAmount > 0 ? Math.Min((campaign.RaisedAmount / campaign.GoalAmount) * 100, 100) : 0,
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
