import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timerType = searchParams.get('type') || 'dsa'; // default to dsa

    const { data: state, error } = await supabase
      .from('timer_state')
      .select('*')
      .eq('user_id', user.id)
      .eq('timer_type', timerType)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No timer state exists yet
        return NextResponse.json({ state: null });
      }
      throw error;
    }

    return NextResponse.json({ state });

  } catch (error: any) {
    console.error('Fetch Timer State Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
