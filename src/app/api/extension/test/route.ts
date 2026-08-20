import { NextResponse } from 'next/server';
import { validateExtensionKey } from '@/lib/auth/extension';

export async function GET(request: Request) {
  try {
    const { userId, error } = await validateExtensionKey(request);

    if (error || !userId) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
    }

    // Explicitly scope operations to this userId.
    // In this test endpoint, we just return a success message.
    return NextResponse.json({ 
      success: true, 
      message: 'Extension API key is valid', 
      userId 
    });

  } catch (err) {
    console.error('Unexpected error in extension test endpoint:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
