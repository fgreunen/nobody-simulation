import { test, expect, type Page } from '@playwright/test';

const snapshot = (page: Page) => page.evaluate(() => (window as any).__observatory.snapshot());
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
}

test('inspects a star, transfers the inspector after contact, and generates a fresh scene', async ({ page }, testInfo) => {
  await ready(page);
  await expect(page.getByRole('complementary', { name: 'Selected star' })).toBeHidden();
  await page.getByRole('button', { name: 'Pause simulation', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Scenarios' })).toHaveCount(0);
  await expect(page.locator('#mass, #share, #motion, #approach, #offset, #compactness')).toHaveCount(0);
  await page.evaluate(() => (window as any).__observatory.setBody(1, [0, 0.3, 0], [0, 0, 0]));
  const body = await page.evaluate(() => (window as any).__observatory.projectBody(1));
  await page.mouse.click(body.x, body.y);
  expect((await snapshot(page)).following).toBe(1);
  const inspector = page.getByRole('complementary', { name: 'Selected star' });
  await expect(inspector).toContainText('Star 2');
  for (const label of ['Mass', 'Physical radius', 'Surface temperature', 'Luminosity', 'Capture radius', 'M☉', 'R☉', 'K', 'L☉']) await expect(inspector).toContainText(label);
  await page.screenshot({ path: testInfo.outputPath('stellar-inspector.png') });
  await page.evaluate(() => {
    const api = (window as any).__observatory;
    api.setBody(0, [0, 0.3, 0], [0, 0, 0]); api.setBody(1, [0, 0.3, 0], [0, 0, 0]);
    document.getElementById('pause')!.click();
  });
  await expect.poll(async () => (await snapshot(page)).activeCount).toBe(99);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  expect((await snapshot(page)).following).toBe(0);
  await expect(inspector).toContainText('merger remnant'); await expect(inspector).toContainText('Star 1');
  await page.getByRole('button', { name: 'Generate scene' }).click();
  expect((await snapshot(page)).following).toBe(null);
  await expect(inspector).toBeHidden();
});

test('renders WebGPU at fixed 720p with no page errors', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  await expect(page.locator('.scene-panel h1, .intro, .scene-coordinate')).toHaveCount(0);
  await expect(page.getByText('STELLAR PORTRAIT', { exact: true })).toHaveCount(0);
  await expect(page.getByText('About these scenarios', { exact: true })).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveAttribute('width', '1280');
  await expect(page.locator('canvas')).toHaveAttribute('height', '720');
  await expect(page.getByRole('button', { name: 'Pause simulation' })).toBeEnabled();
  expect((await snapshot(page)).count).toBe(100);
  await page.screenshot({ path: testInfo.outputPath('curated-cluster.png') });
  await expect(page.locator('#elapsed, .population-mass')).toHaveCount(0);
  await expect(page.locator('#rate > span')).toHaveText([/^Requested: [\d,.\s]+ kyr\/s$/, /^Achieved: [\d,.\s]+ kyr\/s$/]);
  await expect(page.locator('header #rate')).toBeVisible();
  await expect(page.locator('header .status-stats')).toBeVisible();
  await expect(page.locator('header .metrics-divider')).toBeVisible();
  await expect(page.locator('footer .status-stats')).toHaveCount(0);
  const cameraControls = page.locator('footer').getByRole('navigation', { name: 'Camera controls' });
  await expect(page.locator('#reset, #settings-toggle')).toHaveCount(0);
  await expect(page.getByText('THE INITIAL CONDITIONS', { exact: true })).toHaveCount(0);
  await expect(page.locator('header #scene-form')).toBeVisible();
  const headerGroups = await page.locator('header > .brand, header > .scene-panel, header > .header-metrics').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }));
  expect(Math.max(...headerGroups.map(r => r.top))).toBeLessThan(Math.min(...headerGroups.map(r => r.bottom)));
  await expect(cameraControls.getByRole('button', { name: 'Pause simulation' })).toBeVisible();
  await expect(cameraControls.getByLabel('Simulation speed')).toBeVisible();
  await expect(cameraControls.locator('#reset, #first-person')).toHaveCount(0);
  await expect(page.locator('#first-person')).toHaveCount(0);
  const help = cameraControls.getByRole('button', { name: 'How to explore' });
  await expect(help).toHaveText('?');
  await help.focus();
  await page.keyboard.press('Enter');
  await expect(cameraControls.getByText('Orbit around the scene')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('camera-controls.png') });
  await help.focus();
  await page.keyboard.press('Enter');
  await expect(cameraControls.getByText('Orbit around the scene')).toBeHidden();
  await page.waitForTimeout(1500);
  expect((await snapshot(page)).time).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await expect(page.locator('#achieved-rate')).toHaveText('0 kyr/s');
  await expect(page.locator('#achieved-rate')).toHaveClass('below-requested');
  await expect(page.locator('#achieved-rate')).toHaveCSS('color', 'rgb(239, 182, 109)');
  expect(errors).toEqual([]);
});

