# Supabase Integration Guide

This guide will walk you through setting up Supabase for the Invoice Aging Dashboard.

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign in"**
3. Sign up with GitHub, Google, or email

## Step 2: Create a New Project

1. Once logged in, click **"New Project"**
2. Fill in the project details:
   - **Name**: Give your project a name (e.g., "Invoice Dashboard")
   - **Database Password**: Create a strong password (save this - you'll need it)
   - **Region**: Choose the region closest to you
   - **Pricing Plan**: Free tier is fine for development
3. Click **"Create new project"**
4. Wait 2-3 minutes for the project to be set up

## Step 3: Get Your Supabase Credentials

1. In your Supabase project dashboard, click on the **Settings** icon (gear icon) in the left sidebar
2. Click **"API"** in the settings menu
3. You'll see two important values:

   ### Project URL
   - This is your `SUPABASE_URL`
   - It looks like: `https://xxxxxxxxxxxxx.supabase.co`
   - Copy this value

   ### Service Role Key (Secret)
   - This is your `SUPABASE_SERVICE_ROLE_KEY`
   - **⚠️ Important**: This is a secret key - never expose it publicly
   - Click **"Reveal"** to show it, then copy it
   - It's a long string starting with `eyJ...`

## Step 4: Create the Database Table

1. In your Supabase dashboard, click on **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy and paste the entire contents of `database/schema.sql` file:

```sql
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
```

4. Click **"Run"** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
5. You should see a success message: "Success. No rows returned"

## Step 5: Verify the Table Was Created

1. Click on **"Table Editor"** in the left sidebar
2. You should see the `invoices` table listed
3. Click on it to see the table structure with all columns

## Step 6: Set Up Environment Variables

1. In your project root directory, create a file named `.env.local`
2. Add your Supabase credentials:

```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important Notes:**
- Replace `xxxxxxxxxxxxx` with your actual project URL
- Replace `eyJ...` with your actual service role key
- Do NOT commit `.env.local` to git (it's already in `.gitignore`)
- The service role key should be on a single line

## Step 7: Test the Connection

1. Restart your Next.js development server:
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   ```

2. Open your browser to `http://localhost:3000`
3. The yellow configuration warning should disappear
4. You should see the dashboard with empty metrics (no invoices yet)

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure `.env.local` exists in the project root
- Check that the variable names are exactly: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Restart your dev server after adding environment variables

### "relation 'invoices' does not exist" error
- Make sure you ran the SQL from `database/schema.sql` in the Supabase SQL Editor
- Check the Table Editor to verify the table exists

### "permission denied" error
- Make sure you're using the **Service Role Key** (not the anon/public key)
- The service role key has admin privileges needed for this app

### Can't find Service Role Key
- Go to Settings → API
- Scroll down to find "Project API keys"
- Look for "service_role" key (it's the secret one)
- Click "Reveal" to see it

## Next Steps

Once Supabase is set up:
1. ✅ Supabase is configured
2. Set up Zoho credentials in `.env.local`
3. Set up Google Sheets credentials (optional, for export feature)
4. Click "Run Sync Now" to fetch invoices from Zoho

## Security Best Practices

- **Never commit** `.env.local` to version control
- **Never share** your Service Role Key publicly
- The Service Role Key has full database access - keep it secure
- For production, consider using environment variables in your hosting platform (Vercel, etc.)

