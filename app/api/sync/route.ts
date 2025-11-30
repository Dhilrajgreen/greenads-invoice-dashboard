import { NextResponse } from 'next/server';
import { syncInvoicesFromZoho } from '@/lib/syncInvoicesFromZoho';

export async function POST() {
  try {
    const stats = await syncInvoicesFromZoho();
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

