# Phase 3 — Partial Refunds: DESIGN PROPOSAL (AWAITING APPROVAL)

**Status:** Draft for review. No code has been written yet.
**Per the user's instructions, this is a design document. Implementation begins only after the user replies "approved".**

## 1. Problem statement

Today, `charge.refunded` webhooks decrement the campaign/cause aggregate by the **full** donation amount (`ProcessRefundAsync` does `-donation.Amount`). This is wrong for partial refunds: a 25 USD donation that is 10 USD-refunded should reduce the aggregate by 10, not 25. Over a year of partial-refund traffic this distorts every dashboard, every progress bar, every `[campaign].raised_amount >= [campaign].goal_amount` check.

Stripe's `charge.refunded` event carries the **cumulative** `amount_refunded` for the charge. The naive implementation cannot subtract that number directly, because:

* If the same webhook is redelivered, a blind `-amount_refunded` would subtract twice.
* If a partial-refund webhook is followed by a full-refund webhook, the cumulative value goes from e.g. 10 to 25 — the **delta** for the second webhook is 15, not 25.
* If webhooks arrive out of order, the cumulative value may briefly decrease. We must NOT re-add to the aggregate in that case.

The design must therefore be **idempotent under duplicate / out-of-order delivery**, applying `delta = newCumulativeRefunded − previousRefundedAmount` rather than a blind subtract.

## 2. Schema change

### 2.1 New column on `donations`

| Column            | Type           | Nullable | Default | Notes                                  |
|-------------------|----------------|----------|---------|----------------------------------------|
| `refunded_amount` | `DECIMAL(18,2)`| NO       | `0`     | Cumulative amount refunded (≤ `amount`). |

The aggregate invariant becomes:

```
campaigns.raised_amount = SUM(amount WHERE status='Completed') - SUM(refunded_amount WHERE status IN ('Completed','Refunded'))
causes.raised_amount    = SUM(amount WHERE status='Completed') - SUM(refunded_amount WHERE status IN ('Completed','Refunded'))
```

For consistency the existing `[donations].amount` keeps its current semantics ("the original gross donation"). `refunded_amount` is the running refund counter. The donation's `PaymentStatus` semantics are addressed in §3.

### 2.2 Migration: `database/Donations_RefundedAmount_Migration.sql`

Following the project convention (`database/Donations_UserId_Nullable_Migration.sql`, `database/Donations_Idempotency_PaymentStatus.sql`):

```sql
USE [GiveAIDDB];
GO

IF COL_LENGTH('Donations', 'refunded_amount') IS NULL
BEGIN
    ALTER TABLE [dbo].[Donations]
        ADD [refunded_amount] DECIMAL(18,2) NOT NULL
        CONSTRAINT [DF_Donations_RefundedAmount] DEFAULT (0);
END

-- Backfill: any pre-existing Refunded donation is treated as fully refunded.
UPDATE [dbo].[Donations]
SET [refunded_amount] = [amount]
WHERE [payment_status] = 'Refunded' AND [refunded_amount] = 0;

-- Default backfill for the new column on existing Completed donations.
UPDATE [dbo].[Donations]
SET [refunded_amount] = 0
WHERE [refunded_amount] IS NULL;

PRINT 'Donations_RefundedAmount migration applied.';
```

