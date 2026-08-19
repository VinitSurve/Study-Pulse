import { test, expect } from './utils/auth';

test.describe('Authentication & Basic Navigation', () => {
  test('User can sign up, log in, and access dashboard', async ({ authenticatedPage }) => {
    // The authenticatedPage fixture automatically signs up a user and lands on /dashboard
    await expect(authenticatedPage).toHaveURL(/\/dashboard/);
    
    // Verify Dashboard basic layout elements are present
    const welcomeText = authenticatedPage.locator('text=Ready to focus');
    await expect(welcomeText).toBeVisible();

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
