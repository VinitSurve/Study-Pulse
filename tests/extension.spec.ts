import { test as base, expect, type BrowserContext, chromium } from '@playwright/test';
import path from 'path';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({ }, use) => {
    const pathToExtension = path.join(__dirname, '../extension/dist');
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background)
      background = await context.waitForEvent('serviceworker');
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  }
});

test('Extension Foundation & Mocked Context Extraction', async ({ page, context, extensionId }) => {
  // 1. Open mock LeetCode page
  await page.goto('http://localhost:3000/mock/leetcode.html');
  await expect(page.locator('h1')).toHaveText('1. Two Sum');

  // 2. Open extension sidepanel in a new tab to interact with it
  const panelPage = await context.newPage();
  await panelPage.goto(`chrome-extension://${extensionId}/index.html`);
  
  // 3. Verify sidepanel loaded
  await expect(panelPage.locator('h2')).toHaveText('StudyPulse Debug Panel');
  
  // 4. Click Extract Context
  await panelPage.click('button:has-text("Extract Context")');
  
  // 5. Wait for JSON extraction to show up in <pre>
  const preLocator = panelPage.locator('pre');
  await expect(preLocator).toBeVisible();
  
  const jsonText = await preLocator.textContent();
  expect(jsonText).not.toBeNull();
  
  const extracted = JSON.parse(jsonText!);
  
  // 6. Assertions against the mock
  expect(extracted.platform).toBe('leetcode');
  expect(extracted.url).toContain('mock/leetcode.html');
  expect(extracted.title).toBe('1. Two Sum');
  expect(extracted.language).toBe('Python3');
  
  // Validate code extraction
  expect(extracted.code).toContain('class Solution:');
  expect(extracted.code).toContain('def twoSum(self, nums: List[int], target: int) -> List[int]:');
  
  // Validate sanitization (script tag should be stripped)
  expect(extracted.statement).not.toContain('<script>');
  expect(extracted.statement).not.toContain('alert');
  expect(extracted.statement).toContain('Given an array of integers nums and an integer target');
  
  // Validate constraints array
  expect(Array.isArray(extracted.constraints)).toBe(true);
  expect(extracted.constraints[0]).toContain('2 <= nums.length <= 104');
  
  // Take screenshot for evidence
  await panelPage.screenshot({ path: 'test-results/extension-evidence.png' });
});
