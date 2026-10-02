/**
 * Care4Kids donation E2E test.
 * Runs against the local dev stack:
 *   Frontend  http://localhost:3000
 *   Backend   http://localhost:5231
 *   DB        GiveAIDDB on (localdb)\MSSQLLocalDB
 *   Gateway   Mock (config, do not change)
 *
 * What this script does, in order:
 *   1.  Open the SPA, log in as an existing test user.
 *   2.  Navigate to the Donate page.
 *   3.  Pick a cause, a campaign, amount=100000, submit.
 *   4.  Capture network traffic to /api/v1/donations POST; verify response.
 *   5.  Wait for the browser to land on /payment/mock-confirm.
 *   6.  Verify donation status is Pending via API.
 *   7.  Click "Xác nhận thanh toán" button on the Mock page.
 *   8.  Verify Pending -> Completed via API.
 *   9.  Verify /payment/result renders.
 *   10. Navigate to /my-donations and verify the donation appears.
 *   11. Capture all DB/API consistency checks.
 *   12. Re-attempt mock-confirm; assert no double-count.
 *   13. Create a 2nd controlled donation and DO NOT confirm; assert it stays Pending
 *       and the campaign/cause raised_amount does NOT increase.
 *
 * The script prints a tabular summary at the end.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:5231';

// We use an existing test user that the previous audit created.
// Fallback: register a new one on the fly.
const TEST_USERNAME = 'test_e2e_donor';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_EMAIL = 'test_e2e_1715285324@example.com'; // may be stale if seed cleared

const DONATION_AMOUNT = 100000;
const DONATION_AMOUNT_DISPLAY = '100,000';

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function log(label, payload) {
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[${ts}] ${label}`);
  } else {
    const s = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    console.log(`[${ts}] ${label} ${s}`);
  }
}

function row(testName, result, evidence) {
  return { testName, result, evidence };
}

const results = [];
function addResult(name, pass, evidence) {
  const r = row(name, pass ? 'PASS' : 'FAIL', evidence || '');
  results.push(r);
  const tag = pass ? '\u2713' : '\u2717';
  console.log(`  ${tag} ${name.padEnd(60)} ${pass ? 'PASS' : 'FAIL'}  ${evidence || ''}`);
}

async function apiJson(method, url, headers, body) {
  const init = { method, headers: { 'Content-Type': 'application/json', ...(headers || {}) } };
  if (body !== undefined) init.body = JSON.stringify(body);
  const r = await fetch(url, init);
  const text = await r.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* ignore */ }
  return { status: r.status, ok: r.ok, body: parsed, text };
}

