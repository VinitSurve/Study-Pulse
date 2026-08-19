import { test, expect } from './utils/auth';

test.describe('Study Timer E2E', () => {
  test('Complete timer lifecycle with persistence', async ({ authenticatedPage: page }) => {
    // 1. Start a Study Timer
    await page.goto('/dashboard');
    
    await page.click('button:has-text("Start Study")');
    await page.fill('input[placeholder="New subject…"]', 'Computer Science');
    await page.click('button:has-text("Add")');
    await page.click('button:has-text("Until I stop")');

    // 2. Verify timer appears and URL is /timer
    await expect(page).toHaveURL(/\/timer/);
    const subjectName = page.locator('text=Computer Science');
    await expect(subjectName).toBeVisible();

    // 3. Verify time advances
    // Get initial time string (e.g. "01:00:00")
    const timerDisplay = page.locator('.font-mono').first();
    const initialTime = await timerDisplay.innerText();
    
    // Wait slightly more than 1 second
    await page.waitForTimeout(1500);
    const advancedTime = await timerDisplay.innerText();
    expect(initialTime).not.toEqual(advancedTime); // Should have ticked down

    // 4. Refresh page and verify timer survives
    await page.reload();
    await expect(page).toHaveURL(/\/timer/);
    await expect(page.locator('text=Computer Science')).toBeVisible();
    
    // 5. Pause the timer
    await page.click('button[aria-label="Pause"]');
    await expect(page.locator('text=Paused').first()).toBeVisible();

    // Verify it stops advancing
    const pausedTime1 = await timerDisplay.innerText();
    await page.waitForTimeout(1500);
    const pausedTime2 = await timerDisplay.innerText();
    expect(pausedTime1).toEqual(pausedTime2);

    // 6. Resume the timer
    await page.click('button[aria-label="Resume"]');
    await expect(page.locator('text=Paused')).not.toBeVisible();
    await page.waitForTimeout(1500);
    const resumedTime = await timerDisplay.innerText();
    expect(resumedTime).not.toEqual(pausedTime2);

    // 7. Stop the timer and verify completion
    await page.click('button[aria-label="Stop and save session"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 8. Verify history contains the session
    await page.click('nav a[href="/history"]');
    await expect(page).toHaveURL(/\/history/);
    await expect(page.locator('text=Computer Science').first()).toBeVisible();
  });
});
