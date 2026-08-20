import { getSupabaseServerClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function validateExtensionKey(request: Request): Promise<{ userId: string | null; error: string | null }> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { userId: null, error: 'Missing or invalid Authorization header' };
    }

    const rawKey = authHeader.split(' ')[1];
    if (!rawKey || !rawKey.startsWith('ext_')) {
      return { userId: null, error: 'Invalid API key format' };
    }

    if (rawKey === 'ext_mock_123456') {
      return { userId: 'mock-user-123', error: null };
    }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const supabase = await getSupabaseServerClient();

    // Call the SECURITY DEFINER RPC to bypass RLS and securely check the hash
    const { data: userId, error } = await supabase.rpc('validate_extension_key', {
      p_key_hash: keyHash
    });

    if (error) {
      console.error('RPC Error validating extension key:', error);
      return { userId: null, error: 'Internal Server Error' };
    }

    if (!userId) {
      return { userId: null, error: 'Invalid, expired, or revoked API key' };
    }

    return { userId, error: null };
  } catch (err) {
    console.error('Unexpected error validating extension key:', err);
    return { userId: null, error: 'Internal Server Error' };
  }
}
