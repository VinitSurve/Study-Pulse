import { LeetCodeAdapter } from './leetcode';

console.log('StudyPulse Content Script Loaded');

const adapters = [new LeetCodeAdapter()];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTRACT_CONTEXT') {
    const activeAdapter = adapters.find(a => a.isSupported());
    
    if (activeAdapter) {
      activeAdapter.extractAll().then(data => {
        sendResponse({ success: true, data });
      }).catch((err: any) => {
        sendResponse({ success: false, error: err.message });
      });
    } else {
      sendResponse({ success: false, error: 'Platform not supported' });
    }
    
    return true; // Keep the message channel open for async response
  }
});
