import { test, expect } from './utils/auth';

test.describe('DSA Analytics', () => {
  test('Deterministically calculates and separates platform analytics', async ({ authenticatedPage: page }) => {
    test.setTimeout(60000); // 7 sequential UI attempts take > 30s
    // 1. Start a generic study session ONCE
    await page.goto('/dashboard');
    await page.click('button:has-text("Start Study")');
    const subjectName = 'Testing-' + Date.now();
    await page.fill('input[placeholder="New subject…"]', subjectName);
    await page.click('button:has-text("Add")');
    await page.click('button:has-text("Until I stop")');
    await page.waitForURL('**/timer');
    
    // Helper to create a DSA attempt
    const createAttempt = async (platform: string, problem: string, solved: boolean) => {
      // Ensure we are ready to start a problem (button is visible)
      await expect(page.locator('button:has-text("Start Problem")')).toBeVisible();
      
      await page.click('button:has-text("Start Problem")');
      await page.fill('input[placeholder="e.g. Two Sum"]', problem);
      await page.selectOption('select:near(label:has-text("Platform"))', platform === 'Other' ? 'Other' : platform);
      if (platform === 'Other') {
        await page.fill('input[placeholder="Enter platform name"]', platform);
      }
      await page.selectOption('select:near(label:has-text("Difficulty"))', 'Easy');
      await page.click('button:has-text("Start Timer")');

      // Wait a tiny bit so duration > 0
      await page.waitForTimeout(1000);

      await page.locator('button[aria-label="Complete attempt"]').first().click();
      
      if (solved) {
        await page.click('button:has-text("Solved")');
      } else {
        await page.click('button:has-text("Couldn\'t Solve")');
      }

      await page.click('button:has-text("Save Attempt")');
      
      // Wait for the drawer to close and the Start Problem button to reappear
      await expect(page.locator('button:has-text("Start Problem")')).toBeVisible({ timeout: 10000 });
    };

    // Create LeetCode: 2 solved, 1 failed
    await createAttempt('LeetCode', 'Two Sum', true);
    await createAttempt('LeetCode', 'Three Sum', true);
    await createAttempt('LeetCode', 'Four Sum', false);

    // Create HackerRank: 4 solved
    await createAttempt('HackerRank', 'Array Sum', true);
    await createAttempt('HackerRank', 'Matrix Sum', true);
    await createAttempt('HackerRank', 'Tree Sum', true);
    await createAttempt('HackerRank', 'Graph Sum', true);

    // Stop the study timer so it's clean
    await page.click('button[aria-label="Stop and save session"]');

    // Wait for all syncs
    await page.waitForTimeout(2000);

    // Check Analytics
    await page.goto('/stats/dsa');
    
    // LeetCode should show 67% solved (2/3)
    const leetCodeText = await page.locator('div:has-text("LeetCode") >> text=67% Solved (2/3)').isVisible();
    expect(leetCodeText).toBeTruthy();

    // HackerRank should show 100% solved (4/4)
    const hackerRankText = await page.locator('div:has-text("HackerRank") >> text=100% Solved (4/4)').isVisible();
    expect(hackerRankText).toBeTruthy();

    // Total attempts should be 7
    await expect(page.locator('text=Total Attempts').locator('xpath=following-sibling::span')).toHaveText('7');
    
    // Total solved should be 6
    await expect(page.locator('text=Solved').first().locator('xpath=following-sibling::span')).toHaveText('6');
  });
});
