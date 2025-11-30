-- Create invoices table in Supabase
-- Run this SQL in your Supabase SQL editor

create table invoices (
  id uuid primary key default gen_random_uuid(),
  zoho_invoice_id text unique not null,
  customer_name text,
  customer_email text,
  customer_phone text,
  salesperson_name text,
  zoho_status text, -- status from Zoho (Sent, Overdue, Paid, etc.)
  invoice_number text,
  invoice_date date,
  invoice_total numeric,
  balance numeric,
  internal_due_date date,
  status text default 'unpaid', -- internal: 'unpaid' | 'paid'
  last_synced_at timestamptz default now()
);

-- Create an index on zoho_invoice_id for faster lookups
create index idx_invoices_zoho_invoice_id on invoices(zoho_invoice_id);

-- Create an index on status and internal_due_date for filtering
create index idx_invoices_status_due_date on invoices(status, internal_due_date);

-- Create an index on last_synced_at for getting the latest sync time
create index idx_invoices_last_synced_at on invoices(last_synced_at desc);

