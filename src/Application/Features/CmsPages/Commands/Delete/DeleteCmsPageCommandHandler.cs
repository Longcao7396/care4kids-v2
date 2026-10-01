using GiveAID.Application.Common.Interfaces;
using MediatR;

namespace GiveAID.Application.Features.CmsPages.Commands.Delete;

/// <summary>
/// Soft-deletes a CMS page. The base DbContext intercepts the hard
/// <c>Remove</c> call and converts it to <c>IsDeleted = true</c> +
/// <c>DeletedAt = utcNow</c> so the global query filter excludes the row
/// from subsequent reads while keeping an audit trail.
/// </summary>
public class DeleteCmsPageCommandHandler : IRequestHandler<DeleteCmsPageCommand, Unit>
{
    private readonly IApplicationDbContext _context;

    public DeleteCmsPageCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(DeleteCmsPageCommand request, CancellationToken cancellationToken)
    {
        var page = await _context.CmsPages.FindAsync(new object[] { request.PageId }, cancellationToken);

        if (page == null)
        {
            // Already gone (or never existed) - treat as a successful no-op so
            // the admin UI does not surface a misleading error after a
            // concurrent delete.
            return Unit.Value;
        }

        _context.CmsPages.Remove(page);
        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
