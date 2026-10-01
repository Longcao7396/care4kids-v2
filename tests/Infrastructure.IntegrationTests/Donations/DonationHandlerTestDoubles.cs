using GiveAID.Application.Services;

namespace GiveAID.Tests.Infrastructure.Integration.Donations;

/// <summary>
/// Fakes for the Application-layer services that the donation handlers depend on.
/// These are no-ops for the concurrency / aggregate tests — they let the handler
/// exercise the real EF Core transaction path without touching SMTP, push
/// notifications, or in-memory caches.
/// </summary>
internal sealed class FakePaymentGateway : IPaymentGateway
{
    public Func<string, string, Task<WebhookVerificationResult>>? Verify { get; set; }

    public Task<PaymentIntentResult> CreatePaymentIntentAsync(long amount, string currency, int donationId, string email)
        => Task.FromResult(new PaymentIntentResult { Success = true, TransactionId = $"TXN-{donationId}" });

    public Task<WebhookVerificationResult> VerifyWebhookAsync(string payload, string signature)
    {
        if (Verify is not null)
        {
            return Verify(payload, signature);
        }
        // Default behavior: read event type / transaction id / event id from the
        // payload JSON. Tests set the payload to control the verification result.
        return Task.FromResult(ParsePayload(payload));
    }

    private static WebhookVerificationResult ParsePayload(string payload)
    {
        // Minimal mock: extract fields from a flat JSON-shaped string.
        // Real verification (HMAC + timestamp) is exercised in the unit tests;
        // the integration tests just need the handler to take the verified branch.
        var result = new WebhookVerificationResult
        {
            Valid = true,
            RawPayload = payload,
            EventType = Extract(payload, "event_type"),
            EventId = Extract(payload, "event_id") ?? Guid.NewGuid().ToString(),
            TransactionId = Extract(payload, "transaction_id")
        };
        return result;
    }

    private static string? Extract(string payload, string key)
    {
        var needle = $"\"{key}\":\"";
        var i = payload.IndexOf(needle, StringComparison.Ordinal);
        if (i < 0) return null;
        var start = i + needle.Length;
        var end = payload.IndexOf('"', start);
        return end > start ? payload.Substring(start, end - start) : null;
    }

    public Task<PaymentStatusResult> GetPaymentStatusAsync(string transactionId)
        => Task.FromResult(new PaymentStatusResult { Success = true, Status = "completed" });

    public Task<RefundResult> ProcessRefundAsync(string transactionId, long? amount = null)
        => Task.FromResult(new RefundResult { Success = true });
}

internal sealed class NoopCacheService : ICacheService
{
    public Task<T?> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan expiry) where T : class
        => factory().ContinueWith(t => (T?)t.Result);

    public T? Get<T>(string key) where T : class => null;

    public void Set<T>(string key, T value, TimeSpan expiry) where T : class { }

    public void Remove(string key) { }

    public void InvalidateStatistics() { }

    public bool Exists(string key) => false;
}

internal sealed class NoopEmailSender : IEmailSender
{
    public Task<bool> SendEmailAsync(string to, string subject, string body, bool isHtml = true)
        => Task.FromResult(true);

    public Task<bool> SendPasswordResetEmailAsync(string email, string resetToken, string resetUrl)
        => Task.FromResult(true);

    public Task<bool> SendDonationReceiptAsync(string email, int donationId, decimal amount, string campaignName)
        => Task.FromResult(true);

    public Task<bool> SendRegistrationConfirmationAsync(string email, string username, string verificationToken)
        => Task.FromResult(true);
}

internal sealed class NoopNotificationService : INotificationService
{
    public Task CreateNotificationAsync(int userId, string type, string title, string message,
        string? relatedEntityType = null, int? relatedEntityId = null, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}