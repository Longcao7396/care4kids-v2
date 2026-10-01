using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GiveAID.Domain.Entities;

namespace GiveAID.Infrastructure.Persistence.Configurations;

public class DonationConfiguration : IEntityTypeConfiguration<Donation>
{
    public void Configure(EntityTypeBuilder<Donation> builder)
    {
        builder.ToTable("donations");

        builder.HasKey(d => d.DonationId);

        builder.Property(d => d.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(d => d.PaymentMethod)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(d => d.PaymentStatus)
            .HasMaxLength(20);

        builder.Property(d => d.CardLastFour)
            .HasMaxLength(4);

        builder.Property(d => d.CardType)
            .HasMaxLength(20);

        builder.Property(d => d.TransactionId)
            .HasMaxLength(100);

        builder.Property(d => d.Message)
            .HasMaxLength(500);

        builder.Property(d => d.IdempotencyKey)
            .HasMaxLength(100);

        builder.Property(d => d.GatewayTransactionId)
            .HasMaxLength(100);

        // Relationships - UserId is optional to support anonymous donations
        builder.Property(d => d.UserId).IsRequired(false);
        builder.HasOne(d => d.User)
            .WithMany(u => u.Donations)
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Cause)
            .WithMany(c => c.Donations)
            .HasForeignKey(d => d.CauseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Campaign)
            .WithMany(c => c.Donations)
            .HasForeignKey(d => d.CampaignId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(d => d.Organization)
            .WithMany(o => o.Donations)
            .HasForeignKey(d => d.OrganizationId)
            .OnDelete(DeleteBehavior.SetNull);

        // M-13: Idempotency Indexes
        // 
        // Previous: Composite index (UserId, IdempotencyKey) - only worked for authenticated
        // New: Unique index on IdempotencyKey alone - works for both authenticated AND anonymous
        //
        // IMPORTANT: This is a UNIQUE filtered index that allows multiple NULL values.
        // The application logic ensures non-null keys are unique.
        // 
        // NEW BEHAVIOR:
        // - Client provides IdempotencyKey → check for existing, return if found
        // - No IdempotencyKey → server generates new Guid (NO dedup)
        // - Same email+campaign+amount with different keys → both succeed
        builder.HasIndex(d => d.IdempotencyKey)
            .IsUnique()
            .HasFilter("[idempotency_key] IS NOT NULL");
        
        // Legacy indexes kept for query performance
        builder.HasIndex(d => d.UserId);
        builder.HasIndex(d => d.PaymentStatus);

        // Soft delete: hide deleted donations from normal queries.
        builder.HasQueryFilter(d => !d.IsDeleted);
    }
}
