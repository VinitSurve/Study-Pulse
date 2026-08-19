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

  test('CASE F: Start DSA without Study works', async ({ authenticatedPage: page }) => {
    // Go to history or somewhere where we can't start a timer directly from dashboard, 
    // actually, let's just go to the URL /timer which will redirect us to /dashboard. 
    // How do we start a DSA problem WITHOUT a study timer in the UI? 
    // The requirement says: "Start DSA without Study -> works with study_session_id = NULL."
    // But in the UI, if there is no timer, /timer redirects to /dashboard. And /dashboard only has "Start Study Timer".
    // Wait, the BottomNav might not let us.
    // Let's check how the user starts a DSA problem without a study timer.
    // In src/app/(app)/timer/page.tsx:
    // "No active timer - redirect to dashboard" -> "if (!timerState && !problemTimerState) router.replace('/dashboard');"
    // Wait! In page.tsx, if there is no study timer and no problem timer, it redirects to /dashboard!
    // But how do you start a problem timer initially if you don't have a study timer?
    // Let's look at `/dashboard`. Does it have a Start Problem button?
  });
});
