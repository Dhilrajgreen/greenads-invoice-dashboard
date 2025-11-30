export interface ZohoInvoice {
  invoice_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  salesperson_name: string | null;
  status: string; // Zoho status: Sent, Overdue, Paid, etc.
  invoice_number: string;
  invoice_date: string; // ISO date string
  total: number;
  balance: number;
}

export interface Invoice {
  id: string;
  zoho_invoice_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  salesperson_name: string | null;
  zoho_status: string | null;
  invoice_number: string | null;
  invoice_date: string | null; // ISO date string
  invoice_total: number | null;
  balance: number | null;
  internal_due_date: string | null; // ISO date string
  status: 'unpaid' | 'paid';
  last_synced_at: string | null; // ISO timestamp
}

export interface SyncStats {
  addedCount: number;
  removedCount: number;
  totalUnpaid: number;
}

