using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Services;
using Microsoft.EntityFrameworkCore;

namespace GiveAID.Application.Features.Organizations.Commands;

/// <summary>
/// Handler for <see cref="UpdateOrganizationCommand"/>.
/// </summary>
public class UpdateOrganizationCommandHandler : IRequestHandler<UpdateOrganizationCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public UpdateOrganizationCommandHandler(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    public async Task<Unit> Handle(UpdateOrganizationCommand request, CancellationToken cancellationToken)
    {
        var entity = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(_context.Organizations, o => o.OrganizationId == request.OrganizationId, cancellationToken);
        if (entity == null)
        {
            throw new KeyNotFoundException($"Organization {request.OrganizationId} not found");
        }

        if (request.OrganizationName != null)
        {
            var newName = request.OrganizationName.Trim();
            if (string.IsNullOrEmpty(newName))
                throw new ArgumentException("Organization name cannot be empty.", nameof(request));
            // Uniqueness check excluding the current record
            var conflict = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
                .AnyAsync(_context.Organizations,
                    o => o.OrganizationId != request.OrganizationId && o.OrganizationName == newName,
                    cancellationToken);
            if (conflict)
            {
                throw new InvalidOperationException(
                    $"An organization named \"{newName}\" already exists.");
            }
            entity.OrganizationName = newName;
        }

        if (request.OrganizationType != null) entity.OrganizationType = request.OrganizationType.Trim();
        if (request.Description != null) entity.Description = NullIfEmpty(request.Description);
        if (request.LogoUrl != null) entity.LogoUrl = NullIfEmpty(request.LogoUrl);
        if (request.WebsiteUrl != null) entity.WebsiteUrl = NullIfEmpty(request.WebsiteUrl);
        if (request.ContactEmail != null) entity.ContactEmail = NullIfEmpty(request.ContactEmail);
        if (request.ContactPhone != null) entity.ContactPhone = NullIfEmpty(request.ContactPhone);
        if (request.Address != null) entity.Address = NullIfEmpty(request.Address);
        if (request.RegistrationNumber != null) entity.RegistrationNumber = NullIfEmpty(request.RegistrationNumber);
        if (request.Mission != null) entity.Mission = NullIfEmpty(request.Mission);
        if (request.Vision != null) entity.Vision = NullIfEmpty(request.Vision);
        if (request.ContributionAmount.HasValue) entity.ContributionAmount = request.ContributionAmount;
        if (request.ContributionType != null) entity.ContributionType = NullIfEmpty(request.ContributionType);
        if (request.IsActive.HasValue) entity.IsActive = request.IsActive.Value;
        if (request.IsFeatured.HasValue) entity.IsFeatured = request.IsFeatured.Value;
        if (request.DisplayOrder.HasValue) entity.DisplayOrder = request.DisplayOrder.Value;

        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        _cacheService.InvalidateStatistics();

        return Unit.Value;
    }

    private static string? NullIfEmpty(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
