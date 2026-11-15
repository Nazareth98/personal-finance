import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/tests/pwa-production',
  reporter: 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices['Desktop Chrome'],
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined },
    channel: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? undefined : 'chromium',
    baseURL: 'http://127.0.0.1:4174',
    locale: 'pt-BR',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'pnpm --filter @personal-finance/tokens build && pnpm --filter @personal-finance/web build && node apps/web/node_modules/vite/bin/vite.js preview apps/web --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 120_000
  }
});
