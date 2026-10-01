using MediatR;

namespace GiveAID.Application.Features.CmsPages.Commands.Delete;

/// <summary>
/// Command to soft-delete a CMS page. Hard deletion is intentionally avoided
/// because the public site renders CMS pages anonymously and a hard-deleted
/// page could leave dangling references. The base DbContext converts the
/// soft-delete into IsDeleted/DeletedAt audit fields automatically.
/// </summary>
public class DeleteCmsPageCommand : IRequest<Unit>
{
    public int PageId { get; set; }
}
