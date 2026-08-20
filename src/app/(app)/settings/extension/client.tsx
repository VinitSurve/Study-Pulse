'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ExtensionSettingsClient({ 
  initialPairingCode, 
  initialExpiresAt,
  devices
}: { 
  initialPairingCode: string | null;
  initialExpiresAt: string | null;
  devices: any[];
}) {
  const router = useRouter();
  const [pairingCode, setPairingCode] = useState<string | null>(initialPairingCode);
  const [expiresAt, setExpiresAt] = useState<string | null>(initialExpiresAt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const generateCode = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/auth/extension/code', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPairingCode(data.code);
        setExpiresAt(data.expiresAt);
        router.refresh();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeDevice = async (id: string) => {
    setRevokingId(id);
    try {
      const res = await fetch('/api/auth/extension/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setRevokingId(null);
    }
  };

  const activeDevices = devices.filter(d => !d.revoked_at);
  const revokedDevices = devices.filter(d => d.revoked_at);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Connect Extension</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate a 6-digit code to securely pair the StudyPulse extension with your account.
          </p>
        </div>
        <div className="p-6">
          {pairingCode ? (
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg text-center space-y-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Your pairing code is:</p>
              <p className="text-5xl font-mono tracking-widest font-bold text-indigo-600 dark:text-indigo-400">
                {pairingCode}
              </p>
              <p className="text-xs text-gray-500">
                Expires in 10 minutes
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No active pairing code. Click below to generate one.
            </p>
          )}
        </div>
        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end">
          <button 
            onClick={generateCode} 
            disabled={isGenerating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {isGenerating ? 'Generating...' : pairingCode ? 'Generate New Code' : 'Generate Pairing Code'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Connected Devices</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Devices currently authenticated with your StudyPulse account.
          </p>
        </div>
        <div className="p-6">
          {activeDevices.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">No active devices.</p>
          ) : (
            <ul className="space-y-4">
              {activeDevices.map((device) => (
                <li key={device.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{device.device_name || 'Browser Extension'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Connected: {new Date(device.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expires: {new Date(device.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => revokeDevice(device.id)}
                    disabled={revokingId === device.id}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {revokingId === device.id ? 'Revoking...' : 'Revoke'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {revokedDevices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-500 dark:text-gray-400">Revoked Devices</h2>
          </div>
          <div className="p-6">
             <ul className="space-y-2">
              {revokedDevices.map((device) => (
                <li key={device.id} className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-900/50 rounded border border-gray-200/50 dark:border-gray-700/50 opacity-60">
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{device.device_name || 'Browser Extension'}</p>
                    <p className="text-xs text-gray-500">
                      Revoked: {new Date(device.revoked_at).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
