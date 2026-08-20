import { NextResponse } from 'next/server';
import { validateExtensionKey } from '@/lib/auth/extension';
import crypto from 'crypto';

// Simple JWT signer using Node crypto
function signJWT(payload: any, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function GET(request: Request) {
  try {
    // Authenticate using the ext_ credential
    const { userId, error } = await validateExtensionKey(request);

    if (error || !userId) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      console.error('SUPABASE_JWT_SECRET is missing from environment variables');
      return NextResponse.json({ error: 'Internal Server Error: Missing JWT Secret' }, { status: 500 });
    }

    // Generate a short-lived custom JWT (valid for 1 hour)
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60; // 1 hour expiration

    const payload = {
      role: 'authenticated', // Must be authenticated to pass RLS
      sub: userId,
      iat,
      exp,
      aud: 'authenticated', // Supabase Realtime checks audience
    };

    const token = signJWT(payload, jwtSecret);

    return NextResponse.json({ 
      token, 
      expiresAt: exp * 1000,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
  } catch (err: any) {
    console.error('Realtime Token Error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
