import { getZohoAccessToken, fetchZohoInvoices } from './zoho';
import { supabaseAdmin } from './supabaseAdmin';
import { SyncStats } from '@/types/invoice';

/**
 * Syncs unpaid invoices from Zoho to Supabase
 * - Adds new unpaid invoices
 * - Removes invoices that have been paid (no longer in Zoho unpaid list)
 */
export async function syncInvoicesFromZoho(
  onProgress?: (message: string, progress?: number) => void
): Promise<SyncStats> {
  if (!supabaseAdmin) {
    throw new Error('Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  // Get access token
  onProgress?.('Getting Zoho access token...', 5);
  const accessToken = await getZohoAccessToken();
  onProgress?.('Access token obtained', 10);

  // Fetch ALL unpaid invoices from Zoho (with pagination)
  const zohoInvoices = await fetchZohoInvoices(accessToken, onProgress);
  
  console.log(`Fetched ${zohoInvoices.length} unpaid invoices from Zoho`);

  // Get current unpaid invoices from Supabase
  onProgress?.('Fetching existing invoices from database...', 55);
  const { data: existingInvoices, error: fetchError } = await supabaseAdmin
    .from('invoices')
    .select('zoho_invoice_id')
    .eq('status', 'unpaid');

  if (fetchError) {
    throw new Error(`Failed to fetch existing invoices: ${fetchError.message}`);
  }
  
  onProgress?.(`Found ${existingInvoices?.length || 0} existing invoices in database`, 60);

  const existingZohoIds = new Set(
    (existingInvoices as { zoho_invoice_id: string }[] | null)?.map((inv) => inv.zoho_invoice_id) || []
  );
  const currentZohoIds = new Set(zohoInvoices.map((inv) => inv.invoice_id));

  // Upsert new/updated unpaid invoices
  onProgress?.(`Processing ${zohoInvoices.length} invoices...`, 65);
  let addedCount = 0;
  const now = new Date().toISOString();
  const totalInvoices = zohoInvoices.length;

  for (let i = 0; i < zohoInvoices.length; i++) {
    const zohoInv = zohoInvoices[i];
    
    if (i % 50 === 0 || i === totalInvoices - 1) {
      const progress = 65 + Math.floor((i / totalInvoices) * 25);
      onProgress?.(`Processing invoice ${i + 1} of ${totalInvoices}...`, progress);
    }
    // Calculate internal due date (invoice_date + 30 days)
    const invoiceDate = new Date(zohoInv.invoice_date);
    const internalDueDate = new Date(invoiceDate);
    internalDueDate.setDate(internalDueDate.getDate() + 30);

    const { error: upsertError } = await supabaseAdmin
      .from('invoices')
      .upsert(
        {
          zoho_invoice_id: zohoInv.invoice_id,
          customer_name: zohoInv.customer_name,
          customer_email: zohoInv.customer_email,
          customer_phone: zohoInv.customer_phone,
          salesperson_name: zohoInv.salesperson_name,
          zoho_status: zohoInv.status,
          invoice_number: zohoInv.invoice_number,
          invoice_date: zohoInv.invoice_date,
          invoice_total: zohoInv.total,
          balance: zohoInv.balance,
          internal_due_date: internalDueDate.toISOString().split('T')[0], // YYYY-MM-DD
          status: 'unpaid',
          last_synced_at: now,
        } as any,
        {
          onConflict: 'zoho_invoice_id',
        }
      );

    if (upsertError) {
      console.error(`Failed to upsert invoice ${zohoInv.invoice_id}:`, upsertError);
    } else {
      if (!existingZohoIds.has(zohoInv.invoice_id)) {
        addedCount++;
      }
    }
  }

  // Remove invoices that are no longer unpaid in Zoho
  onProgress?.('Checking for invoices to remove...', 90);
  const toRemove = Array.from(existingZohoIds).filter((id) => !currentZohoIds.has(id));
  let removedCount = 0;

  if (toRemove.length > 0) {
    onProgress?.(`Removing ${toRemove.length} paid invoices...`, 92);
    const { error: deleteError } = await supabaseAdmin
      .from('invoices')
      .delete()
      .in('zoho_invoice_id', toRemove);

    if (deleteError) {
      console.error('Failed to remove paid invoices:', deleteError);
    } else {
      removedCount = toRemove.length;
    }
  }

  // Get total unpaid count
  onProgress?.('Finalizing sync...', 95);
  const { count: totalUnpaid } = await supabaseAdmin
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unpaid');

  onProgress?.('Sync completed successfully!', 100);
  
  return {
    addedCount,
    removedCount,
    totalUnpaid: totalUnpaid || 0,
  };
}

