/**
 * Helpers that talk to the backend API directly so test setup is fast and
 * doesn't depend on UI quirks. Each helper resolves with the data the UI
 * stores after a real login (token + user object).
 *
 * SECURITY NOTE: This file embeds the documented seed credentials only.
 * It does NOT contain API keys, real customer passwords, or any other
 * sensitive material. The seed credentials are public — they're listed
 * in the project README — and exist for local development.
 */
const { request } = require('@playwright/test');

const BACKEND_URL = process.env.E2E_API_URL || 'http://localhost:5231';

const CREDS = {
  user: {
    username: 'demo',
    password: 'Demo@123',
  },
  admin: {
    username: 'admin',
    password: 'Admin@123',
  },
};

/**
 * Authenticate against the real backend and return the unwrapped token
 * + user payload that the React app stores in localStorage.
 *
 * The login endpoint returns the canonical envelope `{success, message,
 * data:{token, userId, ...}}` (api.js strips the envelope client-side
 * via an interceptor; on the wire the envelope is still present).
 *
 * The backend applies a 100 req/min/IP rate limit. We retry once after
 * a short backoff if the server responds 429 to keep the test suite
 * resilient under parallel execution.
 */
async function loginViaApi(kind = 'user') {
  const creds = CREDS[kind];
  if (!creds) throw new Error(`Unknown user kind: ${kind}`);

  const ctx = await request.newContext({ baseURL: BACKEND_URL });
  try {
    let resp;
    for (let attempt = 0; attempt < 3; attempt++) {
      resp = await ctx.post('/api/v1/auth/login', { data: creds });
      if (resp.status() !== 429) break;
      /* Exponential backoff: 1s, 2s. */
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok() || body.success === false) {
      throw new Error(
        `Login as ${kind} failed: ${resp.status()} — ${body.message || 'no message'}`
      );
    }
    const data = body.data || {};
    if (!data.token) {
      throw new Error(`Login as ${kind} returned no token`);
    }
    const user = {
      userId: data.userId,
      username: data.username,
      email: data.email,
      role: data.role,
      fullName: data.fullName || data.username,
    };
    return { token: data.token, user, raw: data };
  } finally {
    await ctx.dispose();
  }
}

/**
 * Fetch a JSON endpoint as the given user (or unauthenticated if no kind).
 * Returns the parsed body (envelope-stripped — caller sees `data`).
 */
async function apiGet(path, { kind } = {}) {
  const headers = {};
  if (kind) {
    const { token } = await loginViaApi(kind);
    headers.Authorization = `Bearer ${token}`;
  }
  const ctx = await request.newContext({ baseURL: BACKEND_URL, extraHTTPHeaders: headers });
  try {
    const resp = await ctx.get(`/api/v1${path}`);
    const body = await resp.json().catch(() => ({}));
    return { status: resp.status(), body, ok: resp.ok() };
  } finally {
    await ctx.dispose();
  }
}

/**
 * Wait until the dev server frontend has hot-reloaded by retrying until
 * `predicate` returns truthy or we run out of attempts.
 */
async function waitFor(predicate, { timeout = 10_000, interval = 250 } = {}) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try {
      const result = await predicate();
      if (result) return result;
      last = result;
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`waitFor timed out after ${timeout}ms: ${last}`);
}

module.exports = {
  BACKEND_URL,
  CREDS,
  loginViaApi,
  apiGet,
  waitFor,
};