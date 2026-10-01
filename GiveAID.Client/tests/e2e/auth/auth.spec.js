/**
 * Authentication tests — login form, registration form, validation, and
 * route protection. We exercise the UI end-to-end so the page objects
 * can verify what a real user sees.
 */
const { test, expect } = require('../fixtures/auth.fixture');
const { LoginPage } = require('../pages/login.page');
const { RegisterPage } = require('../pages/register.page');
const { CREDS } = require('../helpers/api-helpers');
const TEST_USER = CREDS.user;
const TEST_ADMIN = CREDS.admin;

test.describe('Authentication — login', () => {
  test('shows the login page with all form fields', async ({ page }) => {
    const login = new LoginPage(page);
    await login.visit();
    await expect(login.username).toBeVisible();
    await expect(login.password).toBeVisible();
    await expect(login.submit).toBeVisible();
  });

  test('login with empty fields surfaces a validation error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.visit();
    await login.submitForm();
    await login.expectError(/please enter your username and password/i);
  });

  test('login with wrong password shows an error and stays on /login', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login({ username: TEST_USER.username, password: 'definitely-wrong-999' });
    await login.expectError(/invalid username or password|login failed/i);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login with non-existent username shows an error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login({
      username: `ghost_${Date.now()}`,
      password: 'Whatever123!',
    });
    await login.expectError(/invalid|login failed/i);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login with valid user credentials redirects to dashboard', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login({ username: TEST_USER.username, password: TEST_USER.password });
    /* The LoginPage redirects to location.state.from || /dashboard. */
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  });

  test('login with valid admin credentials redirects to dashboard', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login({ username: TEST_ADMIN.username, password: TEST_ADMIN.password });
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  });

  test('login from /donate bounces back to /donate after auth', async ({ page }) => {
    /* Visit /donate while anonymous — ProtectedRoute should redirect to
     * /login with state.from = /donate. */
    await page.goto('/donate');
    await expect(page).toHaveURL(/\/login/);
    const login = new LoginPage(page);
    /* The username field should already be visible — ProtectedRoute is
     * fast; if for some reason we landed on /donate (token already
     * cached), bail. */
    if (!(await login.username.isVisible().catch(() => false))) {
      test.skip(true, 'Already authenticated; cannot test redirect loop');
      return;
    }
    await login.fill({ username: TEST_USER.username, password: TEST_USER.password });
    await login.submitForm();
    await expect(page).toHaveURL(/\/donate$/, { timeout: 15_000 });
  });

  test('show/hide password toggle works', async ({ page }) => {
    const login = new LoginPage(page);
    await login.visit();
    await login.password.fill('something');
    /* Default type is "password". */
    await expect(login.password).toHaveAttribute('type', 'password');
    await login.passwordToggle.click();
    await expect(login.password).toHaveAttribute('type', 'text');
    await login.passwordToggle.click();
    await expect(login.password).toHaveAttribute('type', 'password');
  });

  test('sign-up link navigates to /register', async ({ page }) => {
    const login = new LoginPage(page);
    await login.visit();
    await login.signUpLink.click();
    await expect(page).toHaveURL(/\/register$/);
  });
});

test.describe('Authentication — register', () => {
  test('shows the register page with all required fields', async ({ page }) => {
    const reg = new RegisterPage(page);
    await reg.visit();
    await expect(reg.username).toBeVisible();
    await expect(reg.email).toBeVisible();
    await expect(reg.fullName).toBeVisible();
    await expect(reg.password).toBeVisible();
    await expect(reg.confirmPassword).toBeVisible();
    await expect(reg.submit).toBeVisible();
  });

  test('empty submit surfaces multiple validation errors', async ({ page }) => {
    const reg = new RegisterPage(page);
    await reg.visit();
    await reg.submitForm();
    /* The form has client-side validation in JS — verify the user sees
     * the field-error markers. */
    await expect(reg.fieldError.first()).toBeVisible();
  });

  test('password without required complexity is rejected', async ({ page }) => {
    const reg = new RegisterPage(page);
    await reg.visit();
    await reg.fill({
      username: `qa_${Date.now()}`,
      email: `qa_${Date.now()}@example.com`,
      fullName: 'QA User',
      password: 'simple',
      confirmPassword: 'simple',
    });
    await reg.submitForm();
    /* The validate() function in RegisterPage.js flags passwords shorter
     * than 8 chars. */
    await expect(page.locator('text=/at least 8 characters/i').first()).toBeVisible();
  });

  test('password mismatch shows confirm-password error', async ({ page }) => {
    const reg = new RegisterPage(page);
    await reg.visit();
    await reg.fill({
      username: `qa_${Date.now()}`,
      email: `qa_${Date.now()}@example.com`,
      fullName: 'Mismatch User',
      password: 'Strong1!aaaa',
      confirmPassword: 'Strong1!bbbb',
    });
    await reg.submitForm();
    await expect(page.locator('text=/passwords do not match/i').first()).toBeVisible();
  });

  test('duplicate username is rejected by the backend', async ({ page }) => {
    /* Use the well-known seed account name. We give the assertion extra
     * headroom: under parallel test load the backend may rate-limit
     * /auth/register at 20 req/min/IP, causing a brief 429 retry window
     * before the duplicate-detection alert surfaces. */
    const reg = new RegisterPage(page);
    await reg.visit();
    await reg.fill({
      username: TEST_USER.username, // taken
      email: `dup_${Date.now()}@example.com`,
      fullName: 'Duplicate',
      password: 'Strong1!aaaa',
      confirmPassword: 'Strong1!aaaa',
    });
    await reg.submitForm();
    /* The success alert would say "Account created…"; the failure alert
     * says something else. We accept either the duplicate-username
     * message or the rate-limit message because both indicate the
     * registration was NOT accepted by the backend. */
    await expect(reg.alert).toBeVisible({ timeout: 30_000 });
    await expect(reg.alert).not.toContainText(/account created/i);
    await expect(page).toHaveURL(/\/register$/);
  });
});

test.describe('Authentication — protected routes', () => {
  test('anonymous user is redirected from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('anonymous user is redirected from /my-donations to /login', async ({ page }) => {
    await page.goto('/my-donations');
    await expect(page).toHaveURL(/\/login/);
  });

  test('anonymous user is redirected from /admin to /login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('non-admin user cannot access /admin (role guard)', async ({ userPage: page }) => {
    await page.goto('/admin');
    /* ProtectedRoute sends non-admins to /dashboard. */
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  });

  test('admin user CAN access /admin', async ({ adminPage: page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  });
});

test.describe('Authentication — logout', () => {
  test('user can log out via navbar dropdown', async ({ page }) => {
    /* Authenticate via API + clear init-script token-injection trick —
     * we need to be sure that after logout the token is genuinely gone. */
    const { loginViaApi } = require('../helpers/api-helpers');
    const { token, user } = await loginViaApi('user');
    await page.addInitScript(
      ([t, u]) => {
        window.localStorage.setItem('giveaid_token', t);
        window.localStorage.setItem('giveaid_user', JSON.stringify(u));
      },
      [token, user]
    );

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
    /* Open the avatar dropdown. */
    await page.locator('#c4k-user-dropdown').click();
    await page.getByRole('button', { name: /^logout$/i }).click();
    /* After logout the navbar navigates to "/". */
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
    /* Token should be cleared from localStorage. */
    const stored = await page.evaluate(() => localStorage.getItem('giveaid_token'));
    expect(stored, 'token must be cleared after logout').toBeNull();
  });
});