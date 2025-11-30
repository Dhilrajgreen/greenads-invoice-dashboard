# Environment Variables Setup

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

## Notes

- `.env.local` is gitignored and should not be committed
- For Google service account private key, if it contains `\n` characters, they should be preserved as `\n` in the env file (not actual newlines)
- The `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` should be the full private key string from the JSON key file

