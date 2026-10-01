using MediatR;

namespace GiveAID.Application.Features.Organizations.Commands;

/// <summary>
/// Soft-deletes an organization by setting <c>IsDeleted</c> and
/// <c>IsActive</c> to false. We keep the row (a) to preserve referential
/// integrity with existing campaigns/donations, (b) to keep the public
/// "Our Partners" page simply hiding the row, and (c) so the data can be
/// restored if needed.
/// </summary>
public class DeleteOrganizationCommand : IRequest<Unit>
{
    public int OrganizationId { get; set; }
}