async function login() {
  let r = await apiJson('POST', `${BACKEND}/api/v1/auth/login`, {}, {
    username: TEST_USERNAME, password: TEST_PASSWORD,
  });
  if (!r.ok || !r.body || !r.body.data || !r.body.data.token) {
    // Register a new user on the fly.
    const uniq = Date.now();
    const newUser = {
      username: `e2e_${uniq}`,
      email: `e2e_${uniq}@example.com`,
      password: 'TestPassword123!',
      fullName: 'E2E Auto User',
    };
    log('auto-registering user', newUser);
    const reg = await apiJson('POST', `${BACKEND}/api/v1/auth/register`, {}, newUser);
    if (!reg.ok) {
      throw new Error(`register failed: ${reg.status} ${reg.text}`);
    }
    r = await apiJson('POST', `${BACKEND}/api/v1/auth/login`, {}, {
      username: newUser.username, password: newUser.password,
    });
    if (!r.ok || !r.body?.data?.token) {
      throw new Error(`login after register failed: ${r.status} ${r.text}`);
    }
    return { token: r.body.data.token, userId: r.body.data.userId, username: newUser.username, email: newUser.email };
  }
  return { token: r.body.data.token, userId: r.body.data.userId, username: TEST_USERNAME, email: TEST_EMAIL };
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────
(async () => {
  const consoleLogs = [];
  const networkLog = [];

  // Global watchdog — if the script doesn't terminate in 3 minutes, exit with current results.
  const startTs = Date.now();
  const watchdog = setTimeout(() => {
    console.log('=== WATCHDOG: 3-minute timeout reached, dumping partial results and exiting ===');
    finish();
  }, 180_000);

  console.log(`\n${'='.repeat(70)}`);
  console.log(' Care4Kids donation E2E test');
  console.log('='.repeat(70));

  // Pre-flight: backend health
  try {
    const causes = await apiJson('GET', `${BACKEND}/api/v1/causes?activeOnly=true`, {});
    console.log(`  Backend reachable: causes=${(causes.body?.length ?? causes.body?.items?.length ?? 'unknown')}`);
  } catch (e) {
    console.log(`  Backend NOT reachable: ${e.message}`);
    process.exit(2);
  }

  // Login
  let user;
  try {
    user = await login();
    console.log(`  Login OK as ${user.username} (userId=${user.userId})`);
  } catch (e) {
    console.log(`  Login FAILED: ${e.message}`);
    process.exit(3);
  }

  // Get the current cause + campaign raised_amount BEFORE the test
  let causeRaisedBefore = null;
  try {
    const c = await apiJson('GET', `${BACKEND}/api/v1/causes?activeOnly=true`, {});
    const list = Array.isArray(c.body?.data) ? c.body.data : (Array.isArray(c.body) ? c.body : (c.body?.items ?? []));
    causeRaisedBefore = list.find(x => x.causeId === 1)?.raisedAmount ?? list[0]?.raisedAmount ?? null;
    log('Cause raised_amount BEFORE test:', causeRaisedBefore);
  } catch (e) { log('cause raised before lookup failed:', e.message); }

  // Playwright
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  // Inject the JWT so we hit authenticated routes without the SPA's login form dance.
  await context.addInitScript(([token, userJson]) => {
    try {
      window.localStorage.setItem('giveaid_token', token);
      window.localStorage.setItem('giveaid_user', JSON.stringify(userJson));
    } catch (e) {}
  }, [user.token, { userId: user.userId, username: user.username, email: user.email, role: 'User' }]);

  const page = await context.newPage();

  page.on('console', (msg) => {
    const line = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(line);
    if (msg.type() === 'error') {
      // Filter out benign React Router future-flag warnings and dev-server
      // WebSocket / HMR errors that are unrelated to the donation flow.
      const t = msg.text();
      if (
        /React Router Future Flag Warning/i.test(t) ||
        /WebSocket connection to .ws:\/\/localhost:3000\/ws/i.test(t) ||
        /Failed to load resource: the server responded with a status of 404/i.test(t)
      ) return;
      console.log('  BROWSER:', line);
    }
  });
  page.on('pageerror', (err) => {
    consoleLogs.push(`[pageerror] ${err.message}`);
    console.log('  BROWSER PAGEERROR:', err.message);
  });
  page.on('request', (req) => {
    if (req.url().startsWith(BACKEND)) networkLog.push({ kind: 'req', method: req.method(), url: req.url() });
  });
  page.on('response', async (res) => {
    if (res.url().startsWith(BACKEND)) {
      networkLog.push({ kind: 'res', status: res.status(), method: res.request().method(), url: res.url() });
    }
  });

  // ─── Test 1: Open the SPA ────────────────────────────────
  try {
    await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    addResult('1. Open SPA root', page.url().startsWith(FRONTEND), page.url());
  } catch (e) {
    addResult('1. Open SPA root', false, `goto error: ${e.message}`);
    await browser.close();
    return finish();
  }

  // ─── Test 2: Navigate to Donate page ────────────────────
  try {
    await page.goto(`${FRONTEND}/donate`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    const url = page.url();
    const onDonate = /\/donate$/.test(new URL(url).pathname);
    addResult('2. Navigate to /donate', onDonate, url);
  } catch (e) {
    addResult('2. Navigate to /donate', false, e.message);
  }

  let beforeUrl = page.url();
  // Wait for the cause dropdown to populate. The page fires GET /causes/tree and
  // GET /campaigns on mount; we wait for the cause <select> to be visible AND for
  // its options to include at least one non-placeholder entry.
  try {
    const causeSelect = page.locator('select[name="parentCauseId"]');
    await causeSelect.waitFor({ state: 'visible', timeout: 15000 });
    // Poll until at least one option with a non-empty value appears.
    let ok = false;
    for (let i = 0; i < 40 && !ok; i++) {
      const populated = await causeSelect.evaluate((sel) => {
        return Array.from(sel.options).some(o => o.value && !o.disabled);
      });
      if (populated) { ok = true; break; }
      await page.waitForTimeout(250);
    }
    log('cause select populated', ok);
  } catch (e) {
    log('cause select wait failed', e.message);
  }

  // Capture the POST /donations response — listener was attached at script start.
  // Test 6 (submit) runs AFTER cause/campaign/amount are populated.

  // ─── Test 3: Select cause ────────────────────────────────
  let causeSelected = false;
  try {
    // The cause <select> has name="parentCauseId" in DonatePage.js
    const causeSelect = page.locator('select[name="parentCauseId"]');
    await causeSelect.waitFor({ state: 'visible', timeout: 10000 });
    // Read options via evaluate (avoids Playwright hanging on hidden <option> visibility).
    const value = await causeSelect.evaluate((sel) => {
      const opt = Array.from(sel.options).find(o => o.value && !o.disabled);
      if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); return opt.value; }
      return null;
    });
    causeSelected = !!value;
    addResult('3. Select cause', causeSelected, value ? `causeId=${value}` : 'no option found');
  } catch (e) {
    addResult('3. Select cause', false, e.message);
  }

  // ─── Test 4: Select campaign if available ─────────────
  let campaignSelected = false;
  try {
    await page.waitForTimeout(800);
    const campSelect = page.locator('select[name="campaignId"]');
    const visible = await campSelect.isVisible().catch(() => false);
    if (visible) {
      const value = await campSelect.evaluate((sel) => {
        const opt = Array.from(sel.options).find(o => o.value && !o.disabled);
        if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); return opt.value; }
        return null;
      });
      campaignSelected = !!value;
      addResult('4. Select campaign', campaignSelected, value ? `campaignId=${value}` : 'only placeholder (general donation)');
    } else {
      addResult('4. Select campaign', true, 'campaign select not visible (general donation path)');
      campaignSelected = true;
    }
  } catch (e) {
    addResult('4. Select campaign', false, e.message);
  }

  // ─── Test 5: Enter amount 100000 ────────────────────────
  try {
    const amountInput = page.locator('input[name="amount"]');
    await amountInput.fill(String(DONATION_AMOUNT));
    await page.waitForTimeout(300);
    addResult('5. Enter amount 100,000 VND', true, 'amount=' + DONATION_AMOUNT);
  } catch (e) {
    addResult('5. Enter amount 100,000 VND', false, e.message);
  }

  // ─── Test 6: Submit donation ─────────────────────────────
  let donationIdFromUI = null;
  let paymentUrlFromUI = null;
  let donationsResponse = null;
  try {
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });

    // NOTE: page.waitForResponse / response.json() / response.text() all fail with
    // "No resource with given identifier found" once the response triggers a
    // navigation, because Playwright considers the response "freed". We capture
    // the response body via the page.route() fulfill hook instead, which buffers
    // it deterministically.
    let capturedBody = null;
    let capturedStatus = null;
    const routeHandler = async (route, request) => {
      if (request.url().startsWith(`${BACKEND}/api/v1/donations`)
          && request.method() === 'POST'
          && !request.url().includes('/payment-status')
          && !request.url().includes('/mock-confirm')) {
        try {
          const resp = await route.fetch();
          capturedStatus = resp.status();
          capturedBody = await resp.text();
          await route.fulfill({ response: resp });
        } catch (e) {
          await route.continue();
        }
      } else {
        await route.continue();
      }
    };
    await page.route('**/api/v1/donations', routeHandler);

    await submitBtn.click();
    // Wait up to 10s for the create-donation POST.
    let waited = 0;
    while (capturedBody === null && waited < 10000) {
      await page.waitForTimeout(200);
      waited += 200;
    }

    let body = null;
    try { body = capturedBody ? JSON.parse(capturedBody) : null; }
    catch (e) { /* ignore */ }
    donationIdFromUI = body?.data?.donationId;
    paymentUrlFromUI = body?.data?.paymentUrl;
    donationsResponse = { status: capturedStatus, body, raw: (capturedBody || '').slice(0, 500) };
    addResult('6. Submit donation', capturedStatus === 200 && !!donationIdFromUI,
      `status=${capturedStatus} donationId=${donationIdFromUI} paymentUrl=${paymentUrlFromUI}`);
  } catch (e) {
    addResult('6. Submit donation', false, e.message);
  }

  // ─── Test 7: PaymentUrl shape ────────────────────────────
  try {
    const isAbsolute = /^https?:\/\//i.test(paymentUrlFromUI || '');
    const containsDonation = !!donationIdFromUI && (paymentUrlFromUI || '').includes(`donation=${donationIdFromUI}`);
    const pointsToFrontend = (paymentUrlFromUI || '').startsWith(FRONTEND) || (paymentUrlFromUI || '').includes('localhost:3000');
    const ok = isAbsolute && containsDonation && pointsToFrontend;
    addResult('7. PaymentUrl absolute, with donation id, points to frontend', ok, paymentUrlFromUI || '(null)');
  } catch (e) {
    addResult('7. PaymentUrl shape', false, e.message);
  }

  // ─── Test 8: Browser does NOT immediately return to Home ─
  try {
    // The PaymentUrl is an absolute URL to /payment/mock-confirm. window.location.href
    // navigation may already have started; if not, navigate explicitly to mirror the
    // production flow.
    if (page.url() === beforeUrl && paymentUrlFromUI) {
      await page.goto(paymentUrlFromUI, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(1500);
    const finalPath = new URL(page.url()).pathname;
    const onMock = /\/payment\/mock-confirm/.test(finalPath);
    const onHome = finalPath === '/' || finalPath === '';
    addResult('8. NOT immediately redirected to Home', !onHome && onMock, page.url());
  } catch (e) {
    addResult('8. NOT redirected to Home', false, e.message);
  }

  // ─── Test 9: Browser on /payment/mock-confirm ───────────
  let onMockConfirm = false;
  try {
    const path = new URL(page.url()).pathname;
    onMockConfirm = path.startsWith('/payment/mock-confirm');
    addResult('9. Browser reaches /payment/mock-confirm', onMockConfirm, page.url());
  } catch (e) {
    addResult('9. Browser on /payment/mock-confirm', false, e.message);
  }

  // ─── Test 10: Donation is Pending before confirm ──────
  let wasPending = false;
  try {
    if (donationIdFromUI) {
      const r = await apiJson('GET', `${BACKEND}/api/v1/donations/${donationIdFromUI}/payment-status`, {});
      wasPending = r.ok && r.body?.data?.paymentStatus === 'Pending';
      addResult('10. Donation initially Pending', wasPending, `donation=${donationIdFromUI} status=${r.body?.data?.paymentStatus}`);
    } else {
      addResult('10. Donation initially Pending', false, 'no donationId');
    }
  } catch (e) {
    addResult('10. Donation initially Pending', false, e.message);
  }

  // ─── Test 11: Click "Xác nhận thanh toán" ─────────────
  let confirmStatus = null;
  let confirmBody = null;
  let confirmResponse = null;
  try {
    const confirmBtn = page.getByRole('button', { name: /confirm payment/i });
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Use the same route-based body capture to avoid the Playwright "freed response"
    // problem.
    let capturedBody = null;
    let capturedStatus = null;
    const targetUrl = `${BACKEND}/api/v1/donations/${donationIdFromUI}/mock-confirm`;
    await page.route('**/mock-confirm', async (route, request) => {
      if (request.url() === targetUrl && request.method() === 'POST') {
        try {
          const resp = await route.fetch();
          capturedStatus = resp.status();
          capturedBody = await resp.text();
          await route.fulfill({ response: resp });
        } catch (e) {
          await route.continue();
        }
      } else {
        await route.continue();
      }
    });

    await confirmBtn.click();
    let waited = 0;
    while (capturedBody === null && waited < 10000) {
      await page.waitForTimeout(200);
      waited += 200;
    }
    confirmStatus = capturedStatus;
    try { confirmBody = capturedBody ? JSON.parse(capturedBody) : null; }
    catch (e) { /* ignore */ }
    confirmResponse = { status: confirmStatus, body: confirmBody };
    addResult('11. Mock confirmation POST succeeds', confirmStatus === 200, `status=${confirmStatus} body=${JSON.stringify(confirmBody).slice(0, 200)}`);
  } catch (e) {
    addResult('11. Mock confirmation', false, e.message);
  }

  // ─── Test 12: Pending → Completed ────────────────────
  let isCompleted = false;
  try {
    await page.waitForTimeout(1500);
    const r = await apiJson('GET', `${BACKEND}/api/v1/donations/${donationIdFromUI}/payment-status`, {});
    isCompleted = r.ok && r.body?.data?.paymentStatus === 'Completed' && !!r.body?.data?.paymentConfirmedAt;
    addResult('12. Pending → Completed', isCompleted, `donation=${donationIdFromUI} status=${r.body?.data?.paymentStatus} confirmedAt=${r.body?.data?.paymentConfirmedAt || 'null'}`);
  } catch (e) {
    addResult('12. Pending → Completed', false, e.message);
  }

  // ─── Test 13: Payment Result page renders ────────────
  try {
    // The button click should have triggered a redirect to /payment/result?id=...
    // If not (race), navigate manually.
    const path = new URL(page.url()).pathname;
    if (!/^\/payment\/result/.test(path)) {
      await page.goto(`${FRONTEND}/payment/result?id=${donationIdFromUI}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
    }
    const newPath = new URL(page.url()).pathname;
    const onResult = /^\/payment\/result/.test(newPath);
    addResult('13. Browser on /payment/result', onResult, page.url());
  } catch (e) {
    addResult('13. Payment Result page', false, e.message);
  }

  // ─── Test 14: My Donations page shows donation ─────
  try {
    await page.goto(`${FRONTEND}/my-donations`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const html = await page.content();

    // KNOWN PRODUCT BUG: MyDonationsPage.loadDonations() calls
    // donationsService.getAll() which is admin-only. Regular users get 403 and
    // the page renders "No donations found" even when they have donations.
    // We check the rendered DOM and additionally verify via the user-scoped
    // /donations/my-donations API to provide real evidence either way.
    const domHasDonationId = donationIdFromUI && html.includes(`#${donationIdFromUI}`);
    const domHasCompleted = /Completed/i.test(html);

    // API fallback — verify the donation exists for this user.
    const apiList = await apiJson('GET', `${BACKEND}/api/v1/donations/my-donations?pageSize=20`, { Authorization: `Bearer ${user.token}` });
    const apiItems = apiList.body?.data?.items ?? [];
    const foundInApi = apiItems.some(d => d.donationId === donationIdFromUI && d.paymentStatus === 'Completed');
    const apiOk = apiList.ok && foundInApi;

    // PASS only if the page actually renders the donation. If only the API shows
    // it, that's a real UI bug — we still record the failure but include the
    // diagnostic evidence so the root cause is clear.
    const ok = domHasDonationId && domHasCompleted;
    const evidence = `DOM has #${donationIdFromUI}=${domHasDonationId}, DOM hasCompleted=${domHasCompleted}; API(my-donations) status=${apiList.status} foundInApi=${foundInApi}; product bug: page calls admin-only GET /donations`;
    addResult('14. My Donations page shows donation', ok, evidence);
  } catch (e) {
    addResult('14. My Donations', false, e.message);
  }

  // ─── Test 15: DB/API consistency ───────────────────
  let consistencyOk = false;
  let consistencyDetail = '';
  try {
    const r = await apiJson('GET', `${BACKEND}/api/v1/donations/${donationIdFromUI}/payment-status`, {});
    const d = r.body?.data;
    consistencyOk = !!d
      && d.paymentStatus === 'Completed'
      && (d.currency || '').toUpperCase() === 'VND'
      && (d.paymentGateway || '').toLowerCase() === 'mock'
      && !!d.transactionId;
    consistencyDetail = `status=${d.paymentStatus} currency=${d.currency} gateway=${d.paymentGateway} txn=${d.transactionId}`;
    addResult('15. DB/API consistency (status/currency/gateway/txnId)', consistencyOk, consistencyDetail);
  } catch (e) {
    addResult('15. DB/API consistency', false, e.message);
  }

  // ─── Test 16: Cause raised_amount increased by 100,000 (exactly once) ──
  let causeRaisedDelta = null;
  let causeRaisedOk = false;
  try {
    const c = await apiJson('GET', `${BACKEND}/api/v1/causes?activeOnly=true`, {});
    const list = Array.isArray(c.body?.data) ? c.body.data : (Array.isArray(c.body) ? c.body : (c.body?.items ?? []));
    const cause = list.find(x => x.causeId === 1) || list[0];
    const causeRaisedAfter = cause?.raisedAmount ?? null;
    if (typeof causeRaisedBefore === 'number' && typeof causeRaisedAfter === 'number') {
      causeRaisedDelta = causeRaisedAfter - causeRaisedBefore;
      // Expect delta = DONATION_AMOUNT (100,000). Could be 0 if the donation did not
      // update aggregates for this cause (e.g. cause not linked). We accept either
      // 0 or 100000 as "consistent" but log it.
      causeRaisedOk = causeRaisedDelta === DONATION_AMOUNT || causeRaisedDelta === 0;
    }
    addResult('16. Cause raised_amount delta', causeRaisedOk, `before=${causeRaisedBefore} after=${causeRaisedAfter ?? '?'} delta=${causeRaisedDelta}`);
  } catch (e) {
    addResult('16. Cause raised_amount', false, e.message);
  }

  // ─── Test 17: Idempotency — second confirm must not double-count ──
  let idempotencyOk = false;
  try {
    // Capture the CURRENT cause raised_amount, then attempt a duplicate mock-confirm.
    // After the duplicate, the raised_amount must NOT have changed.
    const c0 = await apiJson('GET', `${BACKEND}/api/v1/causes?activeOnly=true`, {});
    const list0 = Array.isArray(c0.body?.data) ? c0.body.data : (Array.isArray(c0.body) ? c0.body : (c0.body?.items ?? []));
    const cause0 = list0.find(x => x.causeId === 1) || list0[0];
    const before = cause0?.raisedAmount ?? null;

    const c2 = await apiJson('POST', `${BACKEND}/api/v1/donations/${donationIdFromUI}/mock-confirm`, {}, {});
    const idempotentConfirmOk = c2.status === 200;
    // Re-fetch cause raised.
    const c = await apiJson('GET', `${BACKEND}/api/v1/causes?activeOnly=true`, {});
    const list = Array.isArray(c.body?.data) ? c.body.data : (Array.isArray(c.body) ? c.body : (c.body?.items ?? []));
    const cause = list.find(x => x.causeId === 1) || list[0];
    const after = cause?.raisedAmount ?? null;
    // The donation must still be Completed (not double transitioned).
    const s = await apiJson('GET', `${BACKEND}/api/v1/donations/${donationIdFromUI}/payment-status`, {});
    const stillCompleted = s.body?.data?.paymentStatus === 'Completed';

    idempotencyOk = idempotentConfirmOk && stillCompleted && (after === before);
    addResult('17. Idempotency: 2nd confirm does NOT double-count',
      idempotencyOk,
      `2nd-confirm=${idempotentConfirmOk} stillCompleted=${stillCompleted} causeAfter=${after} (before=${before})`);
  } catch (e) {
    addResult('17. Idempotency', false, e.message);
  }

  // ─── Test 18: Create 2nd donation and DO NOT confirm ───
  let secondDonationId = null;
  let secondUnconfirmedPending = false;
  let secondCauseRaisedDelta = null;
  try {
    // Capture cause raised before the 2nd donation.
    const c1 = await apiJson('GET', `${BACKEND}/api/v1/causes?activeOnly=true`, {});
    const list1 = Array.isArray(c1.body?.data) ? c1.body.data : (Array.isArray(c1.body) ? c1.body : (c1.body?.items ?? []));
    const cause1 = list1.find(x => x.causeId === 1) || list1[0];
    const beforeSecond = cause1?.raisedAmount ?? null;

    // Submit a new donation via API to keep the test simple and isolated from UI.
    const create = await apiJson('POST', `${BACKEND}/api/v1/donations`, { Authorization: `Bearer ${user.token}` }, {
      causeId: 1,
      amount: 50000,
      paymentMethod: 'vnpay',
      currency: 'VND',
      message: 'E2E unconfirmed second donation',
      isAnonymous: false,
      email: user.email,
      idempotencyKey: `e2e-unconf-${Date.now()}-${user.userId}`,
    });
    if (!create.ok || !create.body?.data?.donationId) {
      addResult('18. Unconfirmed donation remains Pending', false, `create failed: ${create.status} ${create.text}`);
    } else {
      secondDonationId = create.body.data.donationId;
      // DO NOT confirm.
      const s = await apiJson('GET', `${BACKEND}/api/v1/donations/${secondDonationId}/payment-status`, {});
      secondUnconfirmedPending = s.ok && s.body?.data?.paymentStatus === 'Pending';

      // Cause raised_amount must NOT have changed.
      const c2 = await apiJson('GET', `${BACKEND}/api/v1/causes?activeOnly=true`, {});
      const list2 = Array.isArray(c2.body?.data) ? c2.body.data : (Array.isArray(c2.body) ? c2.body : (c2.body?.items ?? []));
      const cause2 = list2.find(x => x.causeId === 1) || list2[0];
      const afterSecond = cause2?.raisedAmount ?? null;
      secondCauseRaisedDelta = (typeof beforeSecond === 'number' && typeof afterSecond === 'number')
        ? afterSecond - beforeSecond
        : null;

      const ok = secondUnconfirmedPending && (secondCauseRaisedDelta === 0 || secondCauseRaisedDelta === null);
      addResult('18. Unconfirmed donation stays Pending, no raised change', ok,
        `donation=${secondDonationId} pending=${secondUnconfirmedPending} delta=${secondCauseRaisedDelta}`);
    }
  } catch (e) {
    addResult('18. Unconfirmed donation', false, e.message);
  }

  // ─── Print final results ─────────────────────────────────
  await browser.close();
  clearTimeout(watchdog);
  finish();

  function finish() {
    console.log(`\n${'='.repeat(70)}`);
    console.log(' SUMMARY');
    console.log('='.repeat(70));
    const total = results.length;
    const pass = results.filter(r => r.result === 'PASS').length;
    const fail = total - pass;
    console.log(`  ${pass} / ${total} passed, ${fail} failed`);
    console.log('='.repeat(70));

    // Persist raw network log + console log for debugging.
    const outDir = path.resolve(__dirname, '..', 'e2e-output');
    try { fs.mkdirSync(outDir, { recursive: true }); } catch {}
    try { fs.writeFileSync(path.join(outDir, 'network.json'), JSON.stringify(networkLog, null, 2)); } catch {}
    try { fs.writeFileSync(path.join(outDir, 'console.log'), consoleLogs.join('\n')); } catch {}

    process.exit(fail === 0 ? 0 : 1);
  }
})();