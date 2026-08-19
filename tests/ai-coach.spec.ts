import { test, expect } from './utils/auth';

test.describe('AI Coach & Socratic Tutor', () => {
  test('AI provides contextual automatic content and escalating hints', async ({ authenticatedPage: page }) => {
    // 1. Start a DSA Problem
    await page.goto('/dashboard');
    await page.click('button:has-text("Start Study")');
    await page.fill('input[placeholder="New subject…"]', 'Algorithms');
    await page.click('button:has-text("Add")');
    await page.click('button:has-text("Until I stop")');
    
    await page.click('button:has-text("Start Problem")');
    await page.fill('input[placeholder="e.g. Two Sum"]', 'Graph Traversal');
    await page.selectOption('select:near(label:has-text("Platform"))', 'LeetCode');
    await page.selectOption('select:near(label:has-text("Difficulty"))', 'Hard');
    await page.click('button:has-text("Start Timer")');

    // 2. Verify AI Coach panel is visible
    await expect(page.locator('text=AI Coach')).toBeVisible();

    // The automatic content fetches on mount. It might take a few seconds.
    // Wait for the thinking state to resolve to some content
    await expect(page.locator('text=Thinking...')).not.toBeVisible({ timeout: 10000 });
    
    // Automatic content doesn't have "Ask for Help" button, wait, YES it does if a problem is active.
    const hintButton = page.locator('button', { hasText: 'Ask for Help' });
    await expect(hintButton).toBeVisible();

    // 3. Test Socratic Hint Ladder
    // Level 1: Ask for Help -> Should return a question
    await hintButton.click();
    await expect(page.locator('text=Thinking...')).toBeVisible();
    await expect(page.locator('text=Thinking...')).not.toBeVisible({ timeout: 15000 });
    
    // The button text should change to 'Think With Me'
    await expect(page.locator('button', { hasText: 'Think With Me' })).toBeVisible();

    // The AI response for Level 1 should be visible (a question)
    // We can't strictly assert the exact text, but we know the structure renders a question with border-l-2
    await expect(page.locator('.border-l-2.border-accent')).toBeVisible();

    // Level 2: Think With Me
    await page.click('button:has-text("Think With Me")');
    await expect(page.locator('text=Thinking...')).toBeVisible();
    await expect(page.locator('text=Thinking...')).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator('button', { hasText: 'Give Me a Hint' })).toBeVisible();

    // Clean up
    await page.locator('button[aria-label="Complete attempt"]').first().click();
    await page.click('button:has-text("Save Attempt")');
    await page.click('button[aria-label="Stop and save session"]');
  });

  test('AI works (or degrades gracefully) offline', async ({ authenticatedPage: page, context }) => {
    await page.goto('/dashboard');
    await page.click('button:has-text("Start Study")');
    await page.fill('input[placeholder="New subject…"]', 'Algorithms');
    await page.click('button:has-text("Add")');
    await page.click('button:has-text("Until I stop")');

    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // It should display offline fallback
    await expect(page.locator('text=Offline')).toBeVisible();
    await expect(page.locator('text=AI coach unavailable while offline.')).toBeVisible();

    // Attempting to ask for help should be blocked or safely ignored
    // The button shouldn't render if offline
    await expect(page.locator('button', { hasText: 'Ask for Help' })).not.toBeVisible();

    await context.setOffline(false);
  });
});