The migration **does not** touch `SeedData.cs` (per the user's hard rule). It applies to `GiveAIDDB` only (hard-guarded in the SQL — refuses to run against any other DB name).

The EF Core entity `Donation.cs` gets a new `decimal RefundedAmount { get; set; }` property, defaulted to `0`, mapped to `refunded_amount`. The `DonationConfiguration` in `src/Infrastructure/Persistence/Configurations/DonationConfiguration.cs` mirrors the column metadata. The snapshot `GiveAIDDbContextModelSnapshot.cs` is regenerated as part of the implementation PR.

The integration test fixture's `ApplyPostSchemaCorrectionsAsync` is **not** modified — the EF model already drives `EnsureCreatedAsync` for the test databases, so the new column is created automatically when the snapshot is regenerated.

## 3. Status semantics

Today the donation has three valid states: `Pending → Completed → Refunded` (plus `Pending → Failed`). The state machine is encoded in `Donation.MarkAsRefunded`, which throws on `Pending → Refunded`.

**After Phase 3, the state machine is unchanged** (`Refunded` still means *fully* refunded). Partial refunds do not change `PaymentStatus`. A partial refund leaves the donation in `Completed` while `refunded_amount` grows from 0 toward `amount`. A full refund is the special case `refunded_amount == amount`, which transitions `Completed → Refunded` exactly once.

Implications for the rest of the system:

| Component                            | Today                                | After Phase 3                                                                                  |
|--------------------------------------|--------------------------------------|------------------------------------------------------------------------------------------------|
| `Donation.MarkAsRefunded`            | Idempotent on `Refunded → Refunded`  | **Unchanged.** Idempotently transitions `Completed → Refunded`. Now triggered when delta brings `refunded_amount` to `amount`. |
| `Donation.RefundedAmount`            | n/a                                  | New property. Defaults to 0. Set by the handler under the transactional block.                 |
| `Donation.IsFullyRefunded()`         | n/a                                  | New helper: `RefundedAmount >= Amount`. The handler calls this to decide whether to transition to `Refunded`. |
| Webhook `charge.refunded` handler    | Decrements aggregate by `Amount`     | Updates `RefundedAmount` by delta, decrements aggregate by delta, transitions to `Refunded` if and only if now fully refunded. |
| Statistics endpoints                 | Use `SUM(amount WHERE status='Completed')` | Use the new formula (SUM amount − SUM refunded_amount). The expression goes through EF.Functions / raw SQL on the same scope. |
| Donation-detail UI / receipt         | Shows `Amount` and `PaymentStatus`   | Shows `Amount`, `RefundedAmount`, and `IsFullyRefunded()` (renders a "Partially refunded" badge when 0 < RefundedAmount < Amount). |

The status enum stays a 3-value string (`Pending`/`Completed`/`Refunded`); the `Failed` value is kept. No UI changes are required to keep parity.

## 4. Webhook flow (idempotent partial refund)

The handler logic:

```
ProcessPartialRefund(donation, event):
    new_cumulative_refunded = parse_amount_refunded(event)         # from gateway
    if new_cumulative_refunded is null:
        # gateway did not provide a refund amount; treat as full refund of remaining
        new_cumulative_refunded = donation.Amount

    previous_refunded_amount  = SELECT refunded_amount FROM donations WHERE donation_id=?
    delta                     = new_cumulative_refunded − previous_refunded_amount
    if delta <= 0:
        # duplicate / out-of-order webhook; no-op (return 200 to Stripe)
        return 200
    if previous_refunded_amount + delta > donation.Amount:
        # over-refund attempt (gateway says more refunded than possible)
        clamp delta = donation.Amount − previous_refunded_amount
        if delta <= 0: return 200

    won = UPDATE donations
             SET refunded_amount = refunded_amount + @delta
           WHERE donation_id = @id
             AND payment_status IN ('Completed', 'Refunded')   -- idempotency gate
    if not won: return 200     -- donation was Pending/Failed, not eligible

    if campaign_id is not null:
        UPDATE campaigns SET raised_amount = raised_amount − @delta
          WHERE campaign_id = @cid AND raised_amount >= @delta    -- floor guard
    UPDATE causes    SET raised_amount = raised_amount − @delta
      WHERE cause_id   = @causeid AND raised_amount + (-@delta) >= 0    -- floor guard

    if SELECT refunded_amount FROM donations WHERE donation_id=? >= donation.Amount:
        -- fully refunded now → transition to Refunded status
        UPDATE donations SET payment_status='Refunded'
          WHERE donation_id=? AND payment_status='Completed'

    commit
    return 200
```

Key idempotency invariants:

* The atomic UPDATE `WHERE payment_status IN ('Completed','Refunded')` is the source of truth for "is this a refund-eligible donation?". It will not double-decrement on duplicate delivery because the second delivery's `delta` is 0 (the cumulative has not advanced).
* Out-of-order delivery where the second webhook has a *smaller* cumulative number is a no-op (`delta <= 0`).
* The atomic `SET refunded_amount = refunded_amount + @delta` is monotonic — webhooks can never cause `refunded_amount` to decrease.

## 5. Gateway contract change

`IPaymentGateway.VerifyWebhookAsync` already returns `WebhookVerificationResult`. The new field:

```csharp
public class WebhookVerificationResult
{
    public bool   Valid            { get; set; }
    public string? EventType       { get; set; }
    public string? EventId         { get; set; }
    public string? TransactionId   { get; set; }
    public string? RawPayload      { get; set; }
    public string? ErrorMessage    { get; set; }

    // NEW: cumulative refund amount reported by the gateway for charge.refunded events.
    // Null for non-refund events. Populated by StripePaymentGateway from
    // `event.data.object.amount_refunded` on charge.refunded events.
    public decimal? RefundedAmount { get; set; }
}
```

`StripePaymentGateway.VerifyWebhookAsync` parses `data.object.amount_refunded` from the deserialized event payload. `MockPaymentGateway` (used in tests) exposes a settable `RefundedAmount` field on `FakePaymentGateway`.

## 6. Aggregate-update path

The campaign/cause aggregate UPDATE is the same shape we already use:

* `AtomicCampaignUpdater.ApplyCauseRaisedAmountDeltaAsync(causeId, -delta)` — the floor guard `raised_amount + delta >= 0` is reused unchanged.
* A new method `AtomicCampaignUpdater.DecrementCampaignRaisedAmountAsync(campaignId, delta)` (or reuse `IncrementRaisedAmountAsync(campaignId, -delta)`) — the current implementation has no floor guard at the campaign level (only at the cause level), so we add the floor guard for the refund path:
  ```sql
  UPDATE campaigns SET raised_amount = raised_amount − @delta
   WHERE campaign_id = @cid AND raised_amount >= @delta
  ```

This brings the campaign aggregate to parity with the cause aggregate (both floor-guarded at 0). Without it, a partial refund on a campaign that has been fully matched by other donations could underflow.

## 7. Impact on stats queries

Two queries need updating:

1. **Campaign raised amount (live).** Today:
   ```sql
   SELECT raised_amount FROM campaigns WHERE campaign_id = ?
   ```
   still works because the handler now keeps `raised_amount` correct via the floor-guarded UPDATE above. No read-side change needed for this query.

2. **Audit / reconciliation query.** If a back-office report wants to verify the aggregate against the donations table, it must subtract the partial refunds:
   ```sql
   SELECT c.campaign_id,
          SUM(d.amount) - SUM(ISNULL(d.refunded_amount, 0)) AS live_raised
   FROM campaigns c
   LEFT JOIN donations d ON d.campaign_id = c.campaign_id
                         AND d.payment_status IN ('Completed', 'Refunded')
   GROUP BY c.campaign_id;
   ```
   This query is for diagnostics only; it does not run on hot paths.

The Phase 1 invariant (`raised_amount = SUM(Completed amounts)`) is preserved as the engine truth; the new invariant (`raised_amount = SUM(Completed amounts) − SUM(refunded_amount)`) is a strictly stronger statement. The audit query above must agree with the live `raised_amount` column after every transaction.

## 8. Test plan

All tests run against the Phase 2 `SqlServerFixture` (real SQL Server, ephemeral database, `GiveAID_Test_{Guid}`).

| # | Scenario                                                                                          | Assertion                                                                                                |
|---|---------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| 1 | Single partial refund (e.g. 25 of 100) on a Completed donation                                     | `donations.refunded_amount = 25`, `raised_amount` decreased by 25, status stays `Completed`.              |
| 2 | Two partial refunds adding to 100 (full) on a Completed donation                                   | `refunded_amount = 100`, status transitions to `Refunded` exactly once, aggregate decreased by 100 total. |
| 3 | Duplicate partial-refund webhook (same event_id twice)                                             | `refunded_amount` and aggregate are unchanged on the second delivery (idempotent).                        |
| 4 | Out-of-order webhooks (cumulative goes 25 → 10 → 80)                                              | No re-increment. Final `refunded_amount = 80`, aggregate decreased by 80.                                 |
| 5 | Pending → partial-refund webhook (donation never Completed)                                        | Webhook returns 200, `refunded_amount` stays 0, aggregate unchanged. Donation stays Pending.            |
| 6 | Partial refund → aggregate floor                                                                  | Campaign.raised_amount decremented; cannot go below 0 even if the aggregate already matches `goal_amount`. |
| 7 | Failed → partial-refund webhook                                                                   | 200 semantics, no aggregate change (donation was never in `Completed`).                                 |
| 8 | Rollback test (Phase 1 carry-over): inject failure inside the partial-refund transactional block  | `refunded_amount`, `raised_amount`, and any status transition are all rolled back.                       |
| 9 | Unit tests on `WebhookVerificationResult` parsing in `StripePaymentGateway` and `MockPaymentGateway` | `RefundedAmount` populated from `data.object.amount_refunded`; null on non-refund events.               |
| 10| Unit tests on `Donation.IsFullyRefunded` (covers 0, < amount, == amount, > amount)                | Predicate correct on all four cases.                                                                    |

These tests are added as new methods on `DonationConcurrencyTests.cs` (integration) and on `ConfirmWebhookCommandHandlerTests.cs` / `ManualConfirmCommandHandlerTests.cs` (unit).

## 9. Files that will be touched (when approved)

Code:

* `src/Application/Services/IPaymentGateway.cs` — add `decimal? RefundedAmount` to `WebhookVerificationResult`.
* `src/Application/Features/Donations/Commands/ConfirmWebhook/ConfirmWebhookCommandHandler.cs` — `ProcessRefundAsync` rewritten as `ProcessPartialRefundAsync` using the idempotent delta formula and the new atomic transitions.
* `src/Infrastructure/Persistence/AtomicCampaignUpdater.cs` — add floor-guard campaign decrement method (or extend `IncrementRaisedAmountAsync` with an optional floor-guard parameter).
* `src/Infrastructure/Persistence/Configurations/DonationConfiguration.cs` — map `RefundedAmount` → `refunded_amount`, NOT NULL DEFAULT 0.
* `src/Domain/Entities/Donation.cs` — add `decimal RefundedAmount` + `IsFullyRefunded()` helper; extend `MarkAsRefunded` to accept the idempotency gate.

Migration:

* `database/Donations_RefundedAmount_Migration.sql` — new SQL migration (no EF migration generator).
* `src/Infrastructure/Migrations/GiveAIDDbContextModelSnapshot.cs` — snapshot updated to include the new column (regenerated, not hand-edited, but the user said migrations are real SQL only — that applies to production migrations, not to the snapshot file which is regenerated from the model by `dotnet ef migrations add`).

Tests:

* `tests/Infrastructure.IntegrationTests/Donations/DonationConcurrencyTests.cs` — tests 1–8 above.
* `tests/Application.UnitTests/Donations/ConfirmWebhookCommandHandlerTests.cs` — handler-level tests for `ProcessPartialRefundAsync` (delta math, duplicate, out-of-order).
* `tests/Application.UnitTests/Donations/DonationPartialRefundTests.cs` — new file for `Donation.IsFullyRefunded` and the `MarkAsRefunded` idempotency gate.

NO changes to `SeedData.cs`, `GiveAIDDB` data, or any other module.

## 10. Open questions for the reviewer

1. **Status on a fully refunded Completed donation** — propose: transition to `Refunded` exactly once when `RefundedAmount == Amount`. OK?
2. **Multi-cause donations** — current data model links a donation to a single cause and (optionally) a single campaign. If a donation is split across causes, today's aggregate logic is wrong anyway; partial refund keeps the same single-cause assumption. OK?
3. **Floor guard on campaign aggregate** — proposed for symmetry with cause aggregate. OK to add it now, or hold for a separate PR?
4. **Refund on `Failed` donations** — currently rejected (the gateway shouldn't be sending these). The new handler rejects them with 200 + no DB change. OK?

## 11. STOP

This is a design document. **No code has been written.** Awaiting user approval before implementation begins.
