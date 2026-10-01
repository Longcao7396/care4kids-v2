using GiveAID.Application.Common.Interfaces;
using GiveAID.Application.Features.Donations.Commands.ConfirmWebhook;
using GiveAID.Application.Features.Donations.Commands.ManualConfirm;
using GiveAID.Application.Services;
using GiveAID.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace GiveAID.Tests.Infrastructure.Integration.Donations;

/// <summary>
/// Helper that builds a real handler stack on top of a real
/// <see cref="GiveAIDDbContext"/>, with all non-database side effects
/// (SMTP, push notifications, in-memory cache, payment gateway) replaced by
/// fakes. The production transactional path is exercised end-to-end.
/// </summary>
internal static class DonationHandlerFactory
{
    public static ConfirmWebhookCommandHandler CreateWebhookHandler(GiveAIDDbContext context, FakePaymentGateway? gateway = null, ILogger<AtomicCampaignUpdater>? updaterLogger = null, ILogger<ConfirmWebhookCommandHandler>? handlerLogger = null)
    {
        gateway ??= new FakePaymentGateway();
        return new ConfirmWebhookCommandHandler(
            context,
            gateway,
            new NoopEmailSender(),
            new NoopCacheService(),
            new NoopNotificationService(),
            new AtomicCampaignUpdater(context, updaterLogger ?? NullLogger<AtomicCampaignUpdater>.Instance),
            new DbTransactionFactory(context),
            new EfDbExecutionStrategy(context),
            handlerLogger ?? NullLogger<ConfirmWebhookCommandHandler>.Instance);
    }

    public static ManualConfirmCommandHandler CreateManualConfirmHandler(GiveAIDDbContext context, ILogger<AtomicCampaignUpdater>? updaterLogger = null, ILogger<ManualConfirmCommandHandler>? handlerLogger = null)
    {
        return new ManualConfirmCommandHandler(
            context,
            new NoopCacheService(),
            new AtomicCampaignUpdater(context, updaterLogger ?? NullLogger<AtomicCampaignUpdater>.Instance),
            new DbTransactionFactory(context),
            new EfDbExecutionStrategy(context),
            handlerLogger ?? NullLogger<ManualConfirmCommandHandler>.Instance);
    }
}