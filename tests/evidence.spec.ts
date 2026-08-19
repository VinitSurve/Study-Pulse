import { test, expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

const viewports = [
  { name: 'Mobile', width: 390, height: 844 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 }
];

test.describe('Evidence Screenshot Collection', () => {
  for (const vp of viewports) {
    test(`Capture Evidence - ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      const testId = uuidv4().substring(0, 8);
      const email = `test-${testId}@example.com`;
      const password = 'TestPassword123!';

      // 1. Signup / Login
      await page.goto('/signup');
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');

      // 2. Dashboard
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `evidence/${vp.name.toLowerCase()}-dashboard.png` });

      // 3. Study Modal
      await page.click('button:has-text("Start Study")');
      await page.waitForTimeout(500);
      await page.screenshot({ path: `evidence/${vp.name.toLowerCase()}-study-modal.png` });
      
      // Close Study Modal
      await page.click('button[aria-label="Close"]');
      
      // 4. DSA Modal
      await page.click('button:has-text("Start Problem")');
      await page.waitForTimeout(500);
      await page.screenshot({ path: `evidence/${vp.name.toLowerCase()}-dsa-modal.png` });

      // Close DSA Modal
      await page.click('button[aria-label="Close"]');

      // Start Study Timer
      await page.click('button:has-text("Start Study")');
      await page.fill('input[placeholder="New subject…"]', 'Evidence Collection');
      await page.click('button:has-text("Add")');
      await page.click('button:has-text("Until I stop")');
      await page.waitForURL(/\/timer/);

      // 5. Timer View (Study Only)
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `evidence/${vp.name.toLowerCase()}-timer-single.png` });

      // Start DSA Timer too
      await page.click('button:has-text("Start Problem")');
      await page.fill('input[placeholder="e.g. Two Sum"]', 'Evidence DSA Problem');
      await page.selectOption('select:near(label:has-text("Platform"))', 'LeetCode');
      await page.click('button:has-text("Start Timer")');

      // 6. Two Timers Running
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `evidence/${vp.name.toLowerCase()}-two-timers.png` });

      // 7. AI Coach
      await page.click('button:has-text("Ask for Help")');
      await page.waitForTimeout(2000); // Wait for response
      await page.screenshot({ path: `evidence/${vp.name.toLowerCase()}-ai-coach.png` });

      // 8. DSA Completion
      await page.click('button:has-text("Complete")');
      await page.waitForTimeout(500);
      await page.screenshot({ path: `evidence/${vp.name.toLowerCase()}-dsa-completion.png` });
      await page.click('button:has-text("Solve")');
      
      // Wait for it to close
      await page.waitForTimeout(1000);

      // 9. Stats
      await page.goto('/stats');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `evidence/${vp.name.toLowerCase()}-stats.png` });
    });
  }
});
