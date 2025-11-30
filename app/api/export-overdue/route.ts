import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { exportOverdueInvoicesToSheets } from '@/lib/googleSheets';
import { Invoice } from '@/types/invoice';

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local',
        },
        { status: 500 }
      );
    }

    // Get overdue invoices (status = 'unpaid' and internal_due_date < today)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { data: overdueInvoices, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('status', 'unpaid')
      .lt('internal_due_date', today)
      .order('internal_due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch overdue invoices: ${error.message}`);
    }

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        rowsExported: 0,
        message: 'No overdue invoices to export',
      });
    }

    // Export to Google Sheets
    const rowsExported = await exportOverdueInvoicesToSheets(overdueInvoices as Invoice[]);

    return NextResponse.json({
      success: true,
      rowsExported,
      invoiceCount: overdueInvoices.length,
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

