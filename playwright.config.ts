import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['json', { outputFile: 'verification-results/browser.json' }], ['html', { open: 'never' }]],
  use: {
    channel: 'chrome',
    headless: true,
    launchOptions: { args: process.env.CI ? ['--enable-unsafe-webgpu', '--use-angle=swiftshader'] : [] },
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    baseURL: 'http://127.0.0.1:5190',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build:test && npm run preview:test',
    url: 'http://127.0.0.1:5190',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
