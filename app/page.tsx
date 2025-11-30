import { supabaseAdmin } from '@/lib/supabaseAdmin';
import DashboardClient from '@/components/DashboardClient';
import { Invoice } from '@/types/invoice';

// Disable caching to ensure fresh data on every request
export const revalidate = 0;
export const dynamic = 'force-dynamic';

async function getInvoices(): Promise<Invoice[]> {
  if (!supabaseAdmin) {
    console.warn('Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('status', 'unpaid')
    .order('internal_due_date', { ascending: true });

  if (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }

  return (data as Invoice[]) || [];
}

async function getLastSyncTime(): Promise<string | null> {
  if (!supabaseAdmin) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('last_synced_at')
    .order('last_synced_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return (data as { last_synced_at: string | null }).last_synced_at;
}

export default async function DashboardPage() {
  const isConfigured = !!supabaseAdmin;
  const invoices = await getInvoices();
  const lastSyncTime = await getLastSyncTime();

  // Debug: Log invoice count and sample customer names
  console.log(`Loaded ${invoices.length} invoices`);
  if (invoices.length > 0) {
    console.log('Sample customer names:', invoices.slice(0, 3).map(inv => inv.customer_name));
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Greenads Global Invoice Aging Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Last synced:{' '}
            {lastSyncTime
              ? new Date(lastSyncTime).toLocaleString()
              : 'No sync yet'}
          </p>
        </header>

        {!isConfigured && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium">⚠️ Configuration Required</p>
            <p className="text-yellow-700 text-sm mt-1">
              Please set up your <code className="bg-yellow-100 px-1 rounded">.env.local</code> file with Supabase credentials.
              See <code className="bg-yellow-100 px-1 rounded">ENV_SETUP.md</code> for details.
            </p>
          </div>
        )}

        <DashboardClient initialInvoices={invoices} />
      </div>
    </div>
  );
}

