# How to Get a New Zoho Refresh Token

## Step 1: Visit the Authorization URL

Open this URL in your browser:

```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoBooks.fullaccess.all&client_id=1000.COFK03HI8UUBCB61VACWPLYHY1RKBX&response_type=code&access_type=offline&redirect_uri=https://www.zoho.com/books
```

## Step 2: Sign In and Authorize

1. Sign in to your Zoho account
2. Review the permissions requested
3. Click **"Allow"** or **"Accept"** to authorize the application

## Step 3: Get the Authorization Code

After authorization, you'll be redirected to a URL like:

```
https://www.zoho.com/books?code=1000.xxxxxxxxxxxxx&location=us
```

**Copy the code value** - it's the part after `code=` (e.g., `1000.xxxxxxxxxxxxx`)

## Step 4: Exchange Code for Refresh Token

### Option A: Using the Script (Easiest)

Run the helper script:

```bash
./scripts/get-refresh-token.sh YOUR_CODE_HERE
```

Replace `YOUR_CODE_HERE` with the code you copied from Step 3.

### Option B: Using curl Manually

```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "grant_type=authorization_code" \
  -d "client_id=1000.COFK03HI8UUBCB61VACWPLYHY1RKBX" \
  -d "client_secret=4904f275019b8330557293c8aaa39520a740c2a13a" \
  -d "redirect_uri=https://www.zoho.com/books" \
  -d "code=YOUR_CODE_HERE"
```

Replace `YOUR_CODE_HERE` with the code from Step 3.

## Step 5: Update .env.local

The response will look like:

```json
{
  "access_token": "1000.xxxxx...",
  "refresh_token": "1000.yyyyy...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

Copy the `refresh_token` value and update your `.env.local` file:

```env
ZOHO_REFRESH_TOKEN=1000.yyyyy...
```

## Step 6: Restart Your Server

```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

## Step 7: Test

1. Visit `http://localhost:3000/api/test-zoho` to verify token generation
2. Try syncing invoices from the dashboard

## Troubleshooting

### "Invalid code" error
- The authorization code expires quickly (usually within 10 minutes)
- Generate a new code by visiting the authorization URL again

### "Invalid redirect_uri" error
- Make sure the redirect URI matches exactly: `https://www.zoho.com/books`
- No trailing slashes or different protocols

### Still getting 401 errors
- Make sure the refresh token includes the `ZohoBooks.fullaccess.all` scope
- Verify your Organization ID is correct in `.env.local`

