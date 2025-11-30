import { NextResponse } from 'next/server';
import { syncInvoicesFromZoho } from '@/lib/syncInvoicesFromZoho';

export async function POST() {
  // Create a readable stream for Server-Sent Events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (message: string, progress?: number) => {
        const data = JSON.stringify({ message, progress: progress ?? null });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        const stats = await syncInvoicesFromZoho(sendProgress);
        
        // Send final success message
        const finalData = JSON.stringify({
          success: true,
          stats,
          timestamp: new Date().toISOString(),
          message: 'Sync completed successfully!',
          progress: 100,
        });
        controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
        controller.close();
      } catch (error) {
        console.error('Sync error:', error);
        const errorData = JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          progress: null,
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

