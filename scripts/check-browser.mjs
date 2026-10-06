// Integration/UI tests use an explicit model fixture, not real diagnosis.
// Optional: FIXLENS_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.FIXLENS_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.FIXLENS_BROWSER || '/usr/bin/brave', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const url = process.env.FIXLENS_URL || 'http://127.0.0.1:5175';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGZkAAAAASUVORK5CYII=', 'base64');
const fixture = { model: 'fixture-vision', generatedAt: new Date().toISOString(), status: 'unverified_model_assessment', report: { summary: 'TEST FIXTURE: not an actual circuit diagnosis.', observations: ['Fixture observation'], findings: [{ title: '<img src=x onerror=alert(1)>', severity: 'medium', basis: 'hypothesis', evidence: [{ photo: 1, detail: 'Fixture evidence' }], explanation: 'Fixture mechanism', proposedFix: 'Fixture conditional repair', verification: 'Fixture verification', unknowns: ['Actual wiring is unknown'] }], limitations: ['Simulated model output for UI testing only.'], nextChecks: ['Supply real photographs for evaluation.'] } };
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 await page.goto(url);
 await page.locator('#model-status').filter({ hasText: /LM Studio|vision|Local/ }).waitFor();
 await page.screenshot({ path: '/tmp/fixlens-diagnostics-desktop.png', fullPage: true });
 await page.route('**/api/models', route => route.fulfill({ json: { models: ['fixture-vision'], message: 'Explicit test fixture model' } }));
 await page.locator('#refresh-models').click();
 await page.locator('#model').selectOption('fixture-vision');
 assert.ok(await page.locator('#analyze').isDisabled());
 await page.locator('#photos').setInputFiles({ name: 'test-fixture.png', mimeType: 'image/png', buffer: png });
 await page.locator('figure').waitFor();
 assert.ok(await page.locator('#analyze').isEnabled());
 let payload;
 await page.route('**/api/analyze', async route => { payload = route.request().postDataJSON(); await route.fulfill({ json: fixture }); });
 await page.locator('#analyze').click();
 await page.locator('#report-actions').waitFor();
 assert.equal(payload.photos.length, 1); assert.equal(payload.purpose, '');
 assert.match(await page.locator('#report').innerText(), /<img src=x onerror=alert\(1\)>/);
 assert.equal(await page.locator('#report img').count(), 0);
 const downloadPromise = page.waitForEvent('download'); await page.locator('#download').click();
 const downloaded = JSON.parse(await readFile(await (await downloadPromise).path(), 'utf8'));
 assert.equal(downloaded.input.photos[0].name, 'test-fixture.png'); assert.equal(downloaded.input.photos[0].data, undefined);
 await page.locator('#symptoms').fill('Resets when motor starts');
 assert.ok(await page.locator('#report-actions').isHidden());
 await page.unroute('**/api/analyze');
 await page.route('**/api/analyze', route => route.fulfill({ status: 502, json: { error: 'Model returned invalid output; no report accepted.' } }));
 await page.locator('#analyze').click();
 await page.locator('#request-status').filter({ hasText: /invalid output/ }).waitFor();
 assert.equal(await page.locator('.finding').count(), 0);
 await page.unroute('**/api/analyze');
 let release;
 await page.route('**/api/analyze', async route => { await new Promise(resolve => { release = resolve; }); await route.fulfill({ json: fixture }); });
 await page.locator('#analyze').click();
 await page.locator('#cancel').waitFor();
 await page.locator('#symptoms').fill('Changed during request');
 // Route handler begins before waiting for the visible analyzing state above.
 while (!release) await new Promise(resolve => setTimeout(resolve, 10));
 release();
 await page.locator('#request-status').filter({ hasText: /case changed/ }).waitFor();
 assert.ok(await page.locator('#report-actions').isHidden());
 for (const width of [768,390]) {
   await page.setViewportSize({ width, height: 844 });
   assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}`);
 }
 await page.screenshot({ path: '/tmp/fixlens-diagnostics-mobile.png', fullPage: true });
 await page.getByRole('button', { name: 'Remove photo 1' }).click();
 assert.ok(await page.locator('#analyze').isDisabled());
 assert.deepEqual(errors, []);
 console.log('PASS: photo-only request, preview/remove, model selection, structured fixture report, safe rendering, export, stale-result rejection, failure states, desktop/tablet/mobile. Diagnostic accuracy not tested.');
} finally { await browser.close(); }
