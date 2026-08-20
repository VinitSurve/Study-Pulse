import { getSupabaseServerClient } from '@/lib/supabase/server';
import { RealtimeTimerState } from '@/types/timer';

export type TimerAction = 'start' | 'pause' | 'resume' | 'stop' | 'reset';

interface ExecuteCommandParams {
  userId: string;
  timerType: 'study' | 'dsa';
  action: TimerAction;
  expectedVersion: number;
  payload?: any;
}

export async function executeTimerCommand({
  userId,
  timerType,
  action,
  expectedVersion,
  payload
}: ExecuteCommandParams): Promise<RealtimeTimerState> {
  const supabase = await getSupabaseServerClient();

  // 1. Fetch current authoritative state first to validate transitions
  const { data: currentState, error: fetchError } = await supabase
    .from('timer_state')
    .select('*')
    .eq('user_id', userId)
    .eq('timer_type', timerType)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(`Failed to fetch timer state: ${fetchError.message}`);
  }

  const now = new Date().toISOString();
  let updatePayload: any = {};
  const isNew = !currentState;

  // Initialize new state if it doesn't exist
  if (isNew) {
    if (action !== 'start' && action !== 'reset') {
      throw new Error(`Invalid action '${action}' on uninitialized timer`);
    }
    // We expect expectedVersion to be 0 for new timers, but let's allow 0
    if (expectedVersion !== 0) {
      throw new Error('409 Conflict: Expected version 0 for new timer');
    }
  }

  // Define State Transitions
  switch (action) {
    case 'start':
      if (currentState && currentState.status === 'running') {
        throw new Error('Timer is already running');
      }
      updatePayload = {
        status: 'running',
        started_at: now,
        accumulated_seconds: currentState ? currentState.accumulated_seconds : 0,
        context: payload?.context || currentState?.context || {}
      };
      break;

    case 'resume':
      if (!currentState || currentState.status !== 'paused') {
        throw new Error('Can only resume a paused timer');
      }
      updatePayload = {
        status: 'running',
        started_at: now,
        // Keep existing accumulated_seconds
      };
      break;

    case 'pause':
      if (!currentState || currentState.status !== 'running') {
        throw new Error('Can only pause a running timer');
      }
      const startedAt = new Date(currentState.started_at!).getTime();
      const elapsedSinceStart = Math.floor((Date.now() - startedAt) / 1000);
      
      updatePayload = {
        status: 'paused',
        accumulated_seconds: currentState.accumulated_seconds + elapsedSinceStart,
        started_at: null
      };
      break;

    case 'stop':
      if (!currentState) {
        throw new Error('No timer to stop');
      }
      let finalAccumulated = currentState.accumulated_seconds;
      if (currentState.status === 'running') {
        const startedAt = new Date(currentState.started_at!).getTime();
        finalAccumulated += Math.floor((Date.now() - startedAt) / 1000);
      }
      
      updatePayload = {
        status: 'idle',
        accumulated_seconds: finalAccumulated,
        started_at: null
      };
      break;

    case 'reset':
      updatePayload = {
        status: 'idle',
        accumulated_seconds: 0,
        started_at: null,
        context: payload?.context || {}
      };
      break;
      
    default:
      throw new Error(`Unknown action: ${action}`);
  }

  // Always increment version on mutation
  updatePayload.version = expectedVersion + 1;
  updatePayload.updated_at = now;

  // 2. Perform Atomic Compare-And-Swap (CAS)
  if (isNew) {
    // Insert new timer state
    const { data: insertedData, error: insertError } = await supabase
      .from('timer_state')
      .insert({
        user_id: userId,
        timer_type: timerType,
        ...updatePayload
      })
      .select()
      .single();
      
    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        throw new Error('409 Conflict');
      }
      throw new Error(`Failed to insert timer state: ${insertError.message}`);
    }
    return insertedData as RealtimeTimerState;
  } else {
    // Update existing timer state with WHERE version = expectedVersion
    const { data: updatedData, error: updateError } = await supabase
      .from('timer_state')
      .update(updatePayload)
      .eq('user_id', userId)
      .eq('timer_type', timerType)
      .eq('version', expectedVersion)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') { 
        // PGRST116 means JSON object requested, multiple (or no) rows returned.
        // Since we filtered by Primary Key (user_id, timer_type) AND version, 
        // 0 rows means the version didn't match (stale client state).
        throw new Error('409 Conflict');
      }
      throw new Error(`Failed to update timer state: ${updateError.message}`);
    }

    return updatedData as RealtimeTimerState;
  }
}
