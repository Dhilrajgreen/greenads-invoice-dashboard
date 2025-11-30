import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: invoices, error } = await supabaseAdmin
      .from('invoices')
      .select('invoice_number, customer_name, zoho_invoice_id')
      .eq('status', 'unpaid')
      .limit(5);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: invoices?.length || 0,
      sample: invoices,
      hasCustomerNames: invoices?.some((inv: any) => inv.customer_name) || false,
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

