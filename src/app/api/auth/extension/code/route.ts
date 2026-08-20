import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Authenticate the request via PWA's standard HttpOnly cookie
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate a secure 6-digit code
    // Using randomBytes to ensure cryptographic randomness
    const randomBuffer = crypto.randomBytes(4);
    // Convert to a number and get 6 digits
    const codeNumber = (randomBuffer.readUInt32BE(0) % 900000) + 100000;
    const code = codeNumber.toString();

    // The database has a UNIQUE index on user_id, ensuring only 1 active code.
    // We use upsert to overwrite any existing code for this user.
    const { data, error } = await supabase
      .from('extension_pairing_codes')
      .upsert(
        { 
          user_id: user.id, 
          code: code,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error creating pairing code:', error);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    return NextResponse.json({ 
      code: data.code,
      expires_at: data.expires_at
    });

  } catch (err) {
    console.error('Unexpected error in pairing code generation:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