test('stages scene settings and generates fresh scenes with new seeds', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Pause simulation', exact: true }).click();
  const before = await snapshot(page);
  await expect(page.locator('#count')).toHaveAttribute('max', '1000');
  await page.locator('#count').fill('64');
  expect((await snapshot(page)).count).toBe(100);
  await page.getByRole('button', { name: 'Generate scene' }).click();
  const generated = await snapshot(page);
  expect(generated.count).toBe(64);
  expect(generated.time).toBeGreaterThan(0);
  expect(generated.positions.every(Number.isFinite)).toBe(true);
  await expect.poll(async () => Number(await page.locator('#body-count').textContent())).toBeLessThanOrEqual(64);
  expect(generated.activeCount).toBeGreaterThan(0);
  expect(generated.seed).not.toBe(before.seed);
  expect(generated.masses.reduce((a: number, b: number) => a + b, 0) + generated.radiatedMass).toBeCloseTo(generated.initialMass, 12);
  await page.getByRole('button', { name: 'Generate scene' }).click();
  const regenerated = await snapshot(page);
  expect(regenerated.seed).not.toBe(generated.seed);
  expect(regenerated.count).toBe(64);
  expect(regenerated.paused).toBe(false);
  expect(regenerated.following).toBe(null);

});

test('pause and speed work while camera takeover, follow, pan and recenter remain independent', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  const paused = await snapshot(page);
  await page.waitForTimeout(150);
  expect((await snapshot(page)).time).toBe(paused.time);
  const speed = page.getByRole('slider', { name: 'Simulation speed', exact: true });
  await expect(speed).toHaveAttribute('min', '1'); await expect(speed).toHaveAttribute('max', '100');
  await expect(speed).toHaveAttribute('step', '1');
  await speed.fill('10'); expect((await snapshot(page)).speed).toBe(10);
  await expect(page.locator('#speed-value')).toHaveText('10×');
  await speed.focus(); await page.keyboard.press('End');
  expect((await snapshot(page)).speed).toBe(100);
  await expect(page.locator('#speed-value')).toHaveText('100×');
  await expect(speed).toHaveAttribute('aria-valuetext', '100×');
  await page.keyboard.press('Home'); expect((await snapshot(page)).speed).toBe(1);
  await page.keyboard.press('ArrowRight'); expect((await snapshot(page)).speed).toBe(2);
  await expect(page.locator('#speed-value')).toHaveText('2×');
  await speed.fill('100');
  const canvas = page.locator('canvas');
  const rect = (await canvas.boundingBox())!;
  await page.mouse.move(rect.x + rect.width * 0.7, rect.y + rect.height * 0.4);
  await page.mouse.down(); await page.mouse.move(rect.x + rect.width * 0.75, rect.y + rect.height * 0.5, { steps: 8 }); await page.mouse.up();
  expect((await snapshot(page)).cinematic).toBe(false);
  await page.evaluate(() => (window as any).__observatory.setBody(0, [0, 0.3, 0], [0, 0, 0]));
  const body = await page.evaluate(() => (window as any).__observatory.projectBody(0));
  await page.mouse.click(body.x, body.y);
  expect((await snapshot(page)).following).toBe(0);
  await page.mouse.wheel(0, 100);
  expect((await snapshot(page)).following).toBe(0);
  await page.keyboard.down('Shift');
  await page.mouse.move(rect.x + rect.width * 0.7, rect.y + rect.height * 0.5);
  await page.mouse.down(); await page.mouse.move(rect.x + rect.width * 0.75, rect.y + rect.height * 0.5, { steps: 5 }); await page.mouse.up();
  await page.keyboard.up('Shift');
  expect((await snapshot(page)).following).toBe(null);
  await page.getByRole('button', { name: 'Recenter' }).click();
  expect((await snapshot(page)).cinematic).toBe(true);
  expect((await snapshot(page)).paused).toBe(true);
});

