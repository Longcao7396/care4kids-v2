/**
 * Shared fixtures: an authenticated user context and an authenticated admin
 * context. We do NOT store tokens — each fixture logs in fresh per test
 * so tests don't share state. To run as admin we hit the backend login
 * endpoint directly (bypassing the UI) for speed and so a single failed
 * UI login doesn't take the entire admin suite down with it.
 */
const { test: base, expect } = require('@playwright/test');
const { loginViaApi } = require('../helpers/api-helpers');

/**
 * Test that comes with a `userPage` — a page already authenticated as the
 * regular user via API token injection into localStorage. Use this for
 * tests that need a logged-in donor but don't care about the login UI.
 */
const test = base.extend({
  userPage: async ({ page }, use) => {
    const { token, user } = await loginViaApi('user');
    await page.addInitScript(
      ([t, u]) => {
        window.localStorage.setItem('giveaid_token', t);
        window.localStorage.setItem('giveaid_user', JSON.stringify(u));
      },
      [token, user]
    );
    await use(page);
  },

  /**
   * Admin context: logs in as the seeded admin and exposes the token to
   * any helper that wants to bypass the UI. The page is also pre-loaded
   * with admin credentials so visiting `/admin` works without redirect.
   */
  adminPage: async ({ page }, use) => {
    const { token, user } = await loginViaApi('admin');
    await page.addInitScript(
      ([t, u]) => {
        window.localStorage.setItem('giveaid_token', t);
        window.localStorage.setItem('giveaid_user', JSON.stringify(u));
      },
      [token, user]
    );
    await use(page);
  },
});

module.exports = { test, expect };