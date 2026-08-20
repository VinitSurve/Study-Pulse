import { test, expect } from '@playwright/test';

// Use the primary user's stored auth state for the first tests to get an extension key
test.use({ storageState: 'playwright/.auth/primary.json' });

test.describe('Phase 12.4: Context -> AI Pipeline', () => {
  let extKey: string;

  test.beforeAll(async ({ request }) => {
    // 1. Generate pairing code
    const codeRes = await request.post('/api/auth/extension/code');
    const { code } = await codeRes.json();

    // 2. Exchange for API key
    const exchangeRes = await request.post('/api/auth/extension/exchange', {
      data: { code },
    });
    const { apiKey } = await exchangeRes.json();
    extKey = apiKey;
  });

  test('1. Valid AI Request returns mocked Socratic Hint', async ({ request }) => {
    const payload = {
      problem: {
        title: 'Two Sum',
        statement: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
        constraints: ['2 <= nums.length <= 10^4'],
        examples: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }]
      },
      code: 'class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass',
      language: 'python3',
      timer: { elapsedSeconds: 42 },
      hintLevel: 1
    };

    const res = await request.post('/api/extension/ai/hint', {
      headers: { Authorization: `Bearer ${extKey}` },
      data: payload
    });

    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    
    // With GEMINI_API_KEY='mock-key-for-testing', it should return the mock response
    expect(data.hint).toContain('Mocked Socratic Hint Level 1:');
    expect(data.hintLevel).toBe(1);
  });

  test('2. Missing or invalid Auth returns 401', async ({ request }) => {
    const payload = {
      problem: { title: 'Test', statement: 'Test' },
      code: 'print("Hello")',
      language: 'python3',
      hintLevel: 1
    };

    // No auth header
    const res1 = await request.post('/api/extension/ai/hint', { data: payload });
    expect(res1.status()).toBe(401);

    // Invalid auth header
    const res2 = await request.post('/api/extension/ai/hint', {
      headers: { Authorization: `Bearer ext_invalid123` },
      data: payload
    });
    expect(res2.status()).toBe(401);
  });

  test('3. Oversized Code Payload is rejected (400)', async ({ request }) => {
    const payload = {
      problem: { title: 'Test', statement: 'Test' },
      // Create code string of 20,001 characters
      code: 'a'.repeat(20001),
      language: 'python3',
      hintLevel: 1
    };

    const res = await request.post('/api/extension/ai/hint', {
      headers: { Authorization: `Bearer ${extKey}` },
      data: payload
    });

    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
  });

  test('4. Malformed Payload is rejected (400)', async ({ request }) => {
    // Missing required fields
    const payload = {
      problem: { title: 'Test' } // missing statement, missing code, etc.
    };

    const res = await request.post('/api/extension/ai/hint', {
      headers: { Authorization: `Bearer ${extKey}` },
      data: payload
    });

    expect(res.status()).toBe(400);
  });

  test('5. Extreme Rate Limiting returns 429', async ({ request }) => {
    // Note: The rate limit is 20 per hour.
    // We already used 1 request in the first test. Let's send 20 more.
    const payload = {
      problem: { title: 'Rate limit test', statement: 'test' },
      code: 'print(1)',
      language: 'python3',
      hintLevel: 1
    };

    let wasRateLimited = false;

    // Send 20 requests
    for (let i = 0; i < 20; i++) {
      const res = await request.post('/api/extension/ai/hint', {
        headers: { Authorization: `Bearer ${extKey}` },
        data: payload
      });
      
      if (res.status() === 429) {
        wasRateLimited = true;
        break;
      }
    }

    expect(wasRateLimited).toBe(true);
  });
});
