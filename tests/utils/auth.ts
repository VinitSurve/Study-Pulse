import { test as base, Page } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

export const test = base.extend<{
  authenticatedPage: Page;
}>({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    
    page.on('pageerror', (err) => {
      console.error(`[Page Error] ${err.message}`);
      errors.push(`Page Error: ${err.message}`);
    });
    
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' && !text.includes('ERR_INTERNET_DISCONNECTED')) {
        console.error(`[Console Error] ${text}`);
        if (text.includes('Hydration') || text.toLowerCase().includes('unhandled promise') || text.includes('React error') || text.includes('Failed to save attempt')) {
           errors.push(`Critical Console Error: ${text}`);
        }
      } else if (type === 'warning') {
        console.warn(`[Console Warn] ${text}`);
      }
    });
    
    page.on('requestfailed', (request) => {
      const failure = request.failure();
      const url = request.url();
      if (failure && failure.errorText !== 'net::ERR_INTERNET_DISCONNECTED') {
        console.error(`[Request Failed] ${url}: ${failure.errorText}`);
      }
    });
    
    page.on('response', (response) => {
      const url = response.url();
      if (response.status() >= 500 && !url.includes('/api/ai/simulate-offline')) {
        console.error(`[5xx Response] ${url} - ${response.status()}`);
        errors.push(`5xx Response: ${url} - ${response.status()}`);
      }
    });

    await use(page);

    if (errors.length > 0) {
      throw new Error(`Frontend Forensics caught critical errors:\\n${errors.join('\\n')}`);
    }
  },
  authenticatedPage: async ({ page }, use) => {
    const testId = uuidv4().substring(0, 8);
    const email = `test-${testId}@example.com`;
    const password = 'TestPassword123!';

    // Sign up a new user to isolate data
    await page.goto('/signup');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
    
    await use(page);
  }
});

export { expect } from '@playwright/test';
