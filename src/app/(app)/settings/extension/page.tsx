import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ExtensionSettingsClient } from './client';

export const metadata = {
  title: 'Extension Settings - StudyPulse',
};

export default async function ExtensionSettingsPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch active pairing codes
  const { data: pairingCodes } = await supabase
    .from('extension_pairing_codes')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  // Fetch connected devices
  const { data: devices } = await supabase
    .from('extension_api_keys')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Extension Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your browser extension pairing and connected devices.
        </p>
      </div>

      <ExtensionSettingsClient 
        initialPairingCode={pairingCodes?.code || null}
        initialExpiresAt={pairingCodes?.expires_at || null}
        devices={devices || []}
      />
    </div>
  );
}
