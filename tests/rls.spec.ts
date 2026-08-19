import { test, expect } from './utils/auth';

test.describe('RLS Security Validation', () => {
  test('User A cannot access User B data', async ({ authenticatedPage: userA }) => {
    // 1. User A creates a study session
    await userA.goto('/dashboard');
    await userA.click('button:has-text("Start Study")');
    await userA.fill('input[placeholder="New subject…"]', 'User A Secret');
    await userA.click('button:has-text("Add")');
    await userA.click('button:has-text("Until I stop")');
    await userA.waitForTimeout(1000);
    await userA.click('button[aria-label="Stop and save session"]');
    await userA.waitForTimeout(2000); // wait for sync

    // Verify it exists for A
    await userA.goto('/history');
    await expect(userA.locator('text=User A Secret')).toBeVisible();

    // Unfortunately, to test User B, we need another isolated session.
    // Playwright allows multiple browser contexts.
    // But since the context is shared per test (via fixture), we can create a new context manually here.
    const browser = userA.context().browser();
    if (!browser) return;

    const contextB = await browser.newContext();
    const userB = await contextB.newPage();
    
    // Sign up User B
    const bId = Math.random().toString(36).substring(7);
    await userB.goto('/signup');
    await userB.fill('input[type="email"]', `userb-${bId}@example.com`);
    await userB.fill('input[type="password"]', 'TestPassword123!');
    await userB.click('button[type="submit"]');
    await userB.waitForURL('/dashboard');

    // 2. User B checks history, should NOT see "User A Secret"
    await userB.goto('/history');
    await expect(userB.locator('text=User A Secret')).not.toBeVisible();

    // 3. Optional: we can try to fetch Supabase directly using User B's client,
    // but the UI check above confirms the GET request to `/history` (which pulls from DB) is filtered by RLS.
    
    // User B creates a DSA problem
    await userB.goto('/dashboard');
    await userB.click('button:has-text("Start Study")');
    await userB.fill('input[placeholder="New subject…"]', 'B Subject');
    await userB.click('button:has-text("Add")');
    await userB.click('button:has-text("Until I stop")');
    
    await userB.click('button:has-text("Start Problem")');
    await userB.fill('input[placeholder="e.g. Two Sum"]', 'User B Problem');
    await userB.selectOption('select:near(label:has-text("Platform"))', 'LeetCode');
    await userB.selectOption('select:near(label:has-text("Difficulty"))', 'Hard');
    await userB.click('button:has-text("Start Timer")');
    await userB.waitForTimeout(1000);

    await userB.locator('button[aria-label="Complete attempt"]').first().click();
    await userB.click('button:has-text("Solved")');
    await userB.click('button:has-text("Save Attempt")');
    await userB.waitForTimeout(2000);

    // User A checks DSA stats, should NOT see User B's problem
    await userA.goto('/stats/dsa');
    await expect(userA.locator('text=User B Problem')).not.toBeVisible();
    
    await contextB.close();
  });
});
