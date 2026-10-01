/**
 * Admin tests — verify the admin shell loads, navigation works, role
 * guard is in effect, and CRUD pages render without runtime errors.
 *
 * We deliberately avoid mutating production data: this suite only
 * reads/visits pages. Tests that would create or delete entities are
 * skipped (the seed database is shared with the developer's local dev
 * workflow). CRUD smoke tests run in the unit/integration tests
 * (tests/Application.UnitTests).
 */
const { test, expect } = require('../fixtures/auth.fixture');
const { AdminPage } = require('../pages/admin.page');

const ADMIN_PAGES = [
  { path: '/admin', name: 'Dashboard' },
  { path: '/admin/campaigns', name: 'Campaigns' },
  { path: '/admin/donations', name: 'Donations' },
  { path: '/admin/users', name: 'Users' },
  { path: '/admin/partners', name: 'Partners & NGOs' },
  { path: '/admin/gallery', name: 'Gallery' },
  { path: '/admin/achievements', name: 'Achievements' },
  { path: '/admin/cms', name: 'CMS Pages' },
  { path: '/admin/queries', name: 'User Queries' },
  { path: '/admin/contacts', name: 'Contact Messages' },
  { path: '/admin/invitations', name: 'Invitations' },
  { path: '/admin/campaign-reports', name: 'Reports' },
];

test.describe('Admin — access control', () => {
  test('anonymous user redirected to /login when accessing /admin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('regular user redirected away from /admin to /dashboard', async ({ userPage: page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  });

  test('admin user lands on dashboard with no errors', async ({ adminPage: page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    /* Dashboard renders inside .al-content — verify no visible
     * client-side error boundary / blank page. */
    await expect(page.locator('.al-content')).toBeVisible();
  });
});

test.describe('Admin — pages render without runtime errors', () => {
  /* Run serially: each test creates a new admin session via the API.
   * With 4 parallel workers we exhaust the backend's 100 req/min/IP
   * rate limit on /api/v1/auth/login. */
  test.describe.configure({ mode: 'serial' });

  for (const { path, name } of ADMIN_PAGES) {
    test(`${path} (${name}) renders`, async ({ adminPage: page }) => {
      await page.goto(path);
      /* Wait for the page to settle — some admin pages fire 1-2 GETs. */
      await page.waitForLoadState('networkidle');
      /* Verify the content area has some non-empty children — a fully
       * blank content area usually means a runtime error rendered an
       * empty <Outlet />. */
      const hasContent = await page.locator('.al-content > *').count();
      expect(hasContent, `${name} must render content`).toBeGreaterThan(0);
      /* The breadcrumb should reflect the current page. */
      await expect(page.locator('.al-breadcrumb-current')).toContainText(new RegExp(name, 'i'));
    });
  }
});

test.describe('Admin — navigation', () => {
  test('sidebar links navigate between admin pages', async ({ adminPage: page }) => {
    const admin = new AdminPage(page);
    await admin.goto('/admin');
    await admin.clickLink('Campaigns');
    await expect(page).toHaveURL(/\/admin\/campaigns$/);
    await admin.clickLink('Users');
    await expect(page).toHaveURL(/\/admin\/users$/);
  });

  test('"Back to site" navigates to /dashboard', async ({ adminPage: page }) => {
    const admin = new AdminPage(page);
    await admin.goto('/admin');
    await admin.backToPublicSite();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe('Admin — sign out', () => {
  test('admin can sign out via the user menu', async ({ adminPage: page }) => {
    const admin = new AdminPage(page);
    await admin.goto('/admin');
    await admin.signOutNow();
    /* After logout admin redirects to /login. */
    await expect(page).toHaveURL(/\/login/);
  });
});