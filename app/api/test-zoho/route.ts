import { NextResponse } from 'next/server';
import { getZohoAccessToken } from '@/lib/zoho';

export async function GET() {
  try {
    const accessToken = await getZohoAccessToken();
    
    return NextResponse.json({
      success: true,
      message: 'Access token generated successfully',
      tokenLength: accessToken.length,
      tokenPreview: accessToken.substring(0, 20) + '...',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

