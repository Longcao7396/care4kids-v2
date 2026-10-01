using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Services;
using GiveAID.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GiveAID.Application.Features.Organizations.Commands;

/// <summary>
/// Handler for <see cref="CreateOrganizationCommand"/>.
/// Validates required fields, prevents duplicate organization names (the
/// canonical key used by the seed), then persists the new organization.
/// </summary>
public class CreateOrganizationCommandHandler : IRequestHandler<CreateOrganizationCommand, int>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public CreateOrganizationCommandHandler(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    public async Task<int> Handle(CreateOrganizationCommand request, CancellationToken cancellationToken)
    {
        Validate(request);

        var name = request.OrganizationName.Trim();
        var duplicate = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .AnyAsync(_context.Organizations, o => o.OrganizationName == name, cancellationToken);
        if (duplicate)
        {
            throw new InvalidOperationException(
                $"An organization named \"{name}\" already exists. " +
                "Organization names must be unique.");
        }

        var entity = new Organization
        {
            OrganizationName = name,
            OrganizationType = request.OrganizationType.Trim(),
            Description = NullIfEmpty(request.Description),
            LogoUrl = NullIfEmpty(request.LogoUrl),
            WebsiteUrl = NullIfEmpty(request.WebsiteUrl),
            ContactEmail = NullIfEmpty(request.ContactEmail),
            ContactPhone = NullIfEmpty(request.ContactPhone),
            Address = NullIfEmpty(request.Address),
            RegistrationNumber = NullIfEmpty(request.RegistrationNumber),
            Mission = NullIfEmpty(request.Mission),
            Vision = NullIfEmpty(request.Vision),
            ContributionAmount = request.ContributionAmount,
            ContributionType = NullIfEmpty(request.ContributionType),
            IsActive = request.IsActive,
            IsFeatured = request.IsFeatured,
            DisplayOrder = request.DisplayOrder,
            CreatedAt = DateTime.UtcNow
        };

        _context.Organizations.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        _cacheService.InvalidateStatistics();

        return entity.OrganizationId;
    }

    private static void Validate(CreateOrganizationCommand req)
    {
        if (string.IsNullOrWhiteSpace(req.OrganizationName))
            throw new ArgumentException("Organization name is required.", nameof(req));
        if (string.IsNullOrWhiteSpace(req.OrganizationType))
            throw new ArgumentException("Organization type is required.", nameof(req));
    }

    private static string? NullIfEmpty(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
