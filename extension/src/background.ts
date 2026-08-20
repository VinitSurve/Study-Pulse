import { BridgeCommandMessageSchema } from './bridge-schema';

// Allow users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
  console.log('StudyPulse Companion Extension Installed');
});

/**
 * Finds the StudyPulse PWA tab.
 */
async function getPWATab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ url: ['http://localhost:3000/*', 'https://*.studypulse.com/*'] });
  return tabs.length > 0 ? tabs[0] : null;
}

// Forward commands from Sidepanel -> Content Script -> PWA
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.source === 'studypulse-ext') {
    // It's a command from the sidepanel. We need to forward it to the PWA tab.
    const result = BridgeCommandMessageSchema.safeParse(message);
    if (result.success) {
      getPWATab().then((pwaTab) => {
        if (pwaTab && pwaTab.id) {
          chrome.tabs.sendMessage(pwaTab.id, result.data).catch(err => {
             console.error('Failed to send message to PWA tab:', err);
          });
        }
      });
    }
  }

  // Handle requests from sidepanel to check if PWA is alive
  if (message && message.type === 'CHECK_PWA_STATUS') {
    getPWATab().then(tab => {
      sendResponse({ hasPWA: !!tab });
    });
    return true; // Keep message channel open for async response
  }

  // Handle Ask for Help
  if (message && message.type === 'ASK_FOR_HELP') {
    (async () => {
      try {
        // 1. Get current active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.id) {
          return sendResponse({ error: 'No active tab found' });
        }

        // 2. Extract context
        const contextResponse = await chrome.tabs.sendMessage(activeTab.id, { action: 'EXTRACT_CONTEXT' });
        if (!contextResponse || !contextResponse.success || !contextResponse.data) {
          return sendResponse({ error: contextResponse?.error || 'Failed to extract context' });
        }

        if (contextResponse.data.codeStatus === 'unavailable' || !contextResponse.data.code) {
          return sendResponse({ error: "Couldn't read the editor. Make sure your code editor is loaded and try again." });
        }

        // 3. Get API Key
        const storage = await chrome.storage.local.get('studypulse_ext_key');
        const apiKey = storage.studypulse_ext_key;
        if (!apiKey) {
          return sendResponse({ error: 'Extension is not paired. Please pair with StudyPulse first.' });
        }

        // 4. Call AI Endpoint
        const payload = {
          problem: {
            title: contextResponse.data.title || 'Unknown',
            statement: contextResponse.data.statement || '',
            constraints: contextResponse.data.constraints || [],
            examples: contextResponse.data.examples || []
          },
          code: contextResponse.data.code,
          language: contextResponse.data.language || 'Unknown',
          timer: {
            elapsedSeconds: message.elapsedSeconds || 0
          },
          hintLevel: message.hintLevel || 1
        };

        const response = await fetch('http://localhost:3000/api/extension/ai/hint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) {
          return sendResponse({ error: data.error || 'Server error' });
        }

        sendResponse({ hint: data.hint });
      } catch (err: any) {
        console.error('ASK_FOR_HELP failed:', err);
        sendResponse({ error: err.message || 'An unexpected error occurred' });
      }
    })();
    return true;
  }
});
