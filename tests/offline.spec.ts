import { test, expect } from './utils/auth';

test.describe('Offline Functionality', () => {
  test('Session queues when offline and syncs when online', async ({ authenticatedPage: page, context }) => {
    // 1. Start a study session online
    await page.goto('/dashboard');
    await page.click('button:has-text("Start Study")');
    await page.fill('input[placeholder="New subject…"]', 'Offline Testing');
    await page.click('button:has-text("Add")');
    await page.click('button:has-text("Until I stop")');
    await expect(page).toHaveURL(/\/timer/);
    
    // Wait for timer to tick a bit
    await page.waitForTimeout(2000);

    // 2. Go Offline
    await context.setOffline(true);
    
    // Wait to ensure offline state is caught by any listeners
    await page.waitForTimeout(1000);

    // 3. Complete the timer while offline
    await page.click('button[aria-label="Stop and save session"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 4. Verify data enters pending queue (check localStorage)
    const pendingSessionsStr = await page.evaluate(() => localStorage.getItem('study_pulse_pending_sessions'));
    expect(pendingSessionsStr).toBeTruthy();
    
    const pendingSessions = JSON.parse(pendingSessionsStr || '[]');
    expect(pendingSessions.length).toBeGreaterThan(0);
    expect(pendingSessions[0].subject_name).toBe('Offline Testing');

    // 5. Reload page while offline and verify pending data remains
    await page.reload();
    await page.waitForTimeout(1000);
    const pendingSessionsAfterReload = await page.evaluate(() => localStorage.getItem('study_pulse_pending_sessions'));
    expect(JSON.parse(pendingSessionsAfterReload || '[]').length).toBeGreaterThan(0);

    // 6. Restore network
    await context.setOffline(false);
    
    // Trigger sync (it should happen automatically on 'online' event, but we can also wait for it)
    await page.waitForTimeout(3000); // Give it time to sync

    // 7. Verify queue is emptied AFTER successful persistence
    const finalPendingSessions = await page.evaluate(() => localStorage.getItem('study_pulse_pending_sessions'));
    expect(JSON.parse(finalPendingSessions || '[]').length).toBe(0);

    // 8. Verify history contains the record
    await page.click('nav a[href="/history"]');
    await expect(page.locator('text=Offline Testing')).toBeVisible();
  });
});
