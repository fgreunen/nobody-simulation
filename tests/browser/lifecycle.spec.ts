import { test, expect } from '@playwright/test';

test('hidden-document handling stops simulation and returning does not catch up', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  // Automated Chrome can keep multiple pages visible. Inject the browser's visibility
  // boundary so the application branch is deterministic, without changing app code.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const before = await page.evaluate(() => (window as any).__observatory.snapshot().time);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => (window as any).__observatory.snapshot().time)).toBe(before);
  await page.evaluate(() => {
    delete (document as any).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => (window as any).__observatory.snapshot().time);
  expect(after - before).toBeLessThan(0.06);
});
