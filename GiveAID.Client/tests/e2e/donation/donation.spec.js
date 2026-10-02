/**
 * Donation tests — exercise the donation form, validation rules, and the
 * happy path end-to-end. BankTransfer is the recommended mock path so
 * we never submit card details to the real payment processor.
 */
const { test, expect } = require('../fixtures/auth.fixture');
const { DonatePage } = require('../pages/donate.page');

test.describe('Donation — page renders for logged-in users', () => {
  test('Donate page loads with cause list and amount field', async ({ userPage: page }) => {
    const donate = new DonatePage(page);
    await donate.visit();
    await expect(donate.heading).toBeVisible();
    await expect(donate.amount).toBeVisible();
    await expect(donate.parentCause).toBeVisible();
    await expect(donate.submit).toBeVisible();
  });

  test('quick-amount buttons populate the amount field', async ({ userPage: page }) => {
    const donate = new DonatePage(page);
    await donate.visit();
    /* quickAmounts[1] = 250000. */
    await donate.pickQuickAmount(1);
    await expect(donate.amount).toHaveValue('250000');
  });
});

test.describe('Donation — validation', () => {
  test('submit without selecting a cause is blocked by required validation', async ({ userPage: page }) => {
    const donate = new DonatePage(page);
    await donate.visit();
    /* The parent-cause <select> has HTML5 `required`, so the browser
     * blocks form submission and never invokes handleSubmit. Verify the
     * form did NOT navigate away and the cause field is still empty. */
    await donate.submitForm();
    /* Still on /donate, no error alert from server (because nothing
     * was actually submitted). */
    await expect(page).toHaveURL(/\/donate$/);
    /* Verify the parent-cause select reports a validation error via
     * the native constraint validation API. */
    const validity = await donate.parentCause.evaluate((el) => ({
      valid: el.checkValidity(),
      valueMissing: el.validity.valueMissing,
    }));
    expect(validity.valid).toBe(false);
    expect(validity.valueMissing).toBe(true);
  });

  test('submit with amount=0 is blocked by HTML5 min validation', async ({ userPage: page }) => {
    const donate = new DonatePage(page);
    await donate.visit();
    await donate.selectFirstCause();
    await donate.setAmount('0');
    await donate.submitForm();
    /* amount input has min="1000"; submit is blocked by HTML5 validation.
     * Verify we stayed on the page. */
    await expect(page).toHaveURL(/\/donate$/);
    const validity = await donate.amount.evaluate((el) => ({
      valid: el.checkValidity(),
      rangeUnderflow: el.validity.rangeUnderflow,
    }));
    expect(validity.valid).toBe(false);
    expect(validity.rangeUnderflow).toBe(true);
  });

  test('credit card with invalid number is rejected client-side', async ({ userPage: page }) => {
    const donate = new DonatePage(page);
    await donate.visit();
    await donate.selectFirstCause();
    await donate.setAmount('100000');
    /* Switch payment to CreditCard — reveals card form. */
    await donate.paymentMethod.selectOption('CreditCard');
    await expect(donate.cardNumber).toBeVisible();
    await donate.cardNumber.fill('1234 5678 9012 3456'); // not Luhn-valid
    await donate.cardHolderName.fill('NGUYEN VAN A');
    await donate.expiry.fill('12/30');
    await donate.cvv.fill('123');
    await donate.submitForm();
    /* The Luhn check fails — verify the inline error appears. */
    await expect(donate.fieldError.first()).toBeVisible();
    await expect(donate.fieldError.first()).toContainText(/card number/i);
  });

  test('credit card with expired date is rejected', async ({ userPage: page }) => {
    const donate = new DonatePage(page);
    await donate.visit();
    await donate.selectFirstCause();
    await donate.setAmount('100000');
    await donate.paymentMethod.selectOption('CreditCard');
    /* Use a Luhn-valid Visa test number. */
    await donate.cardNumber.fill('4242 4242 4242 4242');
    await donate.cardHolderName.fill('NGUYEN VAN A');
    await donate.expiry.fill('01/20'); // 2020 — expired
    await donate.cvv.fill('123');
    await donate.submitForm();
    await expect(page.locator('text=/expired/i').first()).toBeVisible();
  });
});

test.describe('Donation — happy path', () => {
  test('Bank Transfer donation succeeds end-to-end', async ({ userPage: page }) => {
    const donate = new DonatePage(page);
    await donate.visit();
    const causeId = await donate.selectFirstCause();
    expect(causeId, 'should have selected a cause').toBeTruthy();
    await donate.setAmount('100000');
    /* Default paymentMethod is BankTransfer. */
    await expect(donate.paymentMethod).toHaveValue('BankTransfer');
    await donate.submitForm();
    /* The redirect flow lands on the English PaymentMockConfirmPage;
     * confirming it surfaces the Care4Kids "Thank you" banner on the
     * PaymentResultPage that follows. */
    await donate.expectSuccess();
  });
});

test.describe('Donation — anonymous donation toggle', () => {
  test('toggling isAnonymous does not block submission', async ({ userPage: page }) => {
    const donate = new DonatePage(page);
    await donate.visit();
    await donate.selectFirstCause();
    await donate.setAmount('50000');
    /* The custom checkbox styling puts a <span> over the real <input>.
     * Use force:true to bypass the visibility/stability checks. */
    await donate.anonymous.check({ force: true });
    /* Submission must succeed — same redirect-based flow as the happy
     * path: /donate -> /payment/mock-confirm (English copy) ->
     * /payment/result -> English "Thank you" banner. Following the full
     * flow also proves the anonymous flag is accepted by the backend
     * and not blocked by client-side validation. */
    await donate.submitForm();
    await donate.expectOnMockConfirmPage();
    await donate.confirmMockPayment();
    await donate.expectThankYouOnResultPage();
  });
});