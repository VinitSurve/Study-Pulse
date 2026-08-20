import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Basic in-memory rate limiting for brute-force protection
// NOTE: This in-memory Map is sufficient for local development and single-instance deployments.
// For multi-node or serverless production deployments, this must be replaced with 
// a shared state store (e.g., Redis, or a Supabase table with TTL) to enforce global rate limits.
const rateLimits = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimits.get(ip);
  
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(ip, { count: 1, windowStart: now });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }
  
  record.count++;
  return true;
}

function validateOrigin(origin: string | null): boolean {
  if (!origin) return false; // Strict: require origin
  
  if (process.env.NODE_ENV === 'development' && (origin === 'http://localhost:3000' || origin === 'http://localhost')) {
    return true;
  }
  
  const extId = process.env.EXTENSION_ID;
  if (extId && origin === `chrome-extension://${extId}`) {
    return true;
  }
  
  return false;
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');
  
  if (validateOrigin(origin)) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin!,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  return new NextResponse(null, { status: 403 });
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    
    if (!validateOrigin(origin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. IP-based Rate Limiting
    // In Next.js App router, we can get IP from x-forwarded-for or similar headers
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    // 2. Parse request
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid pairing code format' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // 3. Generate the Opaque API Key
    const rawApiKey = 'ext_' + crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

    // 4. Atomic Code Consumption & Key Insertion
    // We use the RPC function to prevent race conditions.
    // The RPC returns { success, v_user_id, error_message }
    const { data: rpcData, error: rpcError } = await supabase.rpc('consume_pairing_code', {
      p_code: code,
      p_key_hash: keyHash,
      p_device_name: 'Chrome Extension'
    });

    if (rpcError) {
      console.error('RPC Error consuming code:', rpcError);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    // RPC returns an array with one row, e.g. [{ success: true, v_user_id: '...', error_message: 'Success' }]
    const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;

    if (!result || !result.success) {
      return NextResponse.json({ error: result?.error_message || 'Invalid code' }, { status: 401 });
    }

    // 5. Response: Return the raw API key to the extension
    return NextResponse.json({ apiKey: rawApiKey });

  } catch (err) {
    console.error('Unexpected error in pairing exchange:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
