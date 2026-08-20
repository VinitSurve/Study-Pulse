import { test, expect, Page } from '@playwright/test';

// Use the primary user's stored auth state
test.use({ storageState: 'playwright/.auth/primary.json' });

test.describe('Phase 12.3: Bridge Timer Logic', () => {
  // Helper to start the timer via the PWA UI
  async function startStudyTimer(page: Page) {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Start Study' }).click();
    await page.getByPlaceholder('New subject…').fill('Test Subject');
    await page.getByRole('button', { name: 'Add' }).click();
    // In case the subject already exists, wait for "Until I stop"
    await page.getByText('Until I stop').click();
  }

  test.beforeEach(async ({ page }) => {
    // Setup a listener inside the page to capture broadcasts from the PWA
    await page.addInitScript(() => {
      (window as any).capturedStateMessages = [];
      window.addEventListener('message', (event) => {
        if (event.data && event.data.source === 'studypulse-pwa' && event.data.type === 'TIMER_STATE') {
          (window as any).capturedStateMessages.push(event.data.payload);
        }
      });
    });
  });

  test('1. PWA starts timer -> Extension sees running state', async ({ page }) => {
    await startStudyTimer(page);
    
    // Wait for the state to be broadcasted to our simulated extension
    await page.waitForFunction(() => {
      const msgs = (window as any).capturedStateMessages;
      return msgs.length > 0 && msgs[msgs.length - 1].study.status === 'running';
    });

    const finalState = await page.evaluate(() => {
      const msgs = (window as any).capturedStateMessages;
      return msgs[msgs.length - 1];
    });

    expect(finalState.study.status).toBe('running');
    expect(finalState.study.startTime).toBeTruthy();
  });

  test('2. Extension pauses -> PWA actually pauses', async ({ page }) => {
    await startStudyTimer(page);
    await expect(page.getByRole('button', { name: /pause/i })).toBeVisible();

    // Simulate Extension sending PAUSE command
    await page.evaluate(() => {
      window.postMessage({
        source: 'studypulse-ext',
        type: 'PAUSE_STUDY_TIMER',
        version: 1
      }, window.location.origin);
    });

    // Verify PWA UI updates to "Resume"
    await expect(page.getByRole('button', { name: /resume/i })).toBeVisible();

    // Verify Broadcasted state is paused
    await page.waitForFunction(() => {
      const msgs = (window as any).capturedStateMessages;
      return msgs[msgs.length - 1].study.status === 'paused';
    });
  });

  test('3. PWA resumes -> extension updates', async ({ page }) => {
    await startStudyTimer(page);
    await page.getByRole('button', { name: /pause/i }).click();

    await page.waitForFunction(() => {
      const msgs = (window as any).capturedStateMessages;
      return msgs[msgs.length - 1].study.status === 'paused';
    });

    await page.getByRole('button', { name: /resume/i }).click();

    await page.waitForFunction(() => {
      const msgs = (window as any).capturedStateMessages;
      return msgs[msgs.length - 1].study.status === 'running';
    });
  });

  test('8. No second timer engine exists in extension', async ({ page }) => {
    await startStudyTimer(page);
    await page.waitForTimeout(2000);

    const states = await page.evaluate(() => (window as any).capturedStateMessages);
    
    const runningStates = states.filter((s: any) => s.study.status === 'running');
    for (const state of runningStates) {
      expect(state.study.accumulatedTime).toBe(0);
      expect(state.study.startTime).toBeTruthy();
    }
    
    await page.getByRole('button', { name: /pause/i }).click();
    await page.waitForFunction(() => {
      const msgs = (window as any).capturedStateMessages;
      return msgs[msgs.length - 1].study.status === 'paused';
    });

    const finalState = await page.evaluate(() => {
      const msgs = (window as any).capturedStateMessages;
      return msgs[msgs.length - 1];
    });

    expect(finalState.study.accumulatedTime).toBeGreaterThan(0);
  });

  test('9. Bridge messages reject unexpected origins and malformed payloads', async ({ page }) => {
    await startStudyTimer(page);
    await expect(page.getByRole('button', { name: /pause/i })).toBeVisible();

    await page.evaluate(() => {
      window.postMessage({
        source: 'studypulse-ext',
        type: 'INVALID_COMMAND',
        version: 1
      }, window.location.origin);
    });

    await page.waitForTimeout(500);

    await page.evaluate(() => {
      window.postMessage({
        source: 'hacker-script',
        type: 'PAUSE_STUDY_TIMER',
        version: 1
      }, window.location.origin);
    });

    await page.waitForTimeout(500);

    const finalState = await page.evaluate(() => {
      const msgs = (window as any).capturedStateMessages;
      return msgs[msgs.length - 1];
    });
    
    expect(finalState.study.status).toBe('running');
  });
});
