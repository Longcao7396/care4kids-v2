// One-shot CLI tool that backfills the `campaigns.description` column for
// every existing row in the database. It reuses the same CampaignCopy.Build
// helper that SeedData uses, so the live site and any fresh seed produce
// identical copy.
//
// Usage (from repo root):
//   dotnet run --project tools/CampaignDescriptionBackfill
//
// Override the connection string with:
//   set ConnectionStrings__DefaultConnection="Server=...;Database=...;..."
//
// Re-running is safe: rows that already have a description are skipped.

using System.Globalization;
using GiveAID.Infrastructure.Persistence.Seed;
using Microsoft.Data.SqlClient;

internal static class Program
{
    private static int Main(string[] args)
    {
        var conn = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
                   ?? @"Server=(localdb)\MSSQLLocalDB;Database=GiveAIDDB;Integrated Security=True;TrustServerCertificate=True";

        var onlyEmpty = !args.Contains("--include-all", StringComparer.OrdinalIgnoreCase);
        var dryRun = args.Contains("--dry-run", StringComparer.OrdinalIgnoreCase);

        Console.WriteLine($"Connection: {conn}");
        Console.WriteLine($"Mode: {(dryRun ? "DRY-RUN (no writes)" : "LIVE UPDATE")}");
        Console.WriteLine($"Scope: {(onlyEmpty ? "rows with NULL/empty description" : "all rows (--include-all)")}");
        Console.WriteLine();

        using var connection = new SqlConnection(conn);
        connection.Open();

        var rows = LoadCampaigns(connection);
        Console.WriteLine($"Loaded {rows.Count} campaign rows from DB.");

        int updated = 0, skipped = 0, failed = 0;

        foreach (var row in rows)
        {
            if (onlyEmpty && !string.IsNullOrWhiteSpace(row.Description))
            {
                skipped++;
                continue;
            }

            try
            {
                var desc = CampaignCopy.Build(
                    campaignName: row.CampaignName,
                    causeName: row.CauseName,
                    programmeType: row.ProgrammeType ?? string.Empty,
                    beneficiariesCount: row.BeneficiariesCount ?? 0,
                    goalAmount: row.GoalAmount,
                    raisedAmount: row.RaisedAmount,
                    status: row.Status);

                if (dryRun)
                {
                    Console.WriteLine($"[dry-run] {row.CampaignCode,-6} {Truncate(row.CampaignName, 60)}");
                    Console.WriteLine($"           → {desc.Length} chars, 3 paragraphs");
                }
                else
                {
                    UpdateDescription(connection, row.CampaignId, desc);
                    updated++;
                    if (updated % 10 == 0)
                    {
                        Console.WriteLine($"… updated {updated} rows so far.");
                    }
                }
            }
            catch (Exception ex)
            {
                failed++;
                Console.Error.WriteLine($"FAIL on {row.CampaignCode} '{row.CampaignName}': {ex.Message}");
            }
        }

        Console.WriteLine();
        Console.WriteLine($"Done. Updated={updated}, Skipped={skipped}, Failed={failed}");
        return failed == 0 ? 0 : 1;
    }

    private sealed record CampaignRow(
        int CampaignId,
        string? CampaignCode,
        string CampaignName,
        string CauseName,
        string? ProgrammeType,
        int? BeneficiariesCount,
        decimal GoalAmount,
        decimal RaisedAmount,
        string Status,
        string? Description);

    private static List<CampaignRow> LoadCampaigns(SqlConnection connection)
    {
        const string sql = @"
            SELECT  c.campaign_id,
                    c.campaign_code,
                    c.campaign_name,
                    ISNULL(ca.cause_name, '')    AS cause_name,
                    c.programme_type,
                    c.beneficiaries_count,
                    c.goal_amount,
                    c.raised_amount,
                    c.status,
                    c.description
            FROM    dbo.campaigns c
            LEFT JOIN dbo.causes ca ON ca.cause_id = c.cause_id
            ORDER BY c.campaign_id;";

        using var cmd = new SqlCommand(sql, connection);
        using var reader = cmd.ExecuteReader();
        var rows = new List<CampaignRow>();
        while (reader.Read())
        {
            rows.Add(new CampaignRow(
                CampaignId: reader.GetInt32(0),
                CampaignCode: reader.IsDBNull(1) ? null : reader.GetString(1),
                CampaignName: reader.GetString(2),
                CauseName: reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                ProgrammeType: reader.IsDBNull(4) ? null : reader.GetString(4),
                BeneficiariesCount: reader.IsDBNull(5) ? null : reader.GetInt32(5),
                GoalAmount: reader.GetDecimal(6),
                RaisedAmount: reader.GetDecimal(7),
                Status: reader.GetString(8),
                Description: reader.IsDBNull(9) ? null : reader.GetString(9)));
        }
        return rows;
    }

    private static void UpdateDescription(SqlConnection connection, int campaignId, string description)
    {
        const string sql = @"
            UPDATE  dbo.campaigns
            SET     description = @description,
                    updated_at = SYSUTCDATETIME()
            WHERE   campaign_id = @campaign_id;";
        using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.Add(new SqlParameter("@description", System.Data.SqlDbType.NVarChar, -1) { Value = description });
        cmd.Parameters.AddWithValue("@campaign_id", campaignId);
        cmd.ExecuteNonQuery();
    }

    private static string Truncate(string s, int max)
        => s.Length <= max ? s : s.Substring(0, max - 1) + "…";
}
