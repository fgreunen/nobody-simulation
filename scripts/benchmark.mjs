import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const url = process.env.BENCHMARK_URL || 'http://127.0.0.1:5188/';
const browser = await chromium.launch({ channel: 'chrome', headless: false });
let page;
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('Browser error:', msg.text()); });
  await page.goto(url);
  await page.waitForSelector('html[data-ready="true"]', { timeout: 30000 });
  await page.bringToFront();
  await page.getByRole('button', { name: 'Cinematic', exact: true }).click();
  // Input can otherwise switch a foreground benchmark to manual camera mode.
  // This does not alter simulation, render resolution, effects, or frame scheduling.
  await page.evaluate(() => { document.querySelector('.observatory').style.pointerEvents = 'none'; });
  const adapter = await page.evaluate(async () => {
    const a = await navigator.gpu.requestAdapter();
    return { vendor: a.info.vendor, architecture: a.info.architecture, isFallbackAdapter: a.info.isFallbackAdapter };
  });
  console.log('Warming up 100 bodies and all cinematic effects for 10 seconds…');
  await page.waitForTimeout(10000);
  const start = await page.evaluate(() => window.__observatoryMetrics);
  const started = performance.now();
  const samples = [];
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(15000);
    const sample = await page.evaluate(() => ({ ...window.__observatoryMetrics, hidden: document.hidden }));
    samples.push(sample);
    console.log(`Measured ${(i + 1) * 15}/60 seconds · ${sample.frames - start.frames} frames · foreground: ${!sample.hidden} · cinematic: ${sample.cinematic}`);
  }
  const end = samples.at(-1);
  const wallSeconds = (performance.now() - started) / 1000;
  const unitsPerSecond = 2 * Math.PI / (45 * Math.sqrt(0.95));
  const averageFPS = (end.frames - start.frames) / wallSeconds;
  const achievedSpeed = (end.simulatedUnits - start.simulatedUnits) / (unitsPerSecond * wallSeconds);
  const passed = averageFPS >= 30 && Math.abs(achievedSpeed - 1) <= 0.05 &&
    end.bodyCount === 100 && end.renderWidth === 1280 && end.renderHeight === 720 &&
    end.cinematic && !end.paused && end.requestedSpeed === 1 && end.ready &&
    samples.every(s => !s.hidden && s.cinematic && !s.paused && s.requestedSpeed === 1 && s.bodyCount === 100 && s.ready) && adapter.isFallbackAdapter === false && errors.length === 0;
  const result = {
    measuredAt: new Date().toISOString(), browser: browser.version(), url, adapter,
    warmupSeconds: 10, measurementSeconds: wallSeconds, viewport: { width: 1280, height: 800 },
    rendering: { width: 1280, height: 720, pixelRatio: 1, automaticQualityReduction: false },
    bodies: end.bodyCount, frames: end.frames - start.frames, averageFPS, achievedSpeed,
    allForegroundSamples: samples.every(s => !s.hidden), allCinematicSamples: samples.every(s => s.cinematic),
    endState: end, pageErrors: errors, passed,
  };
  await writeFile('docs/benchmark.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  await page.screenshot({ path: 'test-results/benchmark.png' });
  if (!passed) process.exitCode = 1;
} catch (error) {
  if (page && !page.isClosed()) {
    console.log('Startup state:', await page.locator('body').innerText());
    await page.screenshot({ path: 'test-results/benchmark-failure.png' });
  }
  throw error;
} finally { await browser.close(); }
