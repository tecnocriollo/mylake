import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  timeout: 120000, // 2 min por test
  expect: {
    timeout: 30000, // 30 seg para assertions
  },
  use: {
    baseURL: 'http://207.180.223.160:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Configuración para Monaco Editor
    bypassCSP: true,
    launchOptions: {
      args: [
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--max-old-space-size=4096',
      ],
    },
    // Más tiempo para carga de recursos
    navigationTimeout: 60000,
    actionTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});