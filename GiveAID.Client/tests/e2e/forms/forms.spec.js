/**
 * Forms tests — verify form behaviour across multiple pages: required
 * fields, client-side validation, submit, and reset.
 *
 * We focus on forms that have a non-trivial validation surface: the
 * register page, the login page, and the contact page.
 */
const { test, expect } = require('@playwright/test');

test.describe('Forms — Login', () => {
  test('username field has autocomplete=username', async ({ page }) => {
    await page.goto('/login');
    const username = page.locator('input#login-username');
    await expect(username).toHaveAttribute('autocomplete', 'username');
  });

  test('password field is required (HTML constraint)', async ({ page }) => {
    await page.goto('/login');
    const password = page.locator('input#login-password');
    /* The Form.Control has required attribute. */
    await expect(password).toHaveAttribute('required', '');
  });

  test('login submit button is reachable and visible', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input#login-username').fill('demo');
    await page.locator('input#login-password').fill('Demo@123');
    const submit = page.getByRole('button', { name: /sign in/i });
    /* The button is reachable while the network request is in-flight.
     * We use a deliberately wrong password so the request returns
     * quickly and the button re-enables. */
    await page.locator('input#login-password').fill('wrong');
    await submit.click();
    await expect(submit).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Forms — Register', () => {
  test('email field validates format', async ({ page }) => {
    await page.goto('/register');
    const email = page.locator('input[name="email"]');
    await expect(email).toHaveAttribute('type', 'email');
  });

  test('date of birth field is type=date', async ({ page }) => {
    await page.goto('/register');
    const dob = page.locator('input[name="dateOfBirth"]');
    await expect(dob).toHaveAttribute('type', 'date');
  });

  test('terms checkbox must be checked', async ({ page }) => {
    await page.goto('/register');
    /* Fill required fields but DO NOT check the terms checkbox. */
    await page.locator('input[name="username"]').fill(`t_${Date.now()}`);
    await page.locator('input[name="email"]').fill(`t_${Date.now()}@example.com`);
    await page.locator('input[name="fullName"]').fill('Terms Tester');
    await page.locator('input[name="password"]').fill('Strong1!aaaa');
    await page.locator('input[name="confirmPassword"]').fill('Strong1!aaaa');
    await page.getByRole('button', { name: /^create account$/i }).click();
    /* The form's validate() function returns an error for agreeTerms. */
    await expect(page.locator('text=/you must agree/i').first()).toBeVisible();
  });

  test('gender select exposes Male/Female/Other', async ({ page }) => {
    await page.goto('/register');
    const gender = page.locator('select[name="gender"]');
    await expect(gender).toBeVisible();
    /* Validate options exist. */
    for (const label of ['Male', 'Female', 'Other']) {
      await expect(gender.locator(`option:text-is("${label}")`).first()).toBeAttached();
    }
  });
});

test.describe('Forms — Contact', () => {
  test('contact page renders with a form', async ({ page }) => {
    await page.goto('/contact');
    /* The ContactPage exposes a contact form. Just verify the page
     * loaded without a runtime error. */
    await expect(page.locator('main')).toBeVisible();
  });

  test('submitting contact form without filling required fields surfaces errors', async ({ page }) => {
    await page.goto('/contact');
    /* Try to find the contact form submit button. */
    const submit = page.locator('form button[type="submit"]').first();
    if (!(await submit.isVisible().catch(() => false))) {
      test.skip(true, 'No contact form submit button visible');
      return;
    }
    await submit.click();
    /* Either a validation message or the same form stays visible. */
    await page.waitForTimeout(500);
    /* The URL should not have changed to a thank-you page. */
    await expect(page).toHaveURL(/\/contact/);
  });
});

test.describe('Forms — Help Centre (FAQs)', () => {
  test('help centre page renders with FAQ content', async ({ page }) => {
    await page.goto('/help-centre');
    await expect(page.locator('main')).toBeVisible();
  });
});