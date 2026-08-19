import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially or isolated enough to avoid data clashes
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Ensure single worker to prevent DB races since we share a test database
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Mobile',
      use: { 
        ...devices['iPhone 13'], // 390x844
      },
    },
    {
      name: 'Tablet',
      use: { 
        ...devices['iPad Mini'], // 768x1024
      },
    },
    {
      name: 'Desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
