import { test, expect } from './utils/auth';

test.describe('AI Coach & Socratic Tutor', () => {

  test('Integration: Real Latency Measurement', async ({ authenticatedPage: page }) => {
    // We hit the real API to measure Gemini latency
    await page.goto('/dashboard');
    await page.click('button:has-text("Start Study")');
    const subjectName = 'Algorithms-' + Date.now();
    await page.fill('input[placeholder="New subject…"]', subjectName);
    await page.click('button:has-text("Add")');
    await page.click('button:has-text("Until I stop")');
    await page.waitForURL('**/timer');
    
    await page.click('button:has-text("Start Problem")');
    await page.fill('input[placeholder="e.g. Two Sum"]', 'Real Latency Problem');
    await page.selectOption('select:near(label:has-text("Platform"))', 'LeetCode');
    await page.click('button:has-text("Start Timer")');

    await expect(page.locator('text=Real Latency Problem')).toBeVisible();

    const start = Date.now();
    console.log(`AI request started: ${new Date(start).toISOString()}`);
    
    // Wait for the automatic content to resolve
    await expect(page.locator('text=Thinking...')).not.toBeVisible({ timeout: 15000 });
    
    const end = Date.now();
    console.log(`AI response received: ${new Date(end).toISOString()}`);
    console.log(`Latency: ${((end - start) / 1000).toFixed(3)}s`);

    // Clean up
    await page.locator('button[aria-label="Complete attempt"]').first().click();
    await page.click('button:has-text("Solved")');
    await page.click('button:has-text("Save Attempt")');
    await page.click('button[aria-label="Stop and save session"]');
  });

  test.describe('E2E Deterministic Behavior', () => {
    
    test.beforeEach(async ({ authenticatedPage: page }) => {
      // Block all AI requests by default during setup so we don't accidentally fetch
      // real content and poison the state before the test registers its own mock.
      await page.route('**/api/ai', route => route.abort('blockedbyclient'));
      
      await page.goto('/dashboard');
      await page.click('button:has-text("Start Study")');
      const subjectName = 'Algorithms-' + Date.now();
      await page.fill('input[placeholder="New subject…"]', subjectName);
      await page.click('button:has-text("Add")');
      await page.click('button:has-text("Until I stop")');
      await page.waitForURL('**/timer');
    });

    test.afterEach(async ({ authenticatedPage: page }) => {
      // Click stop if it exists
      const stopBtn = page.locator('button[aria-label="Stop and save session"]');
      if (await stopBtn.isVisible()) {
        await stopBtn.click();
      }
    });

    test('Handles Slow Request gracefully', async ({ authenticatedPage: page }) => {
      await page.route('/api/ai', async route => {
        await new Promise(r => setTimeout(r, 3000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ type: 'fact', content: 'Slow deterministic fact' })
        });
      });

      await page.click('button:has-text("Start Problem")');
      await page.fill('input[placeholder="e.g. Two Sum"]', 'Slow Problem');
      await page.selectOption('select:near(label:has-text("Platform"))', 'LeetCode');
      await page.click('button:has-text("Start Timer")');

      // Should eventually load the fact
      await expect(page.locator('text=Slow deterministic fact')).toBeVisible({ timeout: 5000 });
      
      await page.locator('button[aria-label="Complete attempt"]').first().click();
      await page.click('button:has-text("Solved")');
      await page.click('button:has-text("Save Attempt")');
    });

    test('Handles Timeout/504 gracefully', async ({ authenticatedPage: page }) => {
      // Simulate Next.js aborting the request after 10s or backend timeout
      await page.route('/api/ai', async route => {
        await route.fulfill({ status: 504, body: 'Gateway Timeout' });
      });

      await page.click('button:has-text("Start Problem")');
      await page.fill('input[placeholder="e.g. Two Sum"]', 'Timeout Problem');
      await page.click('button:has-text("Start Timer")');

      // The UI should show standard offline/error fallback
      await expect(page.locator('text=Monitoring your progress...')).toBeVisible();
      
      await page.locator('button[aria-label="Complete attempt"]').first().click();
      await page.click('button:has-text("Solved")');
      await page.click('button:has-text("Save Attempt")');
    });

    test('Handles Malformed Response gracefully', async ({ authenticatedPage: page }) => {
      await page.route('/api/ai', async route => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: 'NOT_A_VALID_JSON' });
      });

      await page.click('button:has-text("Start Problem")');
      await page.fill('input[placeholder="e.g. Two Sum"]', 'Malformed Problem');
      await page.click('button:has-text("Start Timer")');

      // Should handle JSON parse error gracefully without crashing React
      await expect(page.locator('text=Monitoring your progress...')).toBeVisible();
      
      await page.locator('button[aria-label="Complete attempt"]').first().click();
      await page.click('button:has-text("Solved")');
      await page.click('button:has-text("Save Attempt")');
    });

    test('Handles API 500 Failure gracefully', async ({ authenticatedPage: page }) => {
      await page.route('/api/ai', async route => {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Error' }) });
      });

      await page.click('button:has-text("Start Problem")');
      await page.fill('input[placeholder="e.g. Two Sum"]', '500 Problem');
      await page.click('button:has-text("Start Timer")');

      await expect(page.locator('text=Monitoring your progress...')).toBeVisible();
      
      await page.locator('button[aria-label="Complete attempt"]').first().click();
      await page.click('button:has-text("Solved")');
      await page.click('button:has-text("Save Attempt")');
    });

    test('Prevents repeated request spam', async ({ authenticatedPage: page }) => {
      let requestCount = 0;
      await page.route('/api/ai', async route => {
        requestCount++;
        await new Promise(r => setTimeout(r, 1000));
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ type: 'fact', content: 'Spam test' }) });
      });

      await page.click('button:has-text("Start Problem")');
      await page.fill('input[placeholder="e.g. Two Sum"]', 'Spam Problem');
      await page.click('button:has-text("Start Timer")');

      // Wait for initial auto-fetch
      await expect(page.locator('text=Spam test')).toBeVisible();
      const initialCount = requestCount;

      // Click "Ask for Help" multiple times rapidly
      const helpButton = page.locator('button:has-text("Ask for Help")');
      await helpButton.click();
      await helpButton.click({ force: true }).catch(() => {});
      await helpButton.click({ force: true }).catch(() => {});
      
      // Since UI should disable button while loading, the second clicks should either be blocked or ignored
      // We expect the requestCount to increment exactly by 1 for the hint
      await expect(page.locator('text=Spam test').nth(1)).toBeVisible({ timeout: 5000 }).catch(() => {});
      
      expect(requestCount).toBe(initialCount + 1);

      await page.locator('button[aria-label="Complete attempt"]').first().click();
      await page.click('button:has-text("Solved")');
      await page.click('button:has-text("Save Attempt")');
    });

    test('AI works (or degrades gracefully) offline', async ({ authenticatedPage: page }) => {
      // Mock navigator.onLine and network state reliably
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'onLine', { get: () => false });
      });
      await page.context().setOffline(true);
      await page.route('/api/ai', route => route.abort('internetdisconnected'));
      await page.evaluate(() => window.dispatchEvent(new Event('offline')));
      
      // Create problem while offline
      await page.click('button:has-text("Start Problem")');
      await page.fill('input[placeholder="e.g. Two Sum"]', 'Offline Problem');
      await page.click('button:has-text("Start Timer")');

      // It should display offline fallback
      await expect(page.locator('text="Offline"')).toBeVisible();
      await expect(page.locator('text=AI coach unavailable while offline.')).toBeVisible();

      await expect(page.locator('button', { hasText: 'Ask for Help' })).not.toBeVisible();

      await page.context().setOffline(false);
      
      await page.locator('button[aria-label="Complete attempt"]').first().click();
      await page.click('button:has-text("Solved")');
      await page.click('button:has-text("Save Attempt")');
    });

  });
});
