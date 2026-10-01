/**
 * Global setup — runs once before any spec file.
 * Performs reachability checks against the running backend + frontend and
 * fails fast if either is down. Also exposes `globalThis.__e2e` constants
 * (API base URL, test credentials) that specs can import via env.
 *
 * Test credentials are intentionally low-privilege so the suite can be
 * run against any environment. Sensitive secrets (real admin passwords,
 * API keys) are NOT baked in here — admin tests use the documented seed
 * account `admin` documented in the project README.
 */
const { request } = require('@playwright/test');

const FRONTEND_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const BACKEND_URL  = process.env.E2E_API_URL  || 'http://localhost:5231';

const TEST_USER = {
  username: 'demo',
  password: 'Demo@123',
};

const TEST_ADMIN = {
  username: 'admin',
  password: 'Admin@123',
};

module.exports = async function globalSetup() {
  globalThis.__e2e = {
    FRONTEND_URL,
    BACKEND_URL,
    TEST_USER,
    TEST_ADMIN,
  };  /* Probe backend healthz — fail the suite immediately if unreachable
   * rather than waiting for spec files to time out one by one. */
  const ctx = await request.newContext({ baseURL: BACKEND_URL });
  try {
    const resp = await ctx.get('/healthz', { timeout: 10_000 });
    if (!resp.ok()) {
      throw new Error(`Backend healthz returned ${resp.status()} at ${BACKEND_URL}/healthz`);
    }
  } catch (err) {
    throw new Error(
      `Backend is not reachable at ${BACKEND_URL}.\n` +
      `  Start it with: dotnet run --project src/WebApi/GiveAID.V2.WebApi.csproj\n` +
      `  Original error: ${err.message}`
    );
  } finally {
    await ctx.dispose();
  }

  /* Probe frontend — a HEAD request returns headers without rendering. */
  try {
    const resp = await fetch(FRONTEND_URL, { method: 'HEAD' });
    if (!resp.ok && resp.status !== 304) {
      throw new Error(`Frontend at ${FRONTEND_URL} returned ${resp.status()}`);
    }
  } catch (err) {
    throw new Error(
      `Frontend is not reachable at ${FRONTEND_URL}.\n` +
      `  Start it with: cd GiveAID.Client && npm start\n` +
      `  Original error: ${err.message}`
    );
  }
};