test('shows a useful unsupported-device screen', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('#failure-message')).toContainText('WebGPU');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('shows a reload action when the graphics device is lost', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => (window as any).__observatory.loseDevice());
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('#failure-message')).toContainText('graphics device');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeEnabled();
});



test('desktop vertical drags keep orbiting through both poles', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Pause simulation', exact: true }).click();
  let before = await snapshot(page);
  const distance = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]));
  const radius = distance(before.camera, before.target);
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(900, 700); await page.mouse.down();
    await page.mouse.move(900, 200, { steps: 40 }); await page.mouse.up();
    const after = await snapshot(page);
    expect(distance(before.camera, after.camera)).toBeGreaterThan(radius);
    expect(distance(after.camera, after.target)).toBeCloseTo(radius, 7);
    expect(after.cinematic).toBe(false);
    before = after;
  }
  await page.mouse.wheel(0, -150);
  await expect.poll(async () => distance((await snapshot(page)).camera, before.target)).toBeLessThan(radius * 0.95);
  await page.getByRole('button', { name: 'Recenter' }).click();
  const reset = await snapshot(page);
  expect(reset.target).toEqual([0, 0, 0]); expect(reset.cinematic).toBe(true);
});

test('the default cluster visibly merges stars without intervention', async ({ page }, testInfo) => {
  await ready(page);
  await expect.poll(async () => (await snapshot(page)).mergerCount, { timeout: 15000 }).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  const merged = await snapshot(page);
  expect(merged.activeCount).toBeLessThan(100);
  expect(merged.bursts.length).toBeGreaterThan(0);
  await expect(page.locator('#body-count')).toHaveText(String(merged.activeCount));
  await expect(page.locator('#merger-count')).toHaveText(String(merged.mergerCount));
  await page.screenshot({ path: testInfo.outputPath('enhanced-merger.png') });
});


test('stages each scenario and applies pending edits only on generation', async ({ page }, testInfo) => {
  await ready(page);
  for (const id of ['cold-collapse', 'expanding-association', 'cluster-encounter', 'rotating-cluster', 'flattened-cluster']) {
    const before = await snapshot(page);
    await page.getByLabel('Scenario', { exact: true }).selectOption(id);
    expect((await snapshot(page)).scenario).toBe(before.scenario);
    await expect(page.locator('#form-note')).toHaveCount(0);
    await page.getByRole('button', { name: 'Generate scene' }).click();
    const generated = await snapshot(page);
    expect(generated.scenario).toBe(id);
    expect(generated.seed).not.toBe(before.seed);
    expect(generated.paused).toBe(false);
    await page.getByLabel('Scenario', { exact: true }).selectOption('open-cluster');
    expect((await snapshot(page)).scenario).toBe(id);
  }
  await page.screenshot({ path: testInfo.outputPath('flattened-cluster.png') });
});

test('Cluster smash shows an incoming pair, merger flashes and a scattered aftermath', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    crypto.getRandomValues = ((array: Uint32Array) => { array.fill(125); return array; }) as typeof crypto.getRandomValues;
  });
  await ready(page);
  await page.getByLabel('Scenario', { exact: true }).selectOption({ label: 'Cluster smash' });
  await page.getByRole('button', { name: 'Generate scene' }).click();
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  expect((await snapshot(page)).scenario).toBe('cluster-encounter');
  await page.screenshot({ path: testInfo.outputPath('cluster-smash-incoming.png') });
  await page.getByLabel('Simulation speed', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Play simulation' }).click();
  const elapsed = async () => {
    const state = await snapshot(page);
    return state.time * Math.sqrt(state.initialMass / state.settings.radius ** 3);
  };
  await expect.poll(elapsed).toBeGreaterThan(0.22);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  const impact = await snapshot(page);
  expect(impact.mergerCount).toBeGreaterThan(5);
  expect(impact.bursts.length).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('cluster-smash-impact.png') });
  await page.getByRole('button', { name: 'Play simulation' }).click();
  await expect.poll(elapsed).toBeGreaterThan(0.8);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await page.screenshot({ path: testInfo.outputPath('cluster-smash-aftermath.png') });
});
