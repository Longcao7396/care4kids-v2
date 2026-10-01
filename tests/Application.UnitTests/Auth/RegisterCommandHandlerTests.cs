using FluentAssertions;
using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Features.Auth.Commands.Register;
using GiveAID.Application.Services;
using GiveAID.Domain.Entities;
using GiveAID.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace GiveAID.Tests.Unit.Application.Auth;

/// <summary>
/// M-04: Duplicate user registration race condition tests.
/// The database unique constraint is the authoritative guard. Handler must catch
/// DbUpdateException from unique constraint violation and throw DuplicateResourceException.
/// </summary>
public class RegisterCommandHandlerTests
{
    private readonly Mock<IApplicationDbContext> _contextMock;
    private readonly Mock<IPasswordHasher> _passwordHasherMock;
    private readonly Mock<IEmailSender> _emailSenderMock;
    private readonly Mock<ILogger<RegisterCommandHandler>> _loggerMock;
    private readonly Mock<ICacheService> _cacheServiceMock;

    public RegisterCommandHandlerTests()
    {
        _contextMock = new Mock<IApplicationDbContext>();
        _passwordHasherMock = new Mock<IPasswordHasher>();
        _emailSenderMock = new Mock<IEmailSender>();
        _loggerMock = new Mock<ILogger<RegisterCommandHandler>>();
        _cacheServiceMock = new Mock<ICacheService>();

        _passwordHasherMock.Setup(h => h.Hash(It.IsAny<string>())).Returns("hashed_password");
    }

    private RegisterCommandHandler BuildHandler() =>
        new(
            _contextMock.Object, _passwordHasherMock.Object,
            _emailSenderMock.Object, _loggerMock.Object,
            Options.Create(new EmailOptions()), _cacheServiceMock.Object);

    [Fact]
    public async Task Handle_ValidCommand_CreatesUser()
    {
        // Arrange
        User? capturedUser = null;
        _contextMock.Setup(c => c.Users.Add(It.IsAny<User>()))
            .Callback<User>(u => capturedUser = u);
        _contextMock.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        _emailSenderMock
            .Setup(e => e.SendRegistrationConfirmationAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        var handler = BuildHandler();
        var command = new RegisterCommand
        {
            Username = "newuser",
            Email = "newuser@example.com",
            Password = "Password123",
            FullName = "New User"
        };

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        capturedUser.Should().NotBeNull();
        capturedUser!.Username.Should().Be("newuser");
        capturedUser.Email.Should().Be("newuser@example.com");
        result.Username.Should().Be("newuser");
        result.Email.Should().Be("newuser@example.com");
    }

    [Fact]
    public async Task Handle_DbUpdateException_ThrowsDuplicateResourceException()
    {
        // Arrange — simulate a unique constraint violation from the database.
        // This happens when two concurrent requests both pass the pre-check
        // and then one of them hits the unique constraint on INSERT.
        var dbUpdateEx = new DbUpdateException("An error occurred while saving changes.",
            new Exception("UNIQUE KEY constraint 'IX_Users_Email' on table 'users'"));

        _contextMock.Setup(c => c.Users.Add(It.IsAny<User>()));
        _contextMock.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(() => throw dbUpdateEx);

        var handler = BuildHandler();
        var command = new RegisterCommand
        {
            Username = "duplicateuser",
            Email = "duplicate@example.com",
            Password = "Password123",
            FullName = "Duplicate User"
        };

        // Act & Assert
        Func<Task> act = async () => await handler.Handle(command, CancellationToken.None);
        await act.Should().ThrowAsync<DuplicateResourceException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task Handle_DbUpdateException_DoesNotLeakInternalDetails()
    {
        // Arrange
        var dbUpdateEx = new DbUpdateException("An error occurred while saving changes.",
            new Exception("UNIQUE KEY constraint 'IX_Users_Email'"));

        _contextMock.Setup(c => c.Users.Add(It.IsAny<User>()));
        _contextMock.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(() => throw dbUpdateEx);

        var handler = BuildHandler();
        var command = new RegisterCommand
        {
            Username = "anotheruser",
            Email = "another@example.com",
            Password = "Password123",
            FullName = "Another User"
        };

        // Act & Assert — the thrown exception should be a DuplicateResourceException,
        // not the raw DbUpdateException with internal SQL details
        Func<Task> act = async () => await handler.Handle(command, CancellationToken.None);
        var ex = (await act.Should().ThrowAsync<DuplicateResourceException>()).Which;
        // The message should be user-friendly, not contain SQL error codes
        ex.Message.Should().NotContain("2601");
        ex.Message.Should().NotContain("2627");
        ex.Message.Should().NotContain("IX_Users_Email");
    }

    [Fact]
    public async Task Handle_DbUpdateException_OtherError_Propagates()
    {
        // Arrange — non-unique-constraint DbUpdateException should propagate
        var dbUpdateEx = new DbUpdateException("Foreign key violation.");

        _contextMock.Setup(c => c.Users.Add(It.IsAny<User>()));
        _contextMock.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(() => throw dbUpdateEx);

        var handler = BuildHandler();
        var command = new RegisterCommand
        {
            Username = "someuser",
            Email = "some@example.com",
            Password = "Password123",
            FullName = "Some User"
        };

        // Act & Assert — non-unique errors should not be caught as duplicate
        Func<Task> act = async () => await handler.Handle(command, CancellationToken.None);
        await act.Should().ThrowAsync<DbUpdateException>();
    }
}
