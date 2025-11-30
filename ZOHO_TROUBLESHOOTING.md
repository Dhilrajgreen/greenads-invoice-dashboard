# Zoho API 401 Error Troubleshooting

If you're getting a **401 Unauthorized** error (code 57) when syncing invoices, follow these steps:

## Error: "You are not authorized to perform this operation"

This error typically means your refresh token doesn't have the required **Books API scope**.

## Solution: Regenerate Refresh Token with Books API Scope

### Step 1: Generate Authorization Code

1. Go to [Zoho API Console](https://api-console.zoho.com/)
2. Select your application
3. Note your **Client ID** and **Client Secret**

### Step 2: Get Authorization Code

Open this URL in your browser (replace with your Client ID):

```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoBooks.fullaccess.all&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=https://www.zoho.com/books
```

**Important**: The scope must include `ZohoBooks.fullaccess.all` or `ZohoBooks.invoices.READ`

After authorization, you'll be redirected to a URL like:
```
https://www.zoho.com/books?code=1000.xxxxxxxxxxxxx&location=us
```

Copy the `code` value from the URL.

### Step 3: Exchange Code for Refresh Token

Use this curl command (replace the values):

```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://www.zoho.com/books" \
  -d "code=CODE_FROM_STEP_2"
```

The response will include:
- `access_token` (temporary)
- `refresh_token` (save this!)
- `expires_in`

### Step 4: Update .env.local

Update your `.env.local` file with the new refresh token:

```env
ZOHO_REFRESH_TOKEN=1000.your_new_refresh_token_here
```

### Step 5: Verify Organization ID

1. Log into [Zoho Books](https://books.zoho.com)
2. Go to **Settings → Organization**
3. Your Organization ID is in the URL or displayed on the page
4. Verify it matches `ZOHO_ORG_ID=849360641` in your `.env.local`

### Step 6: Test the Connection

1. Restart your dev server:
   ```bash
   npm run dev
   ```

2. Test token generation:
   Visit: `http://localhost:3000/api/test-zoho`
   
   Should return: `{"success":true,"message":"Access token generated successfully"}`

3. Try syncing again from the dashboard

## Alternative: Using Zoho Books API Console

1. Go to [Zoho API Console](https://api-console.zoho.com/)
2. Select your application
3. Go to **Client Secret** tab
4. Click **Generate Code**
5. Select scope: **ZohoBooks.fullaccess.all**
6. Authorize and copy the refresh token

## Common Issues

### Issue: "Invalid refresh token"
- **Solution**: The refresh token may have expired or been revoked. Generate a new one.

### Issue: "Organization not found"
- **Solution**: Verify your `ZOHO_ORG_ID` is correct. It should be a number like `849360641`.

### Issue: "Insufficient permissions"
- **Solution**: Make sure your API application has Books API access enabled in the Zoho API Console.

## Testing Your Setup

You can test if your token works by making a direct API call:

```bash
# First, get an access token (replace with your credentials)
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "grant_type=refresh_token" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "refresh_token=YOUR_REFRESH_TOKEN"

# Then test the Books API (replace ACCESS_TOKEN and ORG_ID)
curl -X GET "https://www.zohoapis.com/books/v3/invoices?organization_id=YOUR_ORG_ID&status=unpaid&per_page=1" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN"
```

If the second command returns invoice data, your setup is correct!

