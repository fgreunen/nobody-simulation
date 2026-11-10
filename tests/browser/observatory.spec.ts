import { test, expect, type Page } from '@playwright/test';

const snapshot = (page: Page) => page.evaluate(() => (window as any).__observatory.snapshot());
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
}

test('inspects a star, transfers the inspector after contact, and exactly resets', async ({ page }, testInfo) => {
  await ready(page);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  const initial = await snapshot(page);
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
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  const reset = await snapshot(page);
  expect(reset.positions).toEqual(initial.positions); expect(reset.masses).toEqual(initial.masses); expect(reset.stars).toEqual(initial.stars);
  expect(reset.activeCount).toBe(100); expect(reset.bursts).toEqual([]); expect(reset.radiatedMass).toBe(0);
});

test('renders WebGPU at fixed 720p with no page errors', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  await expect(page.locator('canvas')).toHaveAttribute('width', '1280');
  await expect(page.locator('canvas')).toHaveAttribute('height', '720');
  await expect(page.getByRole('button', { name: 'Pause simulation' })).toBeEnabled();
  expect((await snapshot(page)).count).toBe(100);
  await page.screenshot({ path: testInfo.outputPath('curated-cluster.png') });
  await expect(page.locator('#rate')).toContainText('yr/s');
  const cameraControls = page.locator('footer').getByRole('navigation', { name: 'Camera controls' });
  const sceneControls = page.getByRole('group', { name: 'Simulation controls' });
  await expect(sceneControls.getByRole('button', { name: 'Reset', exact: true })).toBeVisible();
  await expect(cameraControls.getByRole('button', { name: 'Pause simulation' })).toBeVisible();
  await expect(cameraControls.getByLabel('Simulation speed')).toBeVisible();
  await expect(sceneControls.locator('#pause, #speed')).toHaveCount(0);
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
  expect(errors).toEqual([]);
});

test('stages scene settings, generates a new seed, and exactly resets positions', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
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
  const initial = await page.evaluate(() => {
    document.getElementById('reset')!.click();
    return (window as any).__observatory.snapshot();
  });
  await page.getByRole('button', { name: 'Play simulation' }).click();
  await page.waitForTimeout(300);
  const reset = await page.evaluate(() => {
    document.getElementById('reset')!.click();
    return (window as any).__observatory.snapshot();
  });
  expect(reset.positions).toEqual(initial.positions);
  expect(reset.velocities).toEqual(initial.velocities);
  // Capture reset and pose synchronously, before cinematic viewing resumes.
  for (let axis = 0; axis < 3; axis++) expect(reset.camera[axis]).toBeCloseTo(initial.camera[axis], 3);
  expect(reset.paused).toBe(true);
  expect(reset.time).toBe(0);
});

test('pause and speed work while camera takeover, follow, pan and recenter remain independent', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  const paused = await snapshot(page);
  await page.waitForTimeout(150);
  expect((await snapshot(page)).time).toBe(paused.time);
  const speed = page.getByRole('slider', { name: 'Simulation speed', exact: true });
  await expect(speed).toHaveAttribute('min', '0.25'); await expect(speed).toHaveAttribute('max', '100');
  await speed.fill('10'); expect((await snapshot(page)).speed).toBe(10);
  await expect(page.locator('#speed-value')).toHaveText('10×');
  await speed.focus(); await page.keyboard.press('End');
  expect((await snapshot(page)).speed).toBe(100);
  await expect(page.locator('#speed-value')).toHaveText('100×');
  await expect(speed).toHaveAttribute('aria-valuetext', '100×');
  await page.keyboard.press('Home'); expect((await snapshot(page)).speed).toBe(0.25);
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
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
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
  await expect(page.getByRole('complementary', { name: 'Selected star' })).toContainText('Enhanced mergers');
  await expect.poll(async () => (await snapshot(page)).mergerCount, { timeout: 15000 }).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  const merged = await snapshot(page);
  expect(merged.activeCount).toBeLessThan(100);
  expect(merged.bursts.length).toBeGreaterThan(0);
  await expect(page.locator('#body-count')).toHaveText(String(merged.activeCount));
  await expect(page.locator('#merger-count')).toHaveText(String(merged.mergerCount));
  await page.screenshot({ path: testInfo.outputPath('enhanced-merger.png') });
});


test('stages each scenario and resets the generated realization while preserving pending edits', async ({ page }, testInfo) => {
  await ready(page);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  for (const [id, name] of [['cold-collapse', 'Cold collapse'], ['expanding-association', 'Expanding association'], ['cluster-encounter', 'Two clusters meeting']]) {
    const before = await snapshot(page);
    await page.getByLabel('Scenario', { exact: true }).selectOption(id);
    expect((await snapshot(page)).scenario).toBe(before.scenario);
    await expect(page.locator('#form-note')).toContainText('New settings');
    await page.getByRole('button', { name: 'Generate scene' }).click();
    expect((await snapshot(page)).scenario).toBe(id);
    await expect(page.locator('.preset strong')).toHaveText(name);
    const initial = await page.evaluate(() => {
      document.getElementById('reset')!.click();
      return (window as any).__observatory.snapshot();
    });
    await page.getByRole('button', { name: 'Play simulation' }).click();
    await expect.poll(async () => (await snapshot(page)).time).toBeGreaterThan(0);
    await page.getByLabel('Scenario', { exact: true }).selectOption('open-cluster');
    const reset = await page.evaluate(() => {
      document.getElementById('reset')!.click();
      return (window as any).__observatory.snapshot();
    });
    expect(reset.positions).toEqual(initial.positions);
    expect(reset.velocities).toEqual(initial.velocities);
    expect(reset.scenario).toBe(id);
    expect(reset.paused).toBe(true);
    await expect(page.getByLabel('Scenario', { exact: true })).toHaveValue('open-cluster');
  }
  await page.getByLabel('Scenario', { exact: true }).selectOption('cluster-encounter');
  await page.screenshot({ path: testInfo.outputPath('cluster-encounter.png') });
});
