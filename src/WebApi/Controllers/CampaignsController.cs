using GiveAID.Application.Features.CampaignRegistrations.Commands.Register;
using GiveAID.Application.Features.CampaignRegistrations.Queries.GetByCampaign;
using GiveAID.Application.Features.CampaignRegistrations.Queries.GetByUser;
using GiveAID.Application.Features.Campaigns.Commands.Create;
using GiveAID.Application.Features.Campaigns.Commands.Delete;
using GiveAID.Application.Features.Campaigns.Commands.Update;
using GiveAID.Application.Features.Campaigns.DTOs;
using GiveAID.Application.Features.Campaigns.Queries.GetAll;
using GiveAID.Application.Features.Campaigns.Queries.GetByCause;
using GiveAID.Application.Features.Campaigns.Queries.GetById;
using GiveAID.Application.Features.Campaigns.Queries.GetFeatured;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GiveAID.V2.WebApi.Controllers;

/// <summary>
/// Controller for managing campaigns (charitable initiatives and events).
/// </summary>
[ApiController]
[Route("api/v1/campaigns")]
public class CampaignsController : ControllerBase
{
    private readonly ISender _mediator;

    public CampaignsController(ISender mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Get all campaigns with pagination and filters.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        [FromQuery] string? status = null,
        [FromQuery] int? causeId = null,
        [FromQuery] bool eventsOnly = false,
        [FromQuery] string? search = null)
    {
        var result = await _mediator.Send(new GetAllCampaignsQuery
        {
            Page = page,
            PageSize = pageSize,
            Status = status,
            CauseId = causeId,
            EventsOnly = eventsOnly,  // M-05: Pass eventsOnly filter to handler
            SearchTerm = search       // Bug #1 fix: pass search filter to handler
        });

        return Ok(new
        {
            success = true,
            message = "OK",
            data = new { items = result.Items, page, pageSize, totalCount = result.TotalCount }
        });
    }

    /// <summary>
    /// Get featured campaigns.
    /// </summary>
    [HttpGet("featured")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFeatured([FromQuery] int count = 3)
    {
        var items = await _mediator.Send(new GetFeaturedCampaignsQuery { Limit = count });
        return Ok(new { success = true, message = "OK", data = items });
    }

    /// <summary>
    /// Get campaigns by cause.
    /// </summary>
    [HttpGet("by-cause/{causeId:int}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByCause(int causeId, [FromQuery] string? status = null)
    {
        var items = await _mediator.Send(new GetCampaignsByCauseQuery
        {
            CauseId = causeId,
            Status = status
        });
        return Ok(new { success = true, message = "OK", data = items });
    }

    /// <summary>
    /// Get campaign by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var dto = await _mediator.Send(new GetCampaignByIdQuery { CampaignId = id });
            return Ok(new { success = true, message = "OK", data = dto });
        }
        catch (InvalidOperationException)
        {
            return NotFound(new { success = false, message = $"Campaign {id} not found", data = (object?)null });
        }
    }

    /// <summary>
    /// Create a new campaign (Admin only).
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Create([FromBody] CreateCampaignCommand command)
    {
        var dto = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetById), new { id = dto.CampaignId },
            new { success = true, message = "Campaign created", data = dto });
    }

    /// <summary>
    /// Update a campaign (Admin only).
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCampaignCommand command)
    {
        command.CampaignId = id;
        var dto = await _mediator.Send(command);
        return Ok(new { success = true, message = "Campaign updated", data = dto });
    }

    /// <summary>
    /// Delete a campaign (Admin only).
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _mediator.Send(new DeleteCampaignCommand { CampaignId = id });
        if (!ok)
        {
            return NotFound(new { success = false, message = $"Campaign {id} not found", data = (object?)null });
        }
        return Ok(new { success = true, message = "Campaign deleted", data = (object?)null });
    }

    /// <summary>
    /// Register for a campaign event. Body: { notes: string? }
    /// </summary>
    [HttpPost("{id:int}/register")]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Register(int id, [FromBody] RegistrationRequest body)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { success = false, message = "Invalid token", data = (object?)null });
        }

        try
        {
            var dto = await _mediator.Send(new RegisterCampaignCommand
            {
                CampaignId = id,
                UserId = userId,
                Notes = body?.Notes
            });
            return Ok(new { success = true, message = "Registration successful", data = dto });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message, data = (object?)null });
        }
    }

    /// <summary>
    /// Get campaign registrations (Admin only).
    /// </summary>
    [HttpGet("{id:int}/registrations")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> GetRegistrations(int id)
    {
        var items = await _mediator.Send(new GetRegistrationsByCampaignQuery { CampaignId = id });
        return Ok(new { success = true, message = "OK", data = items });
    }

    /// <summary>
    /// Get current user's campaign registrations.
    /// </summary>
    [HttpGet("my-registrations")]
    [Authorize]
    public async Task<IActionResult> GetMyRegistrations()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { success = false, message = "Invalid token", data = (object?)null });
        }
        var items = await _mediator.Send(new GetRegistrationsByUserQuery { UserId = userId });
        return Ok(new { success = true, message = "OK", data = items });
    }
}

/// <summary>Body for POST /campaigns/{id}/register.</summary>
public class RegistrationRequest
{
    public string? Notes { get; set; }
}
