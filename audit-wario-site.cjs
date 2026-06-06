const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const root = __dirname;
const siteDir = path.join(root, 'files-mentioned-by-the-user-wario');
const serverPath = path.join(siteDir, 'server', 'server.js');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 3123;
const baseUrl = `http://127.0.0.1:${port}`;
const desktopShot = path.join(root, 'audit-wario-desktop.png');
const mobileShot = path.join(root, 'audit-wario-mobile.png');

function cleanEnv() {
  const env = { ...process.env };
  if (env.Path && env.PATH) delete env.PATH;
  env.PORT = String(port);
  env.NODE_ENV = 'production';
  env.APP_ORIGIN = baseUrl;
  env.TRUST_PROXY = 'true';
  env.ORDER_STORE = 'memory';
  return env;
}

function request(method, pathname, body, headers = {}) {
  const target = new URL(pathname, baseUrl);
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const req = http.request({
      hostname: target.hostname,
      port: target.port,
      path: `${target.pathname}${target.search}`,
      method,
      headers
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          ms: Date.now() - started,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8').slice(0, 500)
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(10_000, () => req.destroy(new Error(`Timeout ${method} ${pathname}`)));
    if (body) req.write(body);
    req.end();
  });
}

async function waitForServer(server) {
  let lastError;
  for (let i = 0; i < 60; i += 1) {
    if (server.exitCode !== null) throw new Error(`Server exited early with code ${server.exitCode}`);
    try {
      const res = await request('GET', '/');
      if (res.status === 200) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw lastError || new Error('Server did not start');
}

function fixedBusinessDateScript() {
  return `
    (() => {
      const fixedTime = new Date('2026-06-05T23:00:00.000Z').getTime();
      const RealDate = Date;
      class MockDate extends RealDate {
        constructor(...args) {
          if (args.length === 0) return new RealDate(fixedTime);
          return new RealDate(...args);
        }
        static now() { return fixedTime; }
      }
      MockDate.UTC = RealDate.UTC;
      MockDate.parse = RealDate.parse;
      Object.setPrototypeOf(MockDate, RealDate);
      window.Date = MockDate;
    })();
  `;
}

async function snapshot(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const textName = el => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim();
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
    const duplicatedIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const buttonsMissingNames = [...document.querySelectorAll('button')]
      .filter(button => !textName(button))
      .map(button => button.id || button.className || button.outerHTML.slice(0, 80));
    const inputsMissingLabels = [...document.querySelectorAll('input, textarea')]
      .filter(input => {
        if (input.type === 'hidden') return false;
        if (input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`)) return false;
        return !(input.getAttribute('aria-label') || input.getAttribute('placeholder'));
      })
      .map(input => input.id || input.name || input.outerHTML.slice(0, 80));
    const brokenImages = [...document.images]
      .filter(img => !img.complete || img.naturalWidth === 0)
      .map(img => img.getAttribute('src') || img.currentSrc || img.alt);
    const visibleCards = [...document.querySelectorAll('.combo-card')]
      .filter(card => getComputedStyle(card).display !== 'none').length;
    return {
      title: document.title,
      h1: document.querySelector('h1')?.innerText.trim() || '',
      metaDescription: document.querySelector('meta[name="description"]')?.content || '',
      canonical: Boolean(document.querySelector('link[rel="canonical"]')),
      ogUrl: Boolean(document.querySelector('meta[property="og:url"]')),
      jsonLd: Boolean(document.querySelector('script[type="application/ld+json"]')),
      images: document.images.length,
      brokenImages,
      duplicatedIds,
      buttonsMissingNames,
      inputsMissingLabels,
      visibleCards,
      horizontalOverflowPx: Math.max(0, doc.scrollWidth - doc.clientWidth),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      pageHeight: doc.scrollHeight
    };
  });
}

async function inspectContext(browser, viewport, screenshotPath) {
  const homeScreenshotPath = screenshotPath.replace(/\.png$/i, '-home.png');
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: viewport.width <= 480,
    hasTouch: viewport.width <= 480
  });
  await context.addInitScript(fixedBusinessDateScript());
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  const failedRequests = [];
  const badResponses = [];
  page.on('console', msg => {
    if (['error', 'warning'].includes(msg.type())) consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('requestfailed', req => failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText || 'failed'}`));
  page.on('response', res => {
    if (res.status() >= 400) badResponses.push(`${res.status()} ${res.url()}`);
  });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(2200);
  const initial = await snapshot(page);
  await page.screenshot({ path: homeScreenshotPath, fullPage: false });

  const hotTab = page.locator('.menu-tab[data-filter="hot"]');
  if (await hotTab.count()) {
    await hotTab.click();
    await page.waitForTimeout(250);
  }
  const hotCount = await page.locator('.combo-card:not(.is-hidden)').count();

  const addButton = page.locator('.combo-card:not(.is-hidden) .add-to-order').first();
  if (await addButton.count()) {
    await addButton.click();
    await page.waitForTimeout(350);
  }
  const afterAdd = await page.evaluate(() => ({
    bodyHasOrder: document.body.classList.contains('has-order'),
    barVisible: document.querySelector('#orderBar')?.classList.contains('is-visible') || false,
    barSummary: document.querySelector('#orderBarSummary')?.textContent.trim() || ''
  }));

  const bar = page.locator('#orderBar');
  if (await bar.count()) {
    await bar.click();
    await page.waitForTimeout(250);
  }
  const manual = page.locator('#deliveryManualButton');
  if (await manual.count()) {
    await manual.click();
    await page.waitForTimeout(150);
  }
  await page.locator('#customerName').fill('Cliente Teste');
  await page.locator('#deliveryStreet').fill('Rua Dias da Cruz');
  await page.locator('#deliveryNumber').fill('100');
  await page.locator('#deliveryNeighborhood').fill('Meier');
  await page.locator('label.payment-option').filter({
    has: page.locator('input[name="paymentMethod"][value="debit"]')
  }).click();
  await page.waitForTimeout(350);
  const orderReady = await page.evaluate(() => ({
    drawerOpen: document.querySelector('#orderDrawer')?.getAttribute('aria-hidden') === 'false',
    sendDisabled: document.querySelector('#orderSend')?.disabled,
    sendText: document.querySelector('#orderSend')?.textContent.trim() || '',
    subtotal: document.querySelector('#orderSubtotal')?.textContent.trim() || '',
    delivery: document.querySelector('#orderDelivery')?.textContent.trim() || '',
    total: document.querySelector('#orderTotal')?.textContent.trim() || '',
    help: document.querySelector('#orderSupport')?.textContent.trim() || ''
  }));

  await page.screenshot({ path: screenshotPath, fullPage: false });
  await context.close();
  return { initial, homeScreenshotPath, hotCount, afterAdd, orderReady, consoleMessages, pageErrors, failedRequests, badResponses };
}

async function compareCatalog(browser) {
  const serverSource = fs.readFileSync(path.join(siteDir, 'server', 'server.js'), 'utf8');
  const serverIds = [...serverSource.matchAll(/\['([^']+)',\{name:/g)].map(match => match[1]).sort();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(fixedBusinessDateScript());
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(600);
  const frontIds = await page.evaluate(() => [...document.querySelectorAll('.combo-card')].flatMap(card => {
    const variants = [...card.querySelectorAll('.combo-variant-option')];
    if (!variants.length) return [`${card.dataset.id}-${card.dataset.variantId || 'unico'}`];
    return variants.map(variant => `${card.dataset.id}-${variant.dataset.variantId || 'unico'}`);
  }).sort());
  await context.close();
  return {
    frontCount: frontIds.length,
    serverCount: serverIds.length,
    missingOnServer: frontIds.filter(id => !serverIds.includes(id)),
    unusedOnFront: serverIds.filter(id => !frontIds.includes(id))
  };
}

(async () => {
  let browser;
  const stdout = [];
  const stderr = [];
  const server = spawn(process.execPath, [serverPath], {
    cwd: root,
    env: cleanEnv(),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', chunk => stdout.push(chunk.toString('utf8').trim()));
  server.stderr.on('data', chunk => stderr.push(chunk.toString('utf8').trim()));

  try {
    await waitForServer(server);
    const httpChecks = {
      home: await request('GET', '/'),
      css: await request('GET', '/wario_sushi_v2_16.css?v=34'),
      js: await request('GET', '/wario_sushi_v2_16.js?v=34'),
      privacy: await request('GET', '/politica-de-privacidade.html?v=2'),
      terms: await request('GET', '/termos-de-pedido.html?v=2'),
      blockedServerFile: await request('GET', '/server/server.js'),
      securityConfig: await request('GET', '/api/security/config')
    };

    browser = await chromium.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--disable-gpu', '--no-sandbox']
    });
    const desktop = await inspectContext(browser, { width: 1366, height: 768 }, desktopShot);
    const mobile = await inspectContext(browser, { width: 390, height: 844 }, mobileShot);
    const catalog = await compareCatalog(browser);

    const result = {
      baseUrl,
      screenshots: { desktop: desktopShot, mobile: mobileShot },
      serverOutput: {
        stdout: stdout.filter(Boolean),
        stderr: stderr.filter(Boolean)
      },
      httpChecks: Object.fromEntries(Object.entries(httpChecks).map(([key, value]) => [key, {
        status: value.status,
        ms: value.ms,
        contentType: value.headers['content-type'],
        cacheControl: value.headers['cache-control'],
        csp: Boolean(value.headers['content-security-policy']),
        hsts: Boolean(value.headers['strict-transport-security']),
        xFrameOptions: value.headers['x-frame-options'],
        xContentTypeOptions: value.headers['x-content-type-options']
      }])),
      securityConfigBody: httpChecks.securityConfig.body,
      desktop,
      mobile,
      catalog
    };
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill();
  }
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
