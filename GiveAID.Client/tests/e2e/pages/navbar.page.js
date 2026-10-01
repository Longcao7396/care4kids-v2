/**
 * Page Object Model for the navbar — centralises selectors so individual
 * tests can use plain-English verbs like `clickCampaigns()` instead of
 * copying fragile selectors.
 *
 * Selectors use role/label/text where possible to stay resilient to
 * CSS reworks. Anything data-testid based would require modifying
 * production components; we avoid that.
 */
const { expect } = require('@playwright/test');

class NavbarPage {
  constructor(page) {
    this.page = page;
    /* The brand is an `<img>` inside an `<a>` link to "/". */
    this.brand = page.locator('.c4k-brand-logo');
    /* Public nav links (visible to anonymous + logged-in users). */
    this.home = page.getByRole('link', { name: /^home$/i }).first();
    this.campaigns = page.getByRole('link', { name: /^campaigns$/i }).first();
    this.gallery = page.getByRole('link', { name: /^gallery$/i }).first();
    this.about = page.getByRole('link', { name: /^about$/i }).first();
    this.partners = page.getByRole('link', { name: /^our partners$/i }).first();
    this.helpCentre = page.getByRole('link', { name: /^help centre$/i }).first();
    this.contact = page.getByRole('link', { name: /^contact$/i }).first();
    /* Auth controls. */
    this.login = page.getByRole('link', { name: /^login$/i }).first();
    this.register = page.getByRole('link', { name: /^register$/i }).first();
    this.donate = page.getByRole('link', { name: /^donate$/i }).first();
    /* Mobile menu toggle — only present when navbar collapses. */
    this.toggle = page.locator('.c4k-toggler');
  }

  async expectVisible() {
    await expect(this.brand).toBeVisible();
  }

  async goHome() {
    await this.home.click();
  }
  async goCampaigns() {
    await this.campaigns.click();
  }
  async goGallery() {
    await this.gallery.click();
  }
  async goAbout() {
    await this.about.click();
  }
  async goContact() {
    await this.contact.click();
  }
  async goDonate() {
    await this.donate.first().click();
  }
}

module.exports = { NavbarPage };