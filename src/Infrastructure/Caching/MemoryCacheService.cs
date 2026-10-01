using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Memory;
using GiveAID.Application.Services;
using Microsoft.Extensions.Logging;

namespace GiveAID.Infrastructure.Caching;

public class MemoryCacheService : ICacheService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<MemoryCacheService> _logger;

    // Tracks every key set through Set() so InvalidateStatistics() can remove them.
    // Using ConcurrentDictionary so reads (TryGetValue) are lock-free.
    private readonly ConcurrentDictionary<string, byte> _statisticsKeys = new();

    public MemoryCacheService(IMemoryCache cache, ILogger<MemoryCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<T?> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan expiry) where T : class
    {
        if (_cache.TryGetValue(key, out T? cachedValue))
        {
            return cachedValue!;
        }

        var value = await factory();
        Set(key, value, expiry);
        return value;
    }

    public T? Get<T>(string key) where T : class
    {
        _cache.TryGetValue(key, out T? value);
        return value;
    }

    public void Set<T>(string key, T value, TimeSpan expiry) where T : class
    {
        var options = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = expiry
        };
        _cache.Set(key, value, options);

        // Register this key so InvalidateStatistics() can find and remove it.
        _statisticsKeys.TryAdd(key, 0);
    }

    public void Remove(string key)
    {
        _cache.Remove(key);
        _statisticsKeys.TryRemove(key, out _);
    }

    public void InvalidateStatistics()
    {
        // IMemoryCache does not support pattern-based removal, so we enumerate
        // the set of keys we have registered through Set() and remove each one.
        foreach (var key in _statisticsKeys.Keys)
        {
            _cache.Remove(key);
            _statisticsKeys.TryRemove(key, out _);
        }

        if (_statisticsKeys.IsEmpty)
        {
            _logger.LogDebug("InvalidateStatistics: cache was already empty");
        }
        else
        {
            _logger.LogWarning("InvalidateStatistics: had {Count} tracked keys — all removed", _statisticsKeys.Count);
        }
    }

    public bool Exists(string key)
    {
        return _cache.TryGetValue(key, out _);
    }
}
