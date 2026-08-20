import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BridgeCommandMessageSchema } from './bridge-schema';

let supabaseClient: SupabaseClient | null = null;
let realtimeChannel: any = null;
let refreshInterval: ReturnType<typeof setInterval> | null = null;
let isRealtimeReady = false;

// Mock state to map RealtimeTimerState -> BridgeTimerStateMessage
let currentTimerState = {
  study: { status: 'idle', startTime: null, accumulatedTime: 0 },
  dsa: { status: 'idle', startTime: null, accumulatedTime: 0 }
};

// Allow users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Fallback for Brave
chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
  }
});

function broadcastStateToSidepanel() {
  chrome.runtime.sendMessage({
    source: 'studypulse-pwa', // Maintain backward compat with sidepanel
    type: 'TIMER_STATE',
    version: 1,
    payload: currentTimerState
  }).catch(() => {}); // Ignore if sidepanel is closed
}

async function getApiKey(): Promise<string | null> {
  const storage = await chrome.storage.local.get('studypulse_ext_key');
  return storage.studypulse_ext_key || null;
}

async function authenticateAndSubscribe() {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.log('No API key found. Cannot connect to Realtime.');
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/api/extension/realtime-token', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to get realtime token');

    const { token, supabaseUrl, supabaseAnonKey, expiresAt } = data;

    if (!supabaseClient) {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }

    // Authenticate with custom JWT
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error('Invalid JWT: No user returned');

    // Subscribe to private channel
    if (realtimeChannel) {
      supabaseClient.removeChannel(realtimeChannel);
    }
    
    realtimeChannel = supabaseClient.channel(`timer:${user.id}`);
    
    realtimeChannel.on('broadcast', { event: 'timer_state_changed' }, (payload: any) => {
      const state = payload.payload;
      if (state.timerType === 'dsa') {
        currentTimerState.dsa = {
          status: state.status === 'idle' ? 'completed' : state.status,
          startTime: state.started_at ? new Date(state.started_at).getTime() : null,
          accumulatedTime: state.accumulated_seconds || 0
        } as any;
        broadcastStateToSidepanel();
      }
    }).subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        isRealtimeReady = true;
        // Fetch initial state so the sidepanel isn't stuck on idle
        try {
          const stateRes = await fetch('http://localhost:3000/api/timer/state?type=dsa', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          if (stateRes.ok) {
            const data = await stateRes.json();
            if (data.state) {
              const state = data.state;
              currentTimerState.dsa = {
                status: state.status === 'idle' ? 'completed' : state.status,
                startTime: state.started_at ? new Date(state.started_at).getTime() : null,
                accumulatedTime: state.accumulated_seconds || 0
              } as any;
              broadcastStateToSidepanel();
            }
          }
        } catch (err) {
          console.error('Failed to fetch initial state:', err);
        }
      }
    });

    // Schedule token refresh 5 minutes before expiry
    if (refreshInterval) clearInterval(refreshInterval);
    const timeToExpiry = expiresAt - Date.now();
    const refreshTime = Math.max(0, timeToExpiry - 5 * 60 * 1000);
    
    refreshInterval = setTimeout(authenticateAndSubscribe, refreshTime);

  } catch (err) {
    console.error('Realtime auth failed:', err);
    // Retry in 30 seconds
    setTimeout(authenticateAndSubscribe, 30 * 1000);
  }
}

// Initial bootstrap
authenticateAndSubscribe();
chrome.storage.onChanged.addListener((changes) => {
  if (changes.studypulse_ext_key) {
    authenticateAndSubscribe();
  }
});

// Forward commands from Sidepanel -> API (instead of PWA tab)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.source === 'studypulse-ext') {
    const result = BridgeCommandMessageSchema.safeParse(message);
    if (result.success) {
      const cmd = result.data.type;
      let action = '';
      if (cmd.includes('PAUSE')) action = 'pause';
      if (cmd.includes('RESUME')) action = 'resume';
      if (cmd.includes('STOP')) action = 'stop';
      
      if (action) {
        getApiKey().then(apiKey => {
          if (apiKey) {
            // Expected version should ideally be fetched or tracked. 
            // For extension simple actions, we can just fetch the state first, or
            // Since we just need to send a command, a more robust way is to fetch state first.
            // But we'll let the API handle it if we send expectedVersion: 0. Wait, CAS requires it.
            // Let's quickly fetch authoritative state to get the version, then execute command.
            fetch('http://localhost:3000/api/timer/state?type=dsa', {
              headers: { 'Authorization': `Bearer ${apiKey}` }
            }).then(res => res.json()).then(data => {
              const version = data.state ? data.state.version : 0;
              return fetch('http://localhost:3000/api/timer/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ timerType: 'dsa', action, expectedVersion: version })
              });
            }).catch(console.error);
          }
        });
      }
    }
  }

  // Handle requests from sidepanel to check if PWA is alive
  if (message && message.type === 'CHECK_PWA_STATUS') {
    // We now just indicate that the connection is active because extension is independent
    sendResponse({ hasPWA: isRealtimeReady });
    return true; 
  }

  // Handle Ask for Help (unchanged)
  if (message && message.type === 'ASK_FOR_HELP') {
    // ... same as before
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.id) return sendResponse({ error: 'No active tab found' });

        const contextResponse = await chrome.tabs.sendMessage(activeTab.id, { action: 'EXTRACT_CONTEXT' });
        if (!contextResponse || !contextResponse.success || !contextResponse.data) {
          return sendResponse({ error: contextResponse?.error || 'Failed to extract context' });
        }

        if (contextResponse.data.codeStatus === 'unavailable' || !contextResponse.data.code) {
          return sendResponse({ error: "Couldn't read the editor. Make sure your code editor is loaded and try again." });
        }

        const apiKey = await getApiKey();
        if (!apiKey) return sendResponse({ error: 'Extension is not paired. Please pair with StudyPulse first.' });

        const payload = {
          problem: {
            title: contextResponse.data.title || 'Unknown',
            statement: contextResponse.data.statement || '',
            constraints: contextResponse.data.constraints || [],
            examples: contextResponse.data.examples || []
          },
          code: contextResponse.data.code,
          language: contextResponse.data.language || 'Unknown',
          timer: { elapsedSeconds: message.elapsedSeconds || 0 },
          hintLevel: message.hintLevel || 1
        };

        const response = await fetch('http://localhost:3000/api/extension/ai/hint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) return sendResponse({ error: data.error || 'Server error' });
        sendResponse({ hint: data.hint });
      } catch (err: any) {
        console.error('ASK_FOR_HELP failed:', err);
        sendResponse({ error: err.message || 'An unexpected error occurred' });
      }
    })();
    return true;
  }
});
