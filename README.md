# Invoice Aging Dashboard

A Next.js dashboard application that syncs unpaid invoices from Zoho Books, tracks them with an internal 30-day due date, and allows exporting overdue invoices to Google Sheets.

## Features

- **Automatic Sync**: Fetches unpaid invoices from Zoho Books API (last 30 days)
- **Daily Updates**: API endpoint ready for scheduled daily syncs
- **Internal Due Date Tracking**: Automatically calculates 30-day due dates from invoice date
- **Overdue Detection**: Highlights overdue invoices and those due soon
- **Google Sheets Export**: Export overdue invoices to a Google Sheet
- **Filtering & Search**: Filter by status and search by customer, invoice number, or salesperson

## Tech Stack

- **Next.js 14+** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (Database)
- **Zoho Books API** (Invoice data)
- **Google Sheets API** (Export functionality)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_REFRESH_TOKEN=your_zoho_refresh_token
ZOHO_ORG_ID=your_zoho_organization_id

GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=your_service_account_private_key
GOOGLE_SHEETS_SPREADSHEET_ID=your_google_sheet_id
GOOGLE_SHEETS_RANGE_NAME=OverdueInvoices!A1
```

### 3. Database Setup

1. Go to your Supabase project
2. Open the SQL Editor
3. Run the SQL from `database/schema.sql` to create the `invoices` table

### 4. Zoho API Setup

1. Create a Zoho API application at https://api-console.zoho.com/
2. Generate a refresh token for your application
3. Get your Organization ID from Zoho Books settings
4. Add the credentials to your `.env.local` file

### 5. Google Sheets API Setup

1. Create a Google Cloud Project
2. Enable the Google Sheets API
3. Create a Service Account and download the JSON key
4. Extract the `client_email` and `private_key` from the JSON
5. Share your Google Sheet with the service account email (viewer or editor permissions)
6. Add the credentials to your `.env.local` file

### 6. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Manual Sync

Click the "Run Sync Now" button on the dashboard to manually sync invoices from Zoho.

### Daily Automatic Sync

The application includes an API endpoint (`POST /api/sync`) that can be called by an external scheduler.

#### Option 1: Vercel Cron (if deployed on Vercel)

Create a `vercel.json` file in your project root:

```json
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "0 9 * * *"
    }
  ]
}
```

This will trigger the sync at 9 AM UTC daily.

#### Option 2: System Cron (Linux/Mac)

Add to your crontab (`crontab -e`):

```bash
# Run sync daily at 9 AM
0 9 * * * curl -X POST https://your-domain.com/api/sync
```

#### Option 3: External Cron Service

Use services like:
- [cron-job.org](https://cron-job.org/)
- [EasyCron](https://www.easycron.com/)
- [Cronitor](https://cronitor.io/)

Configure them to send a POST request to `https://your-domain.com/api/sync` once per day.

#### Example cURL Command

```bash
curl -X POST https://your-domain.com/api/sync
```

### Export Overdue Invoices

Click the "Export Overdue to Google Sheets" button to export all overdue invoices to your configured Google Sheet.

## API Endpoints

### POST /api/sync

Syncs unpaid invoices from Zoho to Supabase.

**Response:**
```json
{
  "success": true,
  "stats": {
    "addedCount": 5,
    "removedCount": 2,
    "totalUnpaid": 15
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### POST /api/export-overdue

Exports overdue invoices to Google Sheets.

**Response:**
```json
{
  "success": true,
  "rowsExported": 8,
  "invoiceCount": 8
}
```

## Database Schema

The `invoices` table stores:

- `zoho_invoice_id`: Unique identifier from Zoho
- `customer_name`, `customer_email`, `customer_phone`: Customer information
- `salesperson_name`: Salesperson assigned to the invoice
- `zoho_status`: Status from Zoho (Sent, Overdue, Paid, etc.)
- `invoice_number`, `invoice_date`: Invoice details
- `invoice_total`, `balance`: Financial amounts
- `internal_due_date`: Calculated as `invoice_date + 30 days`
- `status`: Internal status ('unpaid' or 'paid')
- `last_synced_at`: Timestamp of last sync

## How It Works

1. **Sync Process**:
   - Fetches access token from Zoho using refresh token
   - Retrieves invoices created in the last 30 days where `balance = total` (unpaid)
   - Upserts invoices into Supabase with calculated `internal_due_date`
   - Removes invoices that are no longer unpaid in Zoho

2. **Overdue Detection**:
   - Invoices where `internal_due_date < today` are considered overdue
   - Displayed with red background in the dashboard

3. **Due Soon Detection**:
   - Invoices due within 5 days are highlighted with yellow/amber background

## Troubleshooting

### Sync Fails

- Verify Zoho credentials are correct
- Check that `ZOHO_ORG_ID` is correct
- Ensure the refresh token hasn't expired
- Check browser console and server logs for errors

### Export Fails

- Verify Google service account credentials
- Ensure the service account email has access to the Google Sheet
- Check that `GOOGLE_SHEETS_SPREADSHEET_ID` is correct
- Verify the sheet name in `GOOGLE_SHEETS_RANGE_NAME` exists

### Database Errors

- Ensure the `invoices` table exists in Supabase
- Verify `SUPABASE_SERVICE_ROLE_KEY` has proper permissions
- Check that all required columns exist in the table

## License

MIT

