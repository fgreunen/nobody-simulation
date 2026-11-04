import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('console', msg => { if (['error', 'warning'].includes(msg.type())) console.log(msg.type(), msg.text()); });
  page.on('pageerror', error => console.log('PAGE ERROR', error.message));
  await page.goto(process.argv[2] || 'http://127.0.0.1:5187/');
  try { await page.waitForSelector('html[data-ready="true"]'); }
  catch (e) { console.log(await page.locator('body').innerText()); throw e; }
  await page.waitForTimeout(6000);
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/observatory-desktop.png' });
  console.log('metrics', await page.evaluate(() => window.__observatoryMetrics));
} finally { await browser.close(); }
