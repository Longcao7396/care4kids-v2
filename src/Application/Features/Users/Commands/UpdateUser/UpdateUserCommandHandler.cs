using GiveAID.Application.Features.Users.DTOs;
using GiveAID.Application.Services;
using MediatR;

namespace GiveAID.Application.Features.Users.Commands.UpdateUser;

/// <summary>
/// Handler for UpdateUserCommand.
/// </summary>
public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, UserAdminDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public UpdateUserCommandHandler(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    public async Task<UserAdminDto> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FindAsync(new object[] { request.UserId }, cancellationToken);

        if (user == null)
        {
            throw new InvalidOperationException($"User with ID {request.UserId} not found.");
        }

        if (request.Username != null) user.Username = request.Username;
        if (request.Email != null) user.Email = request.Email;
        if (request.FullName != null) user.FullName = request.FullName;
        if (request.Phone != null) user.Phone = request.Phone;
        if (request.Role != null) user.Role = request.Role;

        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        _cacheService.InvalidateStatistics();

        return new UserAdminDto
        {
            UserId = user.UserId,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            Phone = user.Phone,
            Role = user.Role,
            IsActive = user.IsActive,
            IsVerified = user.IsVerified,
            LastLogin = user.LastLogin,
            CreatedAt = user.CreatedAt
        };
    }
}
