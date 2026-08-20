import { test, expect } from './utils/auth';

test.describe('Two-Timer Semantics', () => {
  test('Validates the strict interaction semantics between Study and DSA timers', async ({ authenticatedPage: page }) => {
    // Start Study Timer
    await page.goto('/dashboard');
    await page.click('button:has-text("Start Study")');
    await page.fill('input[placeholder="New subject…"]', 'Math');
    await page.click('button:has-text("Add")');
    await page.click('button:has-text("Until I stop")');
    await expect(page).toHaveURL(/\/timer/);

    // Start DSA Timer
    await page.click('button:has-text("Start Problem")');
    await page.fill('input[placeholder="e.g. Two Sum"]', 'Test Problem');
    await page.selectOption('select:near(label:has-text("Platform"))', 'LeetCode');
    await page.click('button:has-text("Start Timer")');
    
    // Wait for both to be running
    await expect(page.locator('text=Test Problem')).toBeVisible();

    const studyTimerDisplay = page.locator('.font-mono').first();
    const dsaTimerDisplay = page.locator('.font-mono').nth(1);

    // CASE A: Both advance independently
    const studyTime1 = await studyTimerDisplay.innerText();
    const dsaTime1 = await dsaTimerDisplay.innerText();
    await page.waitForTimeout(1500);
    const studyTime2 = await studyTimerDisplay.innerText();
    const dsaTime2 = await dsaTimerDisplay.innerText();
    
    expect(studyTime1).not.toEqual(studyTime2);
    expect(dsaTime1).not.toEqual(dsaTime2);

    // CASE B: Pause Study -> DSA automatically pauses
    const studyPauseButton = page.locator('button[aria-label="Pause"]').first();
    await studyPauseButton.click();
    
    // Wait for both to show "Paused"
    await expect(page.locator('text=Paused')).toHaveCount(2);

    const studyPausedTime1 = await studyTimerDisplay.innerText();
    const dsaPausedTime1 = await dsaTimerDisplay.innerText();
    await page.waitForTimeout(1500);
    const studyPausedTime2 = await studyTimerDisplay.innerText();
    const dsaPausedTime2 = await dsaTimerDisplay.innerText();
    
    expect(studyPausedTime1).toEqual(studyPausedTime2);
    expect(dsaPausedTime1).toEqual(dsaPausedTime2);

    // CASE C: Resume Study -> DSA MUST remain paused
    const studyResumeButton = page.locator('button[aria-label="Resume"]').first();
    await studyResumeButton.click();
    
    // Now only ONE timer (DSA) should be paused
    await expect(page.locator('text=Paused')).toHaveCount(1);

    await page.waitForTimeout(1500);
    const studyResumedTime = await studyTimerDisplay.innerText();
    const dsaStillPausedTime = await dsaTimerDisplay.innerText();
    
    expect(studyResumedTime).not.toEqual(studyPausedTime2);
    expect(dsaStillPausedTime).toEqual(dsaPausedTime2); // DSA shouldn't move

    // CASE D: Pause DSA -> Study continues
    // First resume DSA
    const dsaResumeButton = page.locator('button[aria-label="Resume"]').first();
    await dsaResumeButton.click();
    await expect(page.locator('text=Paused')).toHaveCount(0);

    // Now pause DSA
    const dsaPauseButton = page.locator('button[aria-label="Pause"]').nth(1);
    await dsaPauseButton.click();
    
    // Only DSA is paused again
    await expect(page.locator('text=Paused')).toHaveCount(1);

    // CASE E: Try to stop Study while DSA attempt is active -> blocked
    const studyStopButton = page.locator('button[aria-label="Stop and save session"]').first();
    
    // Playwright handles dialogs automatically by dismissing them, but we can accept and verify it was triggered
    let alertTriggered = false;
    page.on('dialog', async dialog => {
      alertTriggered = true;
      expect(dialog.message()).toContain('active problem attempt');
      await dialog.accept();
    });
    
    await studyStopButton.click();
    expect(alertTriggered).toBeTruthy();
    
    // We should still be on /timer
    await expect(page).toHaveURL(/\/timer/);

    // Clean up: Complete DSA so we can stop Study
    const dsaCompleteButton = page.locator('button[aria-label="Complete attempt"]').first();
    await dsaCompleteButton.click();
    await page.click('button:has-text("Save Attempt")');
    await expect(page.locator('h2:has-text("Test Problem")')).not.toBeVisible();

    // Now stop Study
    await studyStopButton.click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('Validates refresh recovery semantics (localStorage timestamps)', async ({ authenticatedPage: page }) => {
    // 1. Start Study Timer
    await page.goto('/dashboard');
    await page.click('button:has-text("Start Study")');
    await page.fill('input[placeholder="New subject…"]', 'Physics');
    await page.click('button:has-text("Add")');
    await page.click('button:has-text("Until I stop")');
    await expect(page).toHaveURL(/\/timer/);

    // 2. Start DSA Timer
    await page.click('button:has-text("Start Problem")');
    await page.fill('input[placeholder="e.g. Two Sum"]', 'Refresh Problem');
    await page.selectOption('select:near(label:has-text("Platform"))', 'LeetCode');
    await page.click('button:has-text("Start Timer")');

    // 3. Wait for both to be running
    await expect(page.locator('text=Refresh Problem')).toBeVisible();
    await page.waitForTimeout(2000);

    const studyTimerDisplay = page.locator('.font-mono').first();
    const dsaTimerDisplay = page.locator('.font-mono').nth(1);

    // Capture time before refresh
    const studyTime1 = await studyTimerDisplay.innerText();
    const dsaTime1 = await dsaTimerDisplay.innerText();

    // 4. Refresh while running
    await page.reload();
    
    // Wait for components to mount and calculate from timestamp
    await page.waitForTimeout(1000);
    
    // Timers should still be running and advanced
    const studyTime2 = await studyTimerDisplay.innerText();
    const dsaTime2 = await dsaTimerDisplay.innerText();
    
    expect(studyTime2).not.toEqual('00:00');
    expect(dsaTime2).not.toEqual('00:00');
    expect(studyTime2).not.toEqual(studyTime1); // Should have advanced during reload

    // 5. Pause Study (which pauses DSA)
    await page.locator('button[aria-label="Pause"]').first().click();
    await expect(page.locator('text=Paused')).toHaveCount(2);

    // 6. Refresh while paused
    await page.reload();
    await page.waitForTimeout(1000);

    // Both should still be paused
    await expect(page.locator('text=Paused')).toHaveCount(2);
    
    // Cleanup
    await page.locator('button[aria-label="Stop and save session"]').click();
  });
});
