import { test, expect } from './utils/auth';

test.describe('Authentication & Basic Navigation', () => {
  test('User can sign up, log in, and access dashboard', async ({ authenticatedPage }) => {
    // The authenticatedPage fixture automatically signs in, but we still need to navigate
    await authenticatedPage.goto('/dashboard');
    await expect(authenticatedPage).toHaveURL(/\/dashboard/);
    
    // Verify Dashboard basic layout elements are present
    const startStudyBtn = authenticatedPage.locator('button:has-text("Start Study")');
    await expect(startStudyBtn).toBeVisible();

    // Verify Bottom Navigation exists and works
    const historyLink = authenticatedPage.locator('nav a[href="/history"]');
    await expect(historyLink).toBeVisible();
    await historyLink.click();
    await expect(authenticatedPage).toHaveURL(/\/history/);

    const statsLink = authenticatedPage.locator('nav a[href="/stats"]');
    await statsLink.click();
    await expect(authenticatedPage).toHaveURL(/\/stats/);
  });
});
