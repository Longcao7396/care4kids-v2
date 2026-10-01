using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Services;
using GiveAID.Infrastructure.Auth;
using GiveAID.Infrastructure.Caching;
using GiveAID.Infrastructure.Email;
using GiveAID.Infrastructure.Payments;
using GiveAID.Infrastructure.Persistence;
using GiveAID.Infrastructure.Persistence.Seed;
using GiveAID.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

// Using alias to avoid conflict
using DataSeeder = GiveAID.Infrastructure.Persistence.Seed.SeedData;

namespace GiveAID.Infrastructure.Services;

/// <summary>
/// Extension methods for registering Infrastructure layer services.
/// </summary>
public static class InfrastructureServiceCollectionExtensions
{
    /// <summary>
    /// Registers all Infrastructure layer services.
    /// </summary>
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Database
        services.AddDbContext<GiveAIDDbContext>(options =>
        {
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                sqlOptions =>
                {
                    // Retry transient errors (e.g. DB restart, connection timeout)
                    sqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 3,
                        maxRetryDelay: TimeSpan.FromSeconds(10),
                        errorNumbersToAdd: null);
                    // Give DB operations more time before failing
                    sqlOptions.CommandTimeout(60);
                });
        });

        services.AddScoped<IApplicationDbContext>(provider =>
            provider.GetRequiredService<GiveAIDDbContext>());

        // Atomic operations service (C-04 fix)
        services.AddScoped<IAtomicCampaignUpdater, AtomicCampaignUpdater>();

        // Transaction factory + execution strategy (Phase 1 fix).
        // Together they ensure SaveChangesAsync and raw SQL UPDATEs share one transaction
        // and that the transaction runs under the configured retry policy.
        services.AddScoped<IDbTransactionFactory, DbTransactionFactory>();
        services.AddScoped<IDbExecutionStrategy, EfDbExecutionStrategy>();

        // JWT Settings
        // Note: Jwt:Secret is validated in Program.cs. Here we use the configured value.
        services.Configure<JwtSettings>(options =>
        {
            options.Secret = configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret is required. Set the Jwt__Secret environment variable.");
            options.Issuer = configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("Jwt:Issuer is required");
            options.Audience = configuration["Jwt:Audience"] ?? throw new InvalidOperationException("Jwt:Audience is required");
            options.ExpiryMinutes = int.TryParse(configuration["Jwt:ExpiryMinutes"], out var expiry) && expiry > 0 ? expiry : 1440;
        });

        // SMTP Settings
        // L-02: Password MUST come from environment variable in production.
        // appsettings.json should have an empty string; the env var takes precedence.
        var smtpPassword = Environment.GetEnvironmentVariable("SMTP_PASSWORD")
            ?? configuration["Smtp:SmtpPassword"] ?? "";

        services.Configure<SmtpSettings>(options =>
        {
            options.SmtpEnabled = bool.Parse(configuration["Smtp:SmtpEnabled"] ?? "false");
            options.SmtpHost = configuration["Smtp:SmtpHost"] ?? "smtp.gmail.com";
            options.SmtpPort = int.Parse(configuration["Smtp:SmtpPort"] ?? "587");
            options.SmtpUsername = Environment.GetEnvironmentVariable("SMTP_USERNAME")
                ?? configuration["Smtp:SmtpUsername"] ?? "";
            options.SmtpPassword = smtpPassword;
            options.FromEmail = configuration["Smtp:FromEmail"] ?? "noreply@give-aid.org";
            options.FromName = configuration["Smtp:FromName"] ?? "GiveAID";
            options.PublicSiteUrl = configuration["Smtp:PublicSiteUrl"] ?? "https://giveaid.org";
        });

        // Payment Gateway Settings
        // L-04: StripeWebhookSecret must come from environment variable in production.
        services.Configure<PaymentGatewaySettings>(options =>
        {
            options.Type = configuration["PaymentGateway:Type"] ?? "Mock";
            options.StripeSecretKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY")
                ?? configuration["PaymentGateway:StripeSecretKey"] ?? "";
            options.StripeWebhookSecret = Environment.GetEnvironmentVariable("STRIPE_WEBHOOK_SECRET")
                ?? configuration["PaymentGateway:StripeWebhookSecret"] ?? "";
        });

        // Email behaviour options (e.g. skip email verification in dev)
        services.Configure<EmailOptions>(options =>
        {
            options.RequireVerification = bool.TryParse(configuration["Email:RequireVerification"], out var v) ? v : true;
        });

        // Security services
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IHtmlSanitizer, HtmlSanitizer>();

        // Email services
        services.AddScoped<IEmailLogService, EmailLogService>();
        services.AddScoped<IEmailSender, SmtpEmailSender>();

        // Payment gateway
        services.AddScoped<IPaymentGateway, PaymentGatewayFactory>();

        // Caching
        services.AddMemoryCache();
        services.AddScoped<ICacheService, MemoryCacheService>();

        // Password reset rate limiting with exponential backoff (SECURITY FIX #4)
        services.AddSingleton<IPasswordResetThrottleService, PasswordResetThrottleService>();

        // Image storage (Cloudinary)
        services.Configure<CloudinarySettings>(options =>
        {
            options.CloudName = Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME")
                ?? configuration["Cloudinary:CloudName"] ?? "";
            options.ApiKey = Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY")
                ?? configuration["Cloudinary:ApiKey"] ?? "";
            options.ApiSecret = Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET")
                ?? configuration["Cloudinary:ApiSecret"] ?? "";
            options.UploadFolder = configuration["Cloudinary:UploadFolder"] ?? "giveaid";
        });
        services.AddScoped<IImageStorageService, CloudinaryImageStorageService>();

        // Current user service for audit logging
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        // Notification service
        services.AddScoped<INotificationService, NotificationService>();

        return services;
    }
}
