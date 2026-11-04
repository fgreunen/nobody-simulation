import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  use: {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    baseURL: 'http://127.0.0.1:5187',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: { command: 'npm run dev -- --port 5187 --strictPort', url: 'http://127.0.0.1:5187', reuseExistingServer: true },
});
