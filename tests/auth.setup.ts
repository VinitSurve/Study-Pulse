import { test as setup, expect } from '@playwright/test';
import path from 'path';

const PRIMARY_AUTH = path.join(__dirname, '../playwright/.auth/primary.json');
const SECONDARY_AUTH = path.join(__dirname, '../playwright/.auth/secondary.json');

async function setupUser(browser: any, email: string, password: string, statePath: string) {
  console.log(`Setting up user: ${email}`);
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('/signup');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  } catch {
    // If it didn't redirect to dashboard, we assume it failed
  }

  const url = page.url();
  if (!url.includes('/dashboard')) {
    // We didn't redirect, so an error alert must be present
    const alert = page.locator('.text-error[role="alert"]');
    
    // Wait for the text to actually appear in the alert
    let errorText = await alert.textContent();
    for (let i = 0; i < 10; i++) {
      if (errorText && errorText.trim().length > 0) break;
      await page.waitForTimeout(500);
      errorText = await alert.textContent();
    }
    
    if (errorText?.includes('User already registered') || errorText?.includes('already exists')) {
      console.log(`User ${email} already exists. Proceeding to login.`);
      await page.goto('/login');
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    } else if (errorText?.includes('rate limit') || errorText?.toLowerCase().includes('too many requests')) {
      throw new Error(`ENV-BLOCKED: Supabase Auth Rate Limit hit during signup for ${email}`);
    } else {
      throw new Error(`Signup failed for ${email} with unexpected error: ${errorText}`);
    }
  }

  // Ensure we are fully logged in and on the dashboard before saving state
  await expect(page).toHaveURL(/.*\/dashboard/);
  await page.waitForLoadState('networkidle');

  // Save the storage state
  await context.storageState({ path: statePath });
  console.log(`Successfully saved storage state for ${email} to ${statePath}`);
  
  await context.close();
}

setup('authenticate primary and secondary users', async ({ browser }) => {
  // Use dedicated generic emails for E2E testing
  await setupUser(browser, 'e2e_primary@example.com', 'TestPassword123!', PRIMARY_AUTH);
  await setupUser(browser, 'e2e_secondary@example.com', 'TestPassword123!', SECONDARY_AUTH);
});
