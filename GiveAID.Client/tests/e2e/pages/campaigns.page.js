/**
 * Page Object Model for the Campaigns listing page.
 *
 * The page lists campaigns with: a search box, a cause filter, a status
 * filter, a Reset button, and a grid of clickable campaign items that open
 * `/campaigns/:id` detail pages.
 */
const { expect } = require('@playwright/test');

class CampaignsPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /help give every child/i });
    /* Search box — Bootstrap InputGroup renders it as a plain text input. */
    this.search = page.getByPlaceholder(/search campaigns/i);
    /* Filters — select elements. */
    this.causeFilter = page.locator('.cp-filter-select').nth(0);
    this.statusFilter = page.locator('.cp-filter-select').nth(1);
    this.resetBtn = page.locator('button.cp-reset-btn');
    /* Featured + grid items. Each card title lives in `.cp-card-title`. */
    this.cardTitle = page.locator('.cp-card-title');
    this.viewCampaignButtons = page.locator('a:has-text("View Campaign")');
    this.donateButtons = page.locator('a:has-text("Donate")');
    this.error = page.locator('.cp-error');
    this.emptyState = page.locator('.cp-empty');
    /* Pagination — only renders if totalCount > pageSize. */
    this.pagination = page.locator('.cp-pagination');
  }

  async visit() {
    await this.page.goto('/campaigns');
    await this.page.waitForLoadState('networkidle');
  }

  async search(text) {
    await this.search.fill(text);
    await this.search.press('Enter');
  }

  async filterByCause(label) {
    await this.causeFilter.selectOption({ label });
  }

  async filterByStatus(value) {
    await this.statusFilter.selectOption(value);
  }

  async reset() {
    await this.resetBtn.click();
  }

  async openFirstCampaign() {
    const first = this.viewCampaignButtons.first();
    await expect(first).toBeVisible({ timeout: 10_000 });
    await first.click();
  }

  async expectHasCards() {
    await expect(this.cardTitle.first()).toBeVisible({ timeout: 10_000 });
  }
}

module.exports = { CampaignsPage };