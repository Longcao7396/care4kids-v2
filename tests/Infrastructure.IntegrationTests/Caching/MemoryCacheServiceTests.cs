using FluentAssertions;
using GiveAID.Infrastructure.Caching;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;

namespace GiveAID.Tests.Unit.Infrastructure.Caching;

public class MemoryCacheServiceTests
{
    private readonly IMemoryCache _cache;
    private readonly Mock<ILogger<MemoryCacheService>> _loggerMock;
    private readonly MemoryCacheService _cacheService;

    public MemoryCacheServiceTests()
    {
        _cache = new MemoryCache(new MemoryCacheOptions());
        _loggerMock = new Mock<ILogger<MemoryCacheService>>();
        _cacheService = new MemoryCacheService(_cache, _loggerMock.Object);
    }

    [Fact]
    public async Task GetOrSetAsync_WhenNotCached_ExecutesFactoryAndCaches()
    {
        // Arrange
        var key = "test-key";
        var factoryCallCount = 0;
        Func<Task<string>> factory = async () =>
        {
            factoryCallCount++;
            await Task.Delay(1);
            return "factory-result";
        };

        // Act
        var result1 = await _cacheService.GetOrSetAsync(key, factory, TimeSpan.FromMinutes(5));
        var result2 = await _cacheService.GetOrSetAsync(key, factory, TimeSpan.FromMinutes(5));

        // Assert
        result1.Should().Be("factory-result");
        result2.Should().Be("factory-result");
        factoryCallCount.Should().Be(1); // Factory only called once
    }

    [Fact]
    public async Task GetOrSetAsync_WhenCached_ReturnsCachedValue()
    {
        // Arrange
        var key = "cached-key";
        var callCount = 0;
        Func<Task<TestData>> factory = async () =>
        {
            callCount++;
            await Task.CompletedTask;
            return new TestData { Id = 1, Name = "Test" };
        };

        // Act
        var result1 = await _cacheService.GetOrSetAsync(key, factory, TimeSpan.FromMinutes(5));
        var result2 = await _cacheService.GetOrSetAsync(key, factory, TimeSpan.FromMinutes(5));

        // Assert
        result1.Should().BeEquivalentTo(result2);
        callCount.Should().Be(1);
    }

    [Fact]
    public void Get_WhenKeyNotExists_ReturnsNull()
    {
        // Act
        var result = _cacheService.Get<TestData>("non-existent-key");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void Set_And_Get_ReturnsStoredValue()
    {
        // Arrange
        var key = "set-key";
        var data = new TestData { Id = 42, Name = "Stored Data" };

        // Act
        _cacheService.Set(key, data, TimeSpan.FromMinutes(10));
        var result = _cacheService.Get<TestData>(key);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(42);
        result.Name.Should().Be("Stored Data");
    }

    [Fact]
    public void Remove_KeyNoLongerAccessible()
    {
        // Arrange
        var key = "remove-key";
        var data = new TestData { Id = 1, Name = "ToRemove" };
        _cacheService.Set(key, data, TimeSpan.FromMinutes(10));

        // Act
        _cacheService.Remove(key);
        var result = _cacheService.Get<TestData>(key);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void Exists_WhenKeyExists_ReturnsTrue()
    {
        // Arrange
        var key = "exists-key";
        _cacheService.Set(key, new TestData { Id = 1 }, TimeSpan.FromMinutes(5));

        // Act
        var exists = _cacheService.Exists(key);

        // Assert
        exists.Should().BeTrue();
    }

    [Fact]
    public void Exists_WhenKeyNotExists_ReturnsFalse()
    {
        // Act
        var exists = _cacheService.Exists("non-existent-key");

        // Assert
        exists.Should().BeFalse();
    }

    [Fact]
    public void InvalidateStatistics_DoesNotThrow()
    {
        // Act
        Action act = () => _cacheService.InvalidateStatistics();

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public async Task GetOrSetAsync_WithComplexType_WorksCorrectly()
    {
        // Arrange
        var key = "complex-key";
        var complexData = new TestData
        {
            Id = 100,
            Name = "Complex Test",
            Nested = new NestedData { Value = "nested-value" }
        };

        Func<Task<TestData>> factory = async () =>
        {
            await Task.CompletedTask;
            return complexData;
        };

        // Act
        var result = await _cacheService.GetOrSetAsync(key, factory, TimeSpan.FromMinutes(5));

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(100);
        result.Name.Should().Be("Complex Test");
    }

    private class TestData
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public NestedData? Nested { get; set; }
    }

    private class NestedData
    {
        public string? Value { get; set; }
    }
}
