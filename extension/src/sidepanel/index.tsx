import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BridgeTimerStateMessageSchema, BridgeTimerStateMessage, BridgeCommandMessage } from '../bridge-schema';

import './index.css';

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

function SidePanel() {
  const [isPaired, setIsPaired] = useState<boolean>(true);
  const [pairingCode, setPairingCode] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);

  const [hasPwa, setHasPwa] = useState<boolean>(false);
  const [timerState, setTimerState] = useState<BridgeTimerStateMessage['payload'] | null>(null);
  const [now, setNow] = useState(Date.now());
  const [hintLevel, setHintLevel] = useState(1);
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if PWA is active
    const checkPwa = () => {
      chrome.runtime.sendMessage({ type: 'CHECK_PWA_STATUS' }, (response) => {
        setHasPwa(response?.hasPWA || false);
      });
    };
    checkPwa();
    const interval = setInterval(checkPwa, 2000);

    // Check if paired
    chrome.storage.local.get('studypulse_ext_key', (result) => {
      if (!result.studypulse_ext_key) {
        setIsPaired(false);
      }
    });

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Listen for state broadcasts from PWA
    const listener = (message: any) => {
      if (message && message.source === 'studypulse-pwa') {
        const result = BridgeTimerStateMessageSchema.safeParse(message);
        if (result.success) {
          setTimerState(result.data.payload);
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Update purely for presentation derivation
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const sendCommand = (type: BridgeCommandMessage['type']) => {
    const cmd: BridgeCommandMessage = {
      source: 'studypulse-ext',
      type,
      version: 1
    };
    chrome.runtime.sendMessage(cmd);
  };

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    setPairingError(null);
    setIsPairing(true);

    try {
      const res = await fetch('http://localhost:3000/api/auth/extension/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pairingCode })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429) {
          setPairingError('Too many attempts. Please wait before trying again.');
        } else {
          setPairingError('Invalid pairing code. Please check the code and try again.');
        }
        return;
      }
      
      await chrome.storage.local.set({ studypulse_ext_key: data.apiKey });
      setIsPaired(true);
    } catch (err) {
      setPairingError('Failed to connect to StudyPulse. Ensure the app is running.');
    } finally {
      setIsPairing(false);
    }
  };

  const handleUnpair = () => {
    chrome.storage.local.remove('studypulse_ext_key', () => {
      setIsPaired(false);
      setTimerState(null);
      setHint(null);
      setError(null);
    });
  };

  const askForHelp = () => {
    setLoadingHint(true);
    setHint(null);
    setError(null);

    chrome.runtime.sendMessage({ 
      type: 'ASK_FOR_HELP',
      hintLevel,
      elapsedSeconds: timerState?.dsa.status === 'running' && timerState.dsa.startTime ? Math.floor((Date.now() - timerState.dsa.startTime) / 1000) + timerState.dsa.accumulatedTime : timerState?.dsa.accumulatedTime || 0
    }, (response) => {
      setLoadingHint(false);
      if (chrome.runtime.lastError) {
        setError(chrome.runtime.lastError.message || 'Failed to request help');
        return;
      }
      
      if (response && response.error) {
        // Intercept specific errors for UX
        if (response.error.includes('401') || response.error.includes('Unauthorized') || response.error.includes('unauthenticated')) {
          handleUnpair();
        } else if (response.error.includes('429') || response.error.includes('Too Many Requests')) {
          setError('Rate limit exceeded. Please wait a bit before asking for another hint.');
        } else {
          // Hide raw backend errors, show a clean message
          setError(response.error.includes('Unexpected') ? 'An error occurred while connecting to the AI.' : response.error);
        }
      } else if (response && response.hint) {
        setHint(response.hint);
      } else {
        setError('Unexpected response from AI');
      }
    });
  };

  if (!isPaired) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6 font-sans">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 mb-6">
          StudyPulse
        </h1>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full shadow-lg">
          <h2 className="text-lg font-semibold mb-2">Connect Extension</h2>
          <p className="text-sm text-gray-400 mb-4">
            Generate a 6-digit code in the StudyPulse app settings and enter it here.
          </p>
          <form onSubmit={handlePair} className="space-y-4">
            <input 
              type="text" 
              placeholder="000000" 
              maxLength={6}
              value={pairingCode}
              onChange={e => setPairingCode(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-center text-2xl font-mono tracking-widest text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {pairingError && (
              <p className="text-red-400 text-sm text-center">{pairingError}</p>
            )}
            <button 
              type="submit" 
              disabled={isPairing || pairingCode.length !== 6}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2 rounded transition-colors"
            >
              {isPairing ? 'Pairing...' : 'Pair'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!hasPwa) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4 text-center">
        <div>
          <h2 className="text-xl font-bold mb-2 text-indigo-400">StudyPulse</h2>
          <p className="text-gray-400">Open the StudyPulse web app to start a session.</p>
        </div>
      </div>
    );
  }

  // Calculate display seconds purely derived from authoritative state
  let studyDisplay = 0;
  let dsaDisplay = 0;

  if (timerState) {
    const { study, dsa } = timerState;
    if (study.status === 'running' && study.startTime) {
      studyDisplay = Math.floor((now - study.startTime) / 1000) + study.accumulatedTime;
    } else {
      studyDisplay = study.accumulatedTime;
    }

    if (dsa.status === 'running' && dsa.startTime) {
      dsaDisplay = Math.floor((now - dsa.startTime) / 1000) + dsa.accumulatedTime;
    } else {
      dsaDisplay = dsa.accumulatedTime;
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
          StudyPulse
        </h1>
        <div className="flex items-center gap-2 text-sm text-green-400">
          <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
          Connected
        </div>
      </header>

      {/* Study Timer */}
      <div className="bg-gray-800 rounded-xl p-5 mb-4 shadow-lg border border-gray-700">
        <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Study Session</h2>
        <div className="text-4xl font-mono mb-4 text-center">
          {formatTime(studyDisplay)}
        </div>
        <div className="flex justify-center gap-3">
          {timerState?.study.status === 'running' ? (
            <button 
              onClick={() => sendCommand('PAUSE_STUDY_TIMER')}
              className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              Pause
            </button>
          ) : (
            <button 
              onClick={() => sendCommand('RESUME_STUDY_TIMER')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              {timerState?.study.status === 'paused' ? 'Resume' : 'Start'}
            </button>
          )}
          <button 
            onClick={() => sendCommand('STOP_STUDY_TIMER')}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-medium transition-colors"
            disabled={timerState?.study.status === 'idle'}
          >
            Stop
          </button>
        </div>
      </div>

      {/* DSA Timer & AI Help */}
      <div className="bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-700">
        <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Problem Timer</h2>
        <div className="text-4xl font-mono mb-4 text-center text-indigo-300">
          {formatTime(dsaDisplay)}
        </div>
        <div className="flex justify-center gap-3 mb-6">
          {timerState?.dsa.status === 'running' ? (
            <button 
              onClick={() => sendCommand('PAUSE_DSA_TIMER')}
              className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              Pause
            </button>
          ) : (
            <button 
              onClick={() => sendCommand('RESUME_DSA_TIMER')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-medium transition-colors"
              disabled={timerState?.study.status === 'idle'}
            >
              {timerState?.dsa.status === 'paused' ? 'Resume' : 'Start'}
            </button>
          )}
        </div>

        <div className="border-t border-gray-700 pt-4 mt-4">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm text-gray-400">Hint Level</label>
            <select 
              value={hintLevel}
              onChange={(e) => setHintLevel(Number(e.target.value))}
              className="bg-gray-700 text-white text-sm rounded border border-gray-600 p-1"
            >
              <option value={1}>1: Socratic Guiding</option>
              <option value={2}>2: Specific Nudge</option>
              <option value={3}>3: Algorithm Concept</option>
              <option value={4}>4: Step-by-Step Logic</option>
              <option value={5}>5: Full Solution</option>
            </select>
          </div>
          
          <button 
            onClick={askForHelp}
            disabled={loadingHint || !timerState?.dsa.status || timerState.dsa.status === 'idle'}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50 text-white px-4 py-3 rounded font-medium transition-colors"
          >
            {loadingHint ? 'Analyzing Code...' : 'Ask for Help'}
          </button>

          {error && (
            <div className="mt-3 p-3 bg-red-900/50 border border-red-700 text-red-200 text-sm rounded">
              {error}
            </div>
          )}

          {hint && (
            <div className="mt-4 p-4 bg-gray-700/50 border border-gray-600 rounded">
              <h3 className="text-indigo-300 text-xs uppercase tracking-wider mb-2 font-semibold">AI Coach</h3>
              <p className="text-sm whitespace-pre-wrap text-gray-200 leading-relaxed">
                {hint}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<SidePanel />);
