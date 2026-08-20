import { NextResponse } from 'next/server';
import { executeTimerCommand, TimerAction } from '@/lib/timer/command-service';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { timerType, action, expectedVersion, payload } = body;

    if (!timerType || !action || expectedVersion === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // executeTimerCommand performs the atomic CAS check and returns 409 if version mismatches
    const updatedState = await executeTimerCommand({
      userId: user.id,
      timerType,
      action: action as TimerAction,
      expectedVersion,
      payload
    });

    return NextResponse.json({ state: updatedState });

  } catch (error: any) {
    console.error('Timer Command Error:', error.message);
    if (error.message.includes('409 Conflict')) {
      return NextResponse.json({ error: 'Conflict: Stale timer version' }, { status: 409 });
    }
    if (error.message.includes('Invalid action') || error.message.includes('already') || error.message.includes('Can only')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
