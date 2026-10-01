/**
 * Page Object Model for the Register page.
 * The form is fairly long — username, email, full name, password,
 * confirm password, phone, profession, address, date of birth, gender,
 * and a terms checkbox. The submit button reads "Create Account".
 *
 * Labels in the Register form use the asterisks for required fields,
 * which makes `getByLabel('Username')` non-unique. We pin locators to
 * the input `id`s the production code emits (no test-id additions).
 */
const { expect } = require('@playwright/test');

class RegisterPage {
  constructor(page) {
    this.page = page;
    this.title = page.getByRole('heading', { name: /create your account/i });
    this.username = page.locator('input[name="username"]');
    this.email = page.locator('input[name="email"]');
    this.fullName = page.locator('input[name="fullName"]');
    this.password = page.locator('input[name="password"]');
    this.confirmPassword = page.locator('input[name="confirmPassword"]');
    this.phone = page.locator('input[name="phone"]');
    this.profession = page.locator('input[name="profession"]');
    this.address = page.locator('input[name="address"]');
    this.dateOfBirth = page.locator('input[name="dateOfBirth"]');
    this.gender = page.locator('select[name="gender"]');
    this.agreeTerms = page.locator('input[name="agreeTerms"]');
    this.submit = page.getByRole('button', { name: /^create account$/i });
    this.alert = page.locator('.auth-alert');
    /* Per-field validation errors rendered as <div class="auth-field-error"> */
    this.fieldError = page.locator('.auth-field-error');
  }

  async visit() {
    await this.page.goto('/register');
    await expect(this.title).toBeVisible();
  }

  async fill({
    username, email, fullName, password, confirmPassword,
    phone, profession, address, dateOfBirth, gender, agreeTerms = true,
  }) {
    if (username != null) await this.username.fill(username);
    if (email != null) await this.email.fill(email);
    if (fullName != null) await this.fullName.fill(fullName);
    if (password != null) await this.password.fill(password);
    if (confirmPassword != null) await this.confirmPassword.fill(confirmPassword);
    if (phone != null) await this.phone.fill(phone);
    if (profession != null) await this.profession.fill(profession);
    if (address != null) await this.address.fill(address);
    if (dateOfBirth != null) await this.dateOfBirth.fill(dateOfBirth);
    if (gender != null) await this.gender.selectOption(gender);
    if (agreeTerms) await this.agreeTerms.check();
  }

  async submitForm() {
    await this.submit.click();
  }

  async expectError(text) {
    await expect(this.alert).toBeVisible();
    if (text) await expect(this.alert).toContainText(text);
  }
}

module.exports = { RegisterPage };