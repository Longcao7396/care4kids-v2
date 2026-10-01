using FluentAssertions;
using FluentValidation;
using FluentValidation.Results;
using GiveAID.Application.Features.Campaigns.Commands.Create;
using GiveAID.Application.Features.Campaigns.DTOs;
using GiveAID.Application.Services;
using GiveAID.Application.Common.Interfaces;
using GiveAID.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace GiveAID.Tests.Unit.Application.Campaigns;

public class CreateCampaignHandlerTests
{
    private readonly Mock<IApplicationDbContext> _contextMock;
    private readonly Mock<IValidator<CreateCampaignCommand>> _validatorMock;
    private readonly Mock<ICacheService> _cacheServiceMock;

    public CreateCampaignHandlerTests()
    {
        _contextMock = new Mock<IApplicationDbContext>();
        _validatorMock = new Mock<IValidator<CreateCampaignCommand>>();
        _cacheServiceMock = new Mock<ICacheService>();
        // Default: validation always passes
        _validatorMock
            .Setup(v => v.ValidateAsync(It.IsAny<CreateCampaignCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());
    }

    private CreateCampaignCommandHandler BuildHandler() =>
        new(_contextMock.Object, _validatorMock.Object, _cacheServiceMock.Object);

    [Fact]
    public async Task Handle_ValidCommand_CampaignNameIsSet()
    {
        // Arrange
        var campaignName = "Test Campaign";
        Campaign? capturedCampaign = null;
        
        var mockCampaignSet = new Mock<DbSet<Campaign>>();
        mockCampaignSet.Setup(s => s.Add(It.IsAny<Campaign>()))
            .Callback<Campaign>(c => capturedCampaign = c);
        
        _contextMock.Setup(c => c.Campaigns).Returns(mockCampaignSet.Object);
        _contextMock.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        
        // Setup Causes to return a cause with proper ID
        var cause = new Cause { CauseId = 1, CauseName = "Education" };
        var mockCauseSet = new Mock<DbSet<Cause>>();
        mockCauseSet.Setup(s => s.FindAsync(It.IsAny<object[]>())).ReturnsAsync(cause);
        _contextMock.Setup(c => c.Causes).Returns(mockCauseSet.Object);

        var handler = BuildHandler();
        var command = new CreateCampaignCommand
        {
            CauseId = 1,
            CampaignName = campaignName,
            GoalAmount = 1000m,
            Description = "Test Description",
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddDays(30),
            Status = "Active"
        };

        // Act
        await handler.Handle(command, CancellationToken.None);

        // Assert
        capturedCampaign.Should().NotBeNull();
        capturedCampaign!.CampaignName.Should().Be(campaignName);
    }

    [Fact]
    public async Task Handle_ValidCommand_RaisedAmountIsZero()
    {
        // Arrange
        Campaign? capturedCampaign = null;
        
        var mockCampaignSet = new Mock<DbSet<Campaign>>();
        mockCampaignSet.Setup(s => s.Add(It.IsAny<Campaign>()))
            .Callback<Campaign>(c => capturedCampaign = c);
        
        _contextMock.Setup(c => c.Campaigns).Returns(mockCampaignSet.Object);
        _contextMock.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        
        var cause = new Cause { CauseId = 1, CauseName = "Education" };
        var mockCauseSet = new Mock<DbSet<Cause>>();
        mockCauseSet.Setup(s => s.FindAsync(It.IsAny<object[]>())).ReturnsAsync(cause);
        _contextMock.Setup(c => c.Causes).Returns(mockCauseSet.Object);

        var handler = BuildHandler();
        var command = new CreateCampaignCommand
        {
            CauseId = 1,
            CampaignName = "Test Campaign",
            GoalAmount = 5000m,
            StartDate = DateTime.UtcNow
        };

        // Act
        await handler.Handle(command, CancellationToken.None);

        // Assert
        capturedCampaign.Should().NotBeNull();
        capturedCampaign!.RaisedAmount.Should().Be(0m);
    }

    [Fact]
    public async Task Handle_ValidCommand_StatusIsSet()
    {
        // Arrange
        Campaign? capturedCampaign = null;
        
        var mockCampaignSet = new Mock<DbSet<Campaign>>();
        mockCampaignSet.Setup(s => s.Add(It.IsAny<Campaign>()))
            .Callback<Campaign>(c => capturedCampaign = c);
        
        _contextMock.Setup(c => c.Campaigns).Returns(mockCampaignSet.Object);
        _contextMock.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        
        var cause = new Cause { CauseId = 1, CauseName = "Education" };
        var mockCauseSet = new Mock<DbSet<Cause>>();
        mockCauseSet.Setup(s => s.FindAsync(It.IsAny<object[]>())).ReturnsAsync(cause);
        _contextMock.Setup(c => c.Causes).Returns(mockCauseSet.Object);

        var handler = BuildHandler();
        var command = new CreateCampaignCommand
        {
            CauseId = 1,
            CampaignName = "Test Campaign",
            GoalAmount = 1000m,
            StartDate = DateTime.UtcNow,
            Status = "Active"
        };

        // Act
        await handler.Handle(command, CancellationToken.None);

        // Assert
        capturedCampaign.Should().NotBeNull();
        capturedCampaign!.Status.Should().Be("Active");
    }

    [Fact]
    public void CreateCampaignCommand_DefaultStatus_IsActive()
    {
        // Arrange & Act
        var command = new CreateCampaignCommand();

        // Assert
        command.Status.Should().Be("Active");
    }
}
