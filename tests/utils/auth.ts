import { test as base, Page } from '@playwright/test';
import path from 'path';

function attachForensicListeners(page: Page, errors: string[]) {
  page.on('pageerror', (err) => {
    if (!err.message.includes('access control checks')) {
      console.error(`[Page Error] ${err.message}`);
      errors.push(`Page Error: ${err.message}`);
    }
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
    // Ignore 500s from /api/ai since we intentionally simulate them in E2E tests
    if (response.status() >= 500 && !url.includes('/api/ai')) {
      console.error(`[5xx Response] ${url} - ${response.status()}`);
      errors.push(`5xx Response: ${url} - ${response.status()}`);
    }
  });
}

export const test = base.extend<{
  authenticatedPage: Page;
  authenticatedPage2: Page;
}>({
  authenticatedPage: async ({ browser }, use) => {
    const errors: string[] = [];
    const context = await browser.newContext({ storageState: path.join(__dirname, '../../playwright/.auth/primary.json') });
    const page = await context.newPage();
    
    attachForensicListeners(page, errors);
    
    await use(page);

    if (errors.length > 0) {
      throw new Error(`Frontend Forensics caught critical errors:\n${errors.join('\n')}`);
    }
    
    await context.close();
  },
  
  authenticatedPage2: async ({ browser }, use) => {
    const errors: string[] = [];
    const context = await browser.newContext({ storageState: path.join(__dirname, '../../playwright/.auth/secondary.json') });
    const page = await context.newPage();
    
    attachForensicListeners(page, errors);
    
    await use(page);

    if (errors.length > 0) {
      throw new Error(`Frontend Forensics caught critical errors:\n${errors.join('\n')}`);
    }
    
    await context.close();
  }
});

export { expect } from '@playwright/test';
