import { BridgeCommandMessageSchema, BridgeTimerStateMessageSchema, PWA_ORIGIN } from '../bridge-schema';

console.log('[StudyPulse Bridge] Content script injected into PWA');

// 1. PWA -> Extension (State Broadcasts)
window.addEventListener('message', (event) => {
  // Strict Origin Validation
  if (event.origin !== window.location.origin) return;
  // In a real app, also verify event.origin === PWA_ORIGIN or production domain

  const data = event.data;
  if (!data || data.source !== 'studypulse-pwa') return;

  // Strict Schema Validation
  const result = BridgeTimerStateMessageSchema.safeParse(data);
  if (!result.success) {
    console.error('[StudyPulse Bridge] Invalid message from PWA rejected:', result.error);
    return;
  }

  // Forward valid state to the extension background script
  chrome.runtime.sendMessage(result.data).catch((err) => {
    // Background script might be inactive, ignore
  });
});

// 2. Extension -> PWA (Commands)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.source !== 'studypulse-ext') return;

  // Strict Schema Validation
  const result = BridgeCommandMessageSchema.safeParse(message);
  if (!result.success) {
    console.error('[StudyPulse Bridge] Invalid command from Extension rejected:', result.error);
    return;
  }

  // Forward valid command to the PWA Window
  window.postMessage(result.data, window.location.origin);
  
  sendResponse({ success: true });
});
