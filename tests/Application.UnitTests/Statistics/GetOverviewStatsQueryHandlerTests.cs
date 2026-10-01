using FluentAssertions;
using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Features.Statistics.DTOs;
using GiveAID.Application.Features.Statistics.Queries.GetOverview;
using GiveAID.Application.Services;
using GiveAID.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using MockQueryable.Moq;
using Moq;

namespace GiveAID.Tests.Unit.Application.Statistics;

/// <summary>
/// Unit tests for the donor-count logic in <see cref="GetOverviewStatsQueryHandler"/>.
/// Step 6 fix: anonymous donations (UserId == null) must NOT count as registered donors.
/// </summary>
public class GetOverviewStatsQueryHandlerTests
{
    private readonly Mock<IApplicationDbContext> _contextMock;
    private readonly Mock<ICacheService> _cacheServiceMock;

    public GetOverviewStatsQueryHandlerTests()
    {
        _contextMock = new Mock<IApplicationDbContext>();
        _cacheServiceMock = new Mock<ICacheService>();

        // Get/Set on the cache are no-ops (handler returns the freshly computed value).
        _cacheServiceMock.Setup(c => c.Get<OverviewStatsDto>(It.IsAny<string>())).Returns((OverviewStatsDto?)null);
        _cacheServiceMock.Setup(c => c.Set(It.IsAny<string>(), It.IsAny<OverviewStatsDto>(), It.IsAny<TimeSpan>()));
    }

    private GetOverviewStatsQueryHandler MakeHandler() =>
        new(_contextMock.Object, _cacheServiceMock.Object);

    [Fact]
    public async Task Handle_TwoDonationsSameUserPlusAnonymous_CountsOneDonor()
    {
        // Arrange: 2 donations by UserId=5 (Completed) + 1 anonymous donation (UserId=null)
        var donations = new List<Donation>
        {
            new Donation { DonationId = 1, UserId = 5,    Amount = 100m, PaymentStatus = "Completed" },
            new Donation { DonationId = 2, UserId = 5,    Amount = 200m, PaymentStatus = "Completed" },
            new Donation { DonationId = 3, UserId = null, Amount = 50m,  PaymentStatus = "Completed" },
            // Pending donation — must not be counted
            new Donation { DonationId = 4, UserId = 6,    Amount = 999m, PaymentStatus = "Pending" }
        }.AsQueryable();

        _contextMock.Setup(c => c.Donations).Returns(donations.BuildMockDbSet().Object);
        _contextMock.Setup(c => c.Campaigns).Returns(new List<Campaign>().AsQueryable().BuildMockDbSet().Object);

        var handler = MakeHandler();
        var result = await handler.Handle(new GetOverviewStatsQuery(), CancellationToken.None);

        result.Should().NotBeNull();
        result.TotalDonors.Should().Be(1,
            "the two donations by UserId=5 count as one donor; the anonymous donation is excluded; the Pending donation is excluded");
    }

    [Fact]
    public async Task Handle_OnlyAnonymousDonations_CountsZeroDonors()
    {
        var donations = new List<Donation>
        {
            new Donation { DonationId = 1, UserId = null, Amount = 100m, PaymentStatus = "Completed" },
            new Donation { DonationId = 2, UserId = null, Amount = 200m, PaymentStatus = "Completed" }
        }.AsQueryable();
        _contextMock.Setup(c => c.Donations).Returns(donations.BuildMockDbSet().Object);
        _contextMock.Setup(c => c.Campaigns).Returns(new List<Campaign>().AsQueryable().BuildMockDbSet().Object);

        var handler = MakeHandler();
        var result = await handler.Handle(new GetOverviewStatsQuery(), CancellationToken.None);

        result.TotalDonors.Should().Be(0);
    }

    [Fact]
    public async Task Handle_NoCompletedDonations_CountsZeroDonors()
    {
        var donations = new List<Donation>
        {
            new Donation { DonationId = 1, UserId = 5, Amount = 100m, PaymentStatus = "Pending" }
        }.AsQueryable();
        _contextMock.Setup(c => c.Donations).Returns(donations.BuildMockDbSet().Object);
        _contextMock.Setup(c => c.Campaigns).Returns(new List<Campaign>().AsQueryable().BuildMockDbSet().Object);

        var handler = MakeHandler();
        var result = await handler.Handle(new GetOverviewStatsQuery(), CancellationToken.None);

        result.TotalDonors.Should().Be(0);
    }
}
