# Create the Invoices Table in Supabase

## Quick Steps:

1. **Go to your Supabase Dashboard**
   - Visit: https://zeiuvoqbbihexyshtzjz.supabase.co
   - Sign in to your Supabase account

2. **Open SQL Editor**
   - Click on **"SQL Editor"** in the left sidebar
   - Click **"New query"** button

3. **Copy and Paste this SQL:**

```sql
-- Create invoices table in Supabase
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
```

4. **Run the SQL**
   - Click the **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
   - You should see: "Success. No rows returned"

5. **Verify the Table**
   - Click on **"Table Editor"** in the left sidebar
   - You should see the `invoices` table listed
   - Click on it to see the table structure

6. **Test the Sync**
   - Go back to your dashboard: http://localhost:3000
   - Click **"Run Sync Now"**
   - It should work now!

## Alternative: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

But the SQL Editor method above is the easiest!

