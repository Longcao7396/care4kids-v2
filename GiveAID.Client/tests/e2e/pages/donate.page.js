/**
 * Page Object Model for the Donate page.
 *
 * The form is multi-step:
 *   1. Pick a cause (required)
 *   2. Pick a campaign (optional)
 *   3. Enter donation amount
 *   4. Pick payment method (Bank Transfer / Net Banking / Credit / Debit)
 *      - Credit/Debit reveals card form with strict client-side validation
 *   5. Optional message + anonymous toggle
 *
 * The PaymentInformation step is the most fragile — the form elements
 * are rendered conditionally based on paymentMethod state. We scope
 * selectors via the `name` attribute where possible, and use the .dp-*
 * CSS classes that the production code owns (acceptable per project
 * convention; we are NOT adding data-testid props).
 */
const { expect } = require('@playwright/test');

class DonatePage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /your donation/i }).first();
    /* Cause picker. The production code uses two <select>s — parent + sub.
     * We use the parent-cause <select> by matching `parentCauseId`. */
    this.parentCause = page.locator('select[name="parentCauseId"]');
    this.subCause = page.locator('select[name="causeId"]');
    this.campaign = page.locator('select[name="campaignId"]');
    this.amount = page.locator('input[name="amount"]');
    this.paymentMethod = page.locator('select[name="paymentMethod"]');
    this.message = page.locator('textarea[name="message"]');
    this.anonymous = page.locator('input[name="isAnonymous"]');
    this.submit = page.locator('button.dp-submit');
    /* Quick-amount buttons render as <button class="dp-quick-btn">. */
    this.quickAmounts = page.locator('.dp-quick-btn');
    /* Card form (only visible for CreditCard / DebitCard). */
    this.cardNumber = page.locator('input[autocomplete="cc-number"]');
    this.cardHolderName = page.locator('input[autocomplete="cc-name"]');
    this.expiry = page.locator('input[autocomplete="cc-exp"]');
    this.cvv = page.locator('input[autocomplete="cc-csc"]');
    /* Alerts */
    this.alert = page.locator('.dp-alert');
    /* Field-level error (card-specific). */
    this.fieldError = page.locator('.dp-field-error');
  }

  async visit() {
    await this.page.goto('/donate');
    /* The form shows up immediately even for anonymous users? No — donate
     * is gated by ProtectedRoute, so anonymous visitors get bounced to
     * /login. Callers are expected to be authenticated. We wait for the
     * hero or the login form depending on what shows up. */
    await this.page.waitForLoadState('networkidle');
  }

  async selectFirstCause() {
    await expect(this.parentCause).toBeVisible({ timeout: 10_000 });
    /* Wait for options to populate (they come from /causes/tree). */
    await this.page.waitForFunction(
      () => {
        const sel = document.querySelector('select[name="parentCauseId"]');
        return sel && sel.options.length > 1;
      },
      { timeout: 10_000 }
    );
    const opts = await this.parentCause.locator('option').all();
    /* First non-empty option after the placeholder. */
    for (const opt of opts) {
      const v = await opt.getAttribute('value');
      if (v && v !== '') {
        await this.parentCause.selectOption(v);
        return v;
      }
    }
    throw new Error('No cause options available');
  }

  async setAmount(value) {
    await this.amount.fill(String(value));
  }

  async pickQuickAmount(idx = 0) {
    await this.quickAmounts.nth(idx).click();
  }

  async submitForm() {
    await this.submit.click();
  }

  async expectError(text) {
    await expect(this.alert).toBeVisible({ timeout: 10_000 });
    if (text) await expect(this.alert).toContainText(text);
  }

  async expectSuccess() {
    /* The donate form redirects to the mock-confirm page after a
     * successful POST. We must follow the redirect, click Confirm,
     * and then verify the result page shows the English "Thank you"
     * banner that the Care4Kids UX exposes on Completed status. */
    await this.expectOnMockConfirmPage();
    await this.confirmMockPayment();
    await this.expectThankYouOnResultPage();
  }

  async expectOnMockConfirmPage() {
    /* Allow generous timeout — under parallel load the donation POST can
     * take longer to round-trip (the rate-limit window is 100/min/IP
     * shared across the test suite). */
    await this.page.waitForURL(/\/payment\/mock-confirm/, { timeout: 30_000 });
    /* The English info copy should be visible. */
    await expect(
      this.page.getByText(/confirm payment/i).first()
    ).toBeVisible({ timeout: 10_000 });
  }

  async confirmMockPayment() {
    /* Click the green "Confirm payment" button rendered by
     * PaymentMockConfirmPage. We assert the English UX string. */
    const btn = this.page.getByRole('button', { name: /confirm payment/i });
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();
    await this.page.waitForURL(/\/payment\/result/, { timeout: 15_000 });
  }

  async expectThankYouOnResultPage() {
    /* The Completed banner on the result page carries the Care4Kids
     * English "Thank you" copy. */
    await expect(
      this.page.getByRole('heading', { name: /thank you/i }).first()
    ).toBeVisible({ timeout: 30_000 });
  }
}

module.exports = { DonatePage };