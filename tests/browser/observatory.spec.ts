import { test, expect, type Page } from '@playwright/test';

const snapshot = (page: Page) => page.evaluate(() => (window as any).__observatory.snapshot());
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
}

test('renders hardware WebGPU at fixed 720p with no page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  await expect(page.locator('canvas')).toHaveAttribute('width', '1280');
  await expect(page.locator('canvas')).toHaveAttribute('height', '720');
  await expect(page.getByRole('button', { name: 'Pause simulation' })).toBeEnabled();
  expect((await snapshot(page)).count).toBe(100);
  await page.waitForTimeout(1500);
  expect((await snapshot(page)).time).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('stages scene settings, generates a new seed, and exactly resets positions', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  const before = await snapshot(page);
  await page.locator('#count').fill('40');
  expect((await snapshot(page)).count).toBe(100);
  await page.getByRole('button', { name: 'Generate scene' }).click();
  const generated = await snapshot(page);
  expect(generated.count).toBe(40);
  expect(generated.seed).not.toBe(before.seed);
  expect(generated.masses.reduce((a: number, b: number) => a + b, 0)).toBeCloseTo(1, 12);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  const initial = await snapshot(page);
  await page.getByRole('button', { name: 'Play simulation' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  const reset = await snapshot(page);
  expect(reset.positions).toEqual(initial.positions);
  expect(reset.velocities).toEqual(initial.velocities);
  // Cinematic viewing can continue while physics is paused; the reset pose is restored.
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
  await page.getByLabel('Simulation speed', { exact: true }).selectOption('2');
  expect((await snapshot(page)).speed).toBe(2);
  const canvas = page.locator('canvas');
  const rect = (await canvas.boundingBox())!;
  await page.mouse.move(rect.x + rect.width * 0.7, rect.y + rect.height * 0.4);
  await page.mouse.down(); await page.mouse.move(rect.x + rect.width * 0.75, rect.y + rect.height * 0.5, { steps: 8 }); await page.mouse.up();
  expect((await snapshot(page)).cinematic).toBe(false);
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

