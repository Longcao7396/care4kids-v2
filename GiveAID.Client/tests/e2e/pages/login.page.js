/**
 * Page Object Model for the Login page.
 *
 * The form has username + password fields, a "remember me" checkbox,
 * a show/hide password toggle, and a submit button. It also surfaces
 * an error alert when login fails.
 */
const { expect } = require('@playwright/test');

class LoginPage {
  constructor(page) {
    this.page = page;
    this.title = page.getByRole('heading', { name: /welcome back/i });
    /* Use getByRole with textbox role scoped to the form to disambiguate
     * from the password-toggle button which has a similar accessible name. */
    this.username = page.locator('input#login-username');
    this.password = page.locator('input#login-password');
    this.rememberMe = page.getByLabel(/remember me/i);
    this.submit = page.getByRole('button', { name: /^sign in$/i });
    this.errorAlert = page.locator('.auth-alert');
    this.passwordToggle = page.getByRole('button', { name: /show password|hide password/i });
    this.signUpLink = page.getByRole('link', { name: /^sign up$/i });
  }

  async visit() {
    await this.page.goto('/login');
    await expect(this.title).toBeVisible();
  }

  async fill({ username, password, rememberMe = false }) {
    await this.username.fill(username);
    await this.password.fill(password);
    if (rememberMe) await this.rememberMe.check();
  }

  async submitForm() {
    await this.submit.click();
  }

  async login({ username, password }) {
    await this.visit();
    await this.fill({ username, password });
    await this.submitForm();
  }

  async expectError(text) {
    await expect(this.errorAlert).toBeVisible();
    if (text) await expect(this.errorAlert).toContainText(text);
  }
}

module.exports = { LoginPage };