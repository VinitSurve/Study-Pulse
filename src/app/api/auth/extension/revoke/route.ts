import { getSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing device ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('extension_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', body.id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Revoke error:', error);
      return NextResponse.json({ error: 'Failed to revoke device' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
