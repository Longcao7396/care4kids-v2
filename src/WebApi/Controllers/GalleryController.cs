using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Features.Gallery.Commands.Create;
using GiveAID.Application.Features.Gallery.Commands.Delete;
using GiveAID.Application.Features.Gallery.Commands.Update;
using GiveAID.Application.Features.Gallery.DTOs;
using GiveAID.Application.Features.Gallery.Queries.GetAll;
using GiveAID.Application.Features.Gallery.Queries.GetFeatured;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GiveAID.V2.WebApi.Controllers;

/// <summary>
/// Controller for gallery management.
/// </summary>
[ApiController]
[Route("api/v1/gallery")]
public class GalleryController : ControllerBase
{
    private readonly ISender _mediator;
    private readonly IImageStorageService _imageStorage;
    private readonly ILogger<GalleryController> _logger;

    public GalleryController(
        ISender mediator,
        IImageStorageService imageStorage,
        ILogger<GalleryController> logger)
    {
        _mediator = mediator;
        _imageStorage = imageStorage;
        _logger = logger;
    }

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        [FromQuery] string? category = null)
    {
        var result = await _mediator.Send(new GetAllGalleryQuery
        {
            Page = page,
            PageSize = pageSize,
            Category = category
        });
        return Ok(new
        {
            success = true,
            message = "OK",
            data = new { items = result.Items, page, pageSize, totalCount = result.TotalCount }
        });
    }

    [HttpGet("featured")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFeatured([FromQuery] int count = 8)
    {
        var items = await _mediator.Send(new GetFeaturedGalleryQuery { Limit = count });
        return Ok(new { success = true, message = "OK", data = items });
    }

    [HttpGet("categories")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories()
    {
        // Distinct categories from gallery items.
        var all = await _mediator.Send(new GetAllGalleryQuery { Page = 1, PageSize = 1000 });
        var cats = all.Items
            .Where(g => !string.IsNullOrWhiteSpace(g.Category))
            .Select(g => g.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToList();
        return Ok(new { success = true, message = "OK", data = cats });
    }

    /// <summary>
    /// Get programmes for gallery filtering (MAJ-009). Returns programmes that have gallery items.
    /// Note: Programme concept is deprecated; this endpoint is kept for backward compatibility.
    /// </summary>
    [HttpGet("programmes")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProgrammes()
    {
        // Return empty array — Programme table no longer in use.
        return Ok(new { success = true, message = "OK", data = Array.Empty<object>() });
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var items = await _mediator.Send(new GetAllGalleryQuery { Page = 1, PageSize = 1000 });
        var dto = items.Items.FirstOrDefault(g => g.GalleryId == id);
        if (dto == null)
        {
            return NotFound(new { success = false, message = $"Gallery item {id} not found", data = (object?)null });
        }
        return Ok(new { success = true, message = "OK", data = dto });
    }

    [HttpPost]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Create([FromBody] GalleryCreateDto dto)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(userIdClaim, out var userId);
        var command = new CreateGalleryCommand
        {
            Title = dto.Title,
            PhotoUrl = dto.PhotoUrl,
            ThumbnailUrl = dto.ThumbnailUrl,
            Category = dto.Category,
            Tags = dto.Tags,
            OrganizationId = dto.OrganizationId,
            DisplayOrder = dto.DisplayOrder,
            IsFeatured = dto.IsFeatured,
            UploadedBy = userId > 0 ? (int?)userId : null
        };
        var newId = await _mediator.Send(command);
        return Ok(new { success = true, message = "Gallery item created", data = new { id = newId } });
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Update(int id, [FromBody] GalleryUpdateDto dto)
    {
        await _mediator.Send(new UpdateGalleryCommand
        {
            GalleryId = id,
            Title = dto.Title,
            PhotoUrl = dto.PhotoUrl,
            ThumbnailUrl = dto.ThumbnailUrl,
            Category = dto.Category,
            Tags = dto.Tags,
            OrganizationId = dto.OrganizationId,
            DisplayOrder = dto.DisplayOrder ?? 0,
            IsFeatured = dto.IsFeatured ?? false
        });
        return Ok(new { success = true, message = "Gallery item updated", data = (object?)null });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteGalleryCommand { GalleryId = id });
        return Ok(new { success = true, message = "Gallery item deleted", data = (object?)null });
    }

    /// <summary>
    /// NEW: Create a gallery item by uploading a file to Cloudinary.
    /// Replaces the legacy URL-paste endpoint with a proper multipart upload.
    /// Auth: Admin only (preserved from the original Create endpoint).
    /// </summary>
    [HttpPost("upload")]
    [Authorize(Policy = "RequireAdmin")]
    [RequestSizeLimit(5_242_880)] // 5 MB — matches the agreed-upon max file size
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateWithUpload(
        [FromForm] GalleryCreateFormDto form,
        CancellationToken cancellationToken)
    {
        if (form.ImageFile == null || form.ImageFile.Length == 0)
        {
            return BadRequest(new { success = false, message = "ImageFile is required", data = (object?)null });
        }

        // Validate content type
        var allowed = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
        if (!allowed.Contains(form.ImageFile.ContentType?.ToLowerInvariant()))
        {
            return BadRequest(new
            {
                success = false,
                message = $"Invalid image type '{form.ImageFile.ContentType}'. Allowed: jpeg, jpg, png, webp.",
                data = (object?)null
            });
        }

        // Upload to Cloudinary
        var uploadResult = await _imageStorage.UploadAsync(
            form.ImageFile.OpenReadStream(),
            form.ImageFile.FileName,
            form.ImageFile.ContentType ?? "image/jpeg",
            folder: "gallery",
            cancellationToken);

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(userIdClaim, out var userId);

        var command = new CreateGalleryCommand
        {
            Title = form.Title,
            PhotoUrl = uploadResult.Url,
            ThumbnailUrl = null, // Deprecated; computed from PhotoUrl via GalleryDto.Thumbnail
            Category = form.Category,
            Tags = form.Tags,
            OrganizationId = form.OrganizationId,
            DisplayOrder = form.DisplayOrder,
            IsFeatured = form.IsFeatured,
            UploadedBy = userId > 0 ? (int?)userId : null,
            PublicId = uploadResult.PublicId,
            OriginalFileName = form.ImageFile.FileName,
            FileSizeBytes = uploadResult.FileSizeBytes,
            ContentType = uploadResult.ContentType
        };

        var newId = await _mediator.Send(command, cancellationToken);
        return Ok(new { success = true, message = "Gallery item created", data = new { id = newId } });
    }

    /// <summary>
    /// NEW: Update a gallery item by uploading a new file. Deletes the old file from Cloudinary.
    /// Use this when you want to REPLACE the image. For metadata-only updates, use PUT /gallery/{id}.
    /// Auth: Admin only.
    /// </summary>
    [HttpPut("{id:int}/upload")]
    [Authorize(Policy = "RequireAdmin")]
    [RequestSizeLimit(5_242_880)] // 5 MB
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateWithUpload(
        int id,
        [FromForm] GalleryUpdateFormDto form,
        CancellationToken cancellationToken)
    {
        if (form.ImageFile == null || form.ImageFile.Length == 0)
        {
            return BadRequest(new { success = false, message = "ImageFile is required", data = (object?)null });
        }

        var allowed = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
        if (!allowed.Contains(form.ImageFile.ContentType?.ToLowerInvariant()))
        {
            return BadRequest(new
            {
                success = false,
                message = $"Invalid image type '{form.ImageFile.ContentType}'. Allowed: jpeg, jpg, png, webp.",
                data = (object?)null
            });
        }

        var uploadResult = await _imageStorage.UploadAsync(
            form.ImageFile.OpenReadStream(),
            form.ImageFile.FileName,
            form.ImageFile.ContentType ?? "image/jpeg",
            folder: "gallery",
            cancellationToken);

        await _mediator.Send(new UpdateGalleryCommand
        {
            GalleryId = id,
            Title = form.Title,
            PhotoUrl = uploadResult.Url,
            ThumbnailUrl = null,
            Category = form.Category,
            Tags = form.Tags,
            OrganizationId = form.OrganizationId,
            DisplayOrder = form.DisplayOrder ?? 0,
            IsFeatured = form.IsFeatured ?? false,
            ReplacingFile = true,
            PublicId = uploadResult.PublicId,
            OriginalFileName = form.ImageFile.FileName,
            FileSizeBytes = uploadResult.FileSizeBytes,
            ContentType = uploadResult.ContentType
        }, cancellationToken);

        return Ok(new { success = true, message = "Gallery item updated with new image", data = (object?)null });
    }
}

public class GalleryCreateDto
{
    public string? Title { get; set; }
    public string PhotoUrl { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? Category { get; set; }
    public string? Tags { get; set; }
    public int? OrganizationId { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsFeatured { get; set; }
}

public class GalleryUpdateDto
{
    public string? Title { get; set; }
    public string? PhotoUrl { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? Category { get; set; }
    public string? Tags { get; set; }
    public int? OrganizationId { get; set; }
    public int? DisplayOrder { get; set; }
    public bool? IsFeatured { get; set; }
}

// ===== Form DTOs for multipart upload endpoints =====

public class GalleryCreateFormDto
{
    public string? Title { get; set; }
    public string? Category { get; set; }
    public string? Tags { get; set; }
    public int? OrganizationId { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsFeatured { get; set; }
    public IFormFile? ImageFile { get; set; }
}

public class GalleryUpdateFormDto
{
    public string? Title { get; set; }
    public string? Category { get; set; }
    public string? Tags { get; set; }
    public int? OrganizationId { get; set; }
    public int? DisplayOrder { get; set; }
    public bool? IsFeatured { get; set; }
    public IFormFile? ImageFile { get; set; }
}
