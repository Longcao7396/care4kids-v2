/**
 * Page Object Model for the Admin shell.
 *
 * `adminPage` fixture (see fixtures/auth.fixture.js) already seeds a
 * valid token into localStorage before the page loads, so visiting
 * /admin lands on the dashboard directly. The sidebar links to the
 * other admin pages; we use role/label lookups to be resilient to
 * minor wording changes.
 */
const { expect } = require('@playwright/test');

class AdminPage {
  constructor(page) {
    this.page = page;
    /* Sidebar uses <NavLink> with classes al-nav-link / al-nav-label. */
    this.sidebar = page.locator('.al-sidebar');
    this.brand = page.locator('.al-brand-logo');
    this.userMenuTrigger = page.locator('#al-user-dd');
    this.signOut = page.getByRole('button', { name: /sign out/i });
    this.backToSite = page.getByRole('button', { name: /back to site/i });
    /* Sidebar nav links — labels visible to the user. */
    this.link = (name) => this.sidebar.getByRole('link', { name: new RegExp(`^${name}$`, 'i') });
    this.menuButton = page.getByRole('button', { name: /open navigation/i });
    this.breadcrumb = page.locator('.al-breadcrumb');
    this.body = page.locator('.al-content');
  }

  async goto(path = '/admin') {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async clickLink(name) {
    await this.link(name).first().click();
  }

  async expectOnPage(name) {
    await expect(this.link(name).first()).toHaveClass(/is-active/);
  }

  async openUserMenu() {
    await this.userMenuTrigger.click();
  }

  async signOutNow() {
    await this.openUserMenu();
    await this.signOut.click();
  }

  async backToPublicSite() {
    await this.backToSite.click();
  }
}

module.exports = { AdminPage };