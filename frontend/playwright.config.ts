import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 900 },
    trace: 'on',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm --prefix ../backend run dev',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
