import { test, expect } from '@playwright/test';

test.describe('Phase 12.5.7: Security Bridge Leak Test', () => {
  test('Bridge messages do not contain ext_ credentials or Authorization tokens', async ({ page }) => {
    // Navigate to a valid PWA page
    await page.goto('/');

    const interceptedMessages: any[] = [];
    
    // Intercept postMessage calls on the page to verify nothing leaks
    await page.evaluate(() => {
      window.addEventListener('message', (e) => {
        // Only care about studypulse messages
        if (e.data && (e.data.source === 'studypulse-ext' || e.data.source === 'studypulse-pwa')) {
          // Push to a global array for playwright to read
          (window as any).__interceptedMessages = (window as any).__interceptedMessages || [];
          (window as any).__interceptedMessages.push(e.data);
        }
      });
    });

    // Simulate some bridge commands being sent
    await page.evaluate(() => {
      window.postMessage({
        source: 'studypulse-ext',
        type: 'RESUME_STUDY_TIMER',
        version: 1
      }, '*');
      
      window.postMessage({
        source: 'studypulse-pwa',
        type: 'TIMER_STATE',
        version: 1,
        payload: {
          study: { status: 'running', accumulatedTime: 10, startTime: Date.now() },
          dsa: { status: 'idle', accumulatedTime: 0, startTime: null }
        }
      }, '*');
    });

    // Wait a brief moment for event listeners
    await page.waitForTimeout(500);

    // Retrieve intercepted messages
    const messages = await page.evaluate(() => {
      return (window as any).__interceptedMessages || [];
    });

    // Assert that we did intercept messages
    expect(messages.length).toBeGreaterThan(0);

    // Security check: ensure NO message contains the substring "ext_" or "Authorization"
    const serialized = JSON.stringify(messages);
    expect(serialized).not.toContain('ext_');
    expect(serialized).not.toContain('Authorization');
    expect(serialized).not.toContain('Bearer');
  });
});
