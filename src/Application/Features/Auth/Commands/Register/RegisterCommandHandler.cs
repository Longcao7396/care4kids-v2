using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Features.Auth.DTOs;
using GiveAID.Application.Services;
using GiveAID.Domain.Entities;
using GiveAID.Domain.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GiveAID.Application.Features.Auth.Commands.Register;

/// <summary>
/// Handler for RegisterCommand.
/// M-04 FIX: The database unique constraint on Email and Username is the authoritative
/// guard against duplicates. We catch DbUpdateException from the unique constraint
/// violation and convert it into a user-friendly InvalidOperationException.
/// We retain the pre-check for UX (faster rejection) but do NOT rely on it for safety.
/// </summary>
public class RegisterCommandHandler : IRequestHandler<RegisterCommand, UserDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<RegisterCommandHandler> _logger;
    private readonly IOptions<EmailOptions> _emailOptions;
    private readonly ICacheService _cacheService;

    public RegisterCommandHandler(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IEmailSender emailSender,
        ILogger<RegisterCommandHandler> logger,
        IOptions<EmailOptions> emailOptions,
        ICacheService cacheService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _emailSender = emailSender;
        _logger = logger;
        _emailOptions = emailOptions;
        _cacheService = cacheService;
    }

    public async Task<UserDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var requireVerification = _emailOptions.Value.RequireVerification;

        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            FullName = request.FullName,
            Phone = request.Phone,
            Address = request.Address,
            Profession = request.Profession,
            DateOfBirth = request.DateOfBirth,
            Gender = request.Gender,
            Role = "User",
            IsActive = true,
            // In dev (RequireVerification=false): auto-verify so users can log in immediately.
            // In prod (RequireVerification=true): keep verification required per standard flow.
            IsVerified = !requireVerification,
            VerificationToken = requireVerification ? Guid.NewGuid().ToString("N") : null,
            CreatedAt = DateTime.UtcNow,
            PasswordChangedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            // M-04: Handle unique constraint violation from the database.
            // The database's unique index is the authoritative guard — we handle the exception
            // here in case a concurrent request bypassed the pre-check.
            if (IsUniqueConstraintViolation(ex))
            {
                _logger.LogWarning("Duplicate registration attempt for {Field}: {Value}",
                    GetViolatedField(ex), request.Email);
                throw new DuplicateResourceException("A user with this email or username already exists.");
            }
            throw;
        }

        // Invalidate dashboard statistics cache — new user changes registeredUsers count.
        _cacheService.InvalidateStatistics();

        // Send welcome email (fire-and-forget; failures must not break registration)
        try
        {
            if (user.VerificationToken != null)
            {
                await _emailSender.SendRegistrationConfirmationAsync(
                    user.Email, user.Username, user.VerificationToken);
            }
        }
        catch (Exception emailEx)
        {
            // Log but don't propagate — email is best-effort
            _logger.LogWarning(emailEx, "Failed to send welcome email to {Email}", user.Email);
        }

        return new UserDto
        {
            UserId = user.UserId,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            IsActive = user.IsActive
        };
    }

    /// <summary>
    /// Determines if the DbUpdateException is caused by a unique constraint violation.
    /// SQL Server error codes: 2601 (duplicate key row), 2627 (unique constraint violation).
    /// Also matches by message text for database-agnostic detection.
    /// </summary>
    private static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        // Check for SQL Server specific exception type
        var sqlExType = ex.InnerException?.GetType();
        if (sqlExType != null)
        {
            var fullName = sqlExType.FullName ?? "";
            // SQL Server SqlException: "Microsoft.Data.SqlClient.SqlException" or "System.Data.SqlClient.SqlException"
            if (fullName.Contains("SqlClient", StringComparison.OrdinalIgnoreCase) ||
                fullName.Contains("SqlException", StringComparison.OrdinalIgnoreCase))
            {
                // Extract error number from SqlException
                var message = ex.InnerException?.Message ?? "";
                // Common unique violation codes: 2601, 2627
                if (message.Contains("2601", StringComparison.Ordinal) ||
                    message.Contains("2627", StringComparison.Ordinal))
                {
                    return true;
                }
            }
        }
        // Fallback: check message text for SQL Server constraint keywords
        var msg = ex.InnerException?.Message ?? ex.Message;
        return msg.Contains("unique", StringComparison.OrdinalIgnoreCase) ||
               msg.Contains("duplicate", StringComparison.OrdinalIgnoreCase) ||
               msg.Contains("UNIQUE KEY", StringComparison.OrdinalIgnoreCase) ||
               msg.Contains("constraint", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Extracts the violated field name from the exception message for logging purposes.
    /// </summary>
    private static string GetViolatedField(DbUpdateException ex)
    {
        var message = ex.InnerException?.Message ?? "";
        if (message.Contains("email", StringComparison.OrdinalIgnoreCase)) return "email";
        if (message.Contains("username", StringComparison.OrdinalIgnoreCase)) return "username";
        return "unknown";
    }
}
