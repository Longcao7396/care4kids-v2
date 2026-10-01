using GiveAID.Application.Features.Organizations.Commands;
using GiveAID.Application.Features.Organizations.DTOs;
using GiveAID.Application.Features.Organizations.Queries.GetAll;
using GiveAID.Application.Features.Organizations.Queries.GetFeatured;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GiveAID.V2.WebApi.Controllers;

/// <summary>
/// Controller for organizations/partners.
/// </summary>
[ApiController]
[Route("api/v1/organizations")]
public class OrganizationsController : ControllerBase
{
    private readonly ISender _mediator;

    public OrganizationsController(ISender mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Get all organizations. Optional filters: ?activeOnly=true&type=NGO
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] bool activeOnly = true,
        [FromQuery] string? type = null)
    {
        var items = await _mediator.Send(new GetAllOrganizationsQuery
        {
            ActiveOnly = activeOnly,
            Type = type
        });
        return Ok(new { success = true, message = "OK", data = items });
    }

    /// <summary>
    /// Get featured organizations.
    /// </summary>
    [HttpGet("featured")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFeatured([FromQuery] int count = 6)
    {
        var items = await _mediator.Send(new GetFeaturedOrganizationsQuery { Limit = count });
        return Ok(new { success = true, message = "OK", data = items });
    }

    /// <summary>
    /// Get stats: counts by type, total contribution.
    /// </summary>
    [HttpGet("stats")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats()
    {
        var all = await _mediator.Send(new GetAllOrganizationsQuery { ActiveOnly = true });
        var list = all.ToList();
        var stats = new
        {
            total = list.Count,
            supporters = list.Count(o => o.OrganizationType == "Supporter"),
            partners = list.Count(o => o.OrganizationType == "Partner"),
            ngos = list.Count(o => o.OrganizationType == "NGO"),
            corporates = list.Count(o => o.OrganizationType == "Corporate"),
            governments = list.Count(o => o.OrganizationType == "Government"),
            totalContribution = list.Sum(o => o.ContributionAmount ?? 0)
        };
        return Ok(new { success = true, message = "OK", data = stats });
    }

    /// <summary>
    /// Get organization by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var items = await _mediator.Send(new GetAllOrganizationsQuery { ActiveOnly = false });
        var dto = items.FirstOrDefault(o => o.OrganizationId == id);
        if (dto == null)
        {
            return NotFound(new { success = false, message = $"Organization {id} not found", data = (object?)null });
        }
        return Ok(new { success = true, message = "OK", data = dto });
    }

    /// <summary>
    /// Create an organization (Admin only). Mirrors the structure used by
    /// the admin Partner Management form.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Create([FromBody] CreateOrganizationCommand command, CancellationToken ct)
    {
        try
        {
            var id = await _mediator.Send(command, ct);
            var dto = await GetOneDtoAsync(id, ct);
            return Ok(new { success = true, message = "Organization created", data = dto });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message, data = (object?)null });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message, data = (object?)null });
        }
    }

    /// <summary>
    /// Update an organization (Admin only).
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateOrganizationCommand command, CancellationToken ct)
    {
        command.OrganizationId = id;
        try
        {
            await _mediator.Send(command, ct);
            var dto = await GetOneDtoAsync(id, ct);
            return Ok(new { success = true, message = "Organization updated", data = dto });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message, data = (object?)null });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message, data = (object?)null });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message, data = (object?)null });
        }
    }

    /// <summary>
    /// Soft-delete an organization (Admin only). The row is preserved and
    /// hidden from public reads.
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        try
        {
            await _mediator.Send(new DeleteOrganizationCommand { OrganizationId = id }, ct);
            return Ok(new { success = true, message = "Organization deactivated", data = (object?)null });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message, data = (object?)null });
        }
    }

    private async Task<OrganizationDto?> GetOneDtoAsync(int id, CancellationToken ct)
    {
        var all = await _mediator.Send(new GetAllOrganizationsQuery { ActiveOnly = false }, ct);
        return all.FirstOrDefault(o => o.OrganizationId == id);
    }
}
