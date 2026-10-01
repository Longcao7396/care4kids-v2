/**
 * Playwright configuration for GiveAID Client e2e tests.
 *
 * Targets:
 *   - Frontend (React dev server): http://localhost:3000
 *   - Backend  (ASP.NET Core API) : http://localhost:5231
 *
 * The webServer block assumes both are already running (started manually
 * via `npm start` or `dotnet run`). Set PLAYWRIGHT_NO_WEBSERVER=1 to skip
 * the reachability check; PLAYWRIGHT_LAUNCH_WEBSERVER=1 to delegate to
 * Playwright (only the frontend is launched — the backend is independent).
 */

const path = require('node:path');

const FRONTEND_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const BACKEND_URL  = process.env.E2E_API_URL  || 'http://localhost:5231';

const launchWebServer = process.env.PLAYWRIGHT_LAUNCH_WEBSERVER === '1';

module.exports = {
  testDir: path.join(__dirname, 'tests/e2e'),
  testMatch: /.*\.spec\.js/,
  /* Output & timeout defaults tuned for a React app talking to a real API. */
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list']],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    /* Network: tolerate image failures (Cloudinary etc.) */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    extraHTTPHeaders: { 'x-e2e-runner': 'playwright' },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', viewport: { width: 1366, height: 768 } },
    },
  ],
  /* Don't auto-launch the servers — they're started out-of-band so tests
   * can target the same instance across runs (and so the dev workflow
   * matches reality: backend on :5231, frontend on :3000). */
  webServer: launchWebServer
    ? {
        command: 'npx --yes http-server build -p 3000 --silent',
        url: FRONTEND_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
  /* Test-only API base URL exposed via env helper. */
  globalSetup: require.resolve('./tests/e2e/helpers/global-setup.js'),
};