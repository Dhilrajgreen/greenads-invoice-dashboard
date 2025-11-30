import { NextResponse } from 'next/server';
import { getZohoAccessToken, fetchZohoInvoices } from '@/lib/zoho';

export async function GET() {
  try {
    const accessToken = await getZohoAccessToken();
    const orgId = process.env.ZOHO_ORG_ID;
    
    if (!orgId) {
      return NextResponse.json({ error: 'Missing ZOHO_ORG_ID' }, { status: 500 });
    }

    // Fetch first page to inspect structure
    const url = new URL('https://www.zohoapis.com/books/v3/invoices');
    url.searchParams.set('organization_id', orgId);
    url.searchParams.set('status', 'unpaid');
    url.searchParams.set('per_page', '1');
    url.searchParams.set('page', '1');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `API Error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Return first invoice structure for inspection
    const firstInvoice = data.invoices?.[0] || null;
    
    return NextResponse.json({
      success: true,
      pageContext: data.page_context,
      invoiceCount: data.invoices?.length || 0,
      firstInvoiceStructure: firstInvoice ? {
        invoice_id: firstInvoice.invoice_id,
        customer: firstInvoice.customer,
        email: firstInvoice.email,
        phone: firstInvoice.phone,
        billing_address: firstInvoice.billing_address,
        contact_persons: firstInvoice.contact_persons,
        salesperson: firstInvoice.salesperson,
        customer_name: firstInvoice.customer?.customer_name,
        company_name: firstInvoice.company_name,
      } : null,
      rawInvoice: firstInvoice, // Full invoice for debugging
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

