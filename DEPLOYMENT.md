# Deployment Guide

This guide covers deploying the Greenads Global Invoice Aging Dashboard to various platforms.

## Prerequisites

1. All environment variables configured (see `.env.local`)
2. Database table created in Supabase
3. Git repository (optional but recommended)

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)

Vercel is the easiest way to deploy Next.js applications.

#### Steps:

1. **Install Vercel CLI** (optional, or use web interface):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via CLI**:
   ```bash
   vercel
   ```
   Follow the prompts to link your project.

3. **Or Deploy via Web Interface**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up/Login with GitHub
   - Click "New Project"
   - Import your repository
   - Add environment variables (see below)
   - Deploy

4. **Set Environment Variables in Vercel**:
   - Go to Project Settings → Environment Variables
   - Add all variables from your `.env.local`:
     ```
     SUPABASE_URL
     SUPABASE_SERVICE_ROLE_KEY
     ZOHO_CLIENT_ID
     ZOHO_CLIENT_SECRET
     ZOHO_REFRESH_TOKEN
     ZOHO_ORG_ID
     GOOGLE_SERVICE_ACCOUNT_EMAIL
     GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
     GOOGLE_SHEETS_SPREADSHEET_ID
     GOOGLE_SHEETS_RANGE_NAME
     ```

5. **Configure Daily Sync (Optional)**:
   - Create `vercel.json` in project root (see below)
   - Or use Vercel Cron Jobs in dashboard

6. **Redeploy** after adding environment variables

#### Vercel Cron Configuration

Create `vercel.json`:
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

This syncs daily at 9 AM UTC.

---

### Option 2: Railway

1. Go to [railway.app](https://railway.app)
2. Sign up/Login
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables in Railway dashboard
6. Railway will auto-detect Next.js and deploy

---

### Option 3: Netlify

1. Go to [netlify.com](https://netlify.com)
2. Sign up/Login
3. Click "Add new site" → "Import an existing project"
4. Connect your Git repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Add environment variables in Site settings
7. Deploy

---

### Option 4: Self-Hosted Server (VPS/Dedicated)

#### Requirements:
- Node.js 18+ installed
- PM2 or similar process manager
- Nginx (recommended for reverse proxy)

#### Steps:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Install PM2**:
   ```bash
   npm install -g pm2
   ```

3. **Start the application**:
   ```bash
   pm2 start npm --name "invoice-dashboard" -- start
   ```

4. **Save PM2 configuration**:
   ```bash
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx** (example):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **Set up SSL with Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

7. **Set up daily sync cron**:
   ```bash
   crontab -e
   ```
   Add:
   ```bash
   0 9 * * * curl -X POST https://your-domain.com/api/sync
   ```

---

### Option 5: Docker Deployment

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:18-alpine AS base

   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   COPY package.json package-lock.json* ./
   RUN npm ci

   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN npm run build

   # Production image, copy all the files and run next
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV production
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   USER nextjs
   EXPOSE 3000
   ENV PORT 3000
   CMD ["node", "server.js"]
   ```

2. **Update next.config.js** (add output: 'standalone'):
   ```js
   const nextConfig = {
     output: 'standalone',
   }
   ```

3. **Build and run**:
   ```bash
   docker build -t invoice-dashboard .
   docker run -p 3000:3000 --env-file .env.local invoice-dashboard
   ```

---

## Environment Variables Setup

For all deployment platforms, you need to set these environment variables:

```env
SUPABASE_URL=https://zeiuvoqbbihexyshtzjz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_REFRESH_TOKEN=your_zoho_refresh_token
ZOHO_ORG_ID=your_zoho_org_id

GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=your_private_key
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SHEETS_RANGE_NAME=OverdueInvoices!A1
```

**Important Notes:**
- Never commit `.env.local` to Git
- Use platform-specific environment variable settings
- For Google private key, keep `\n` characters as `\n` (not actual newlines)

---

## Post-Deployment Checklist

- [ ] Environment variables are set correctly
- [ ] Application builds successfully
- [ ] Database connection works
- [ ] Zoho API connection works
- [ ] Sync functionality works
- [ ] Excel export works
- [ ] Daily cron job is configured (if needed)
- [ ] SSL certificate is installed (for production)
- [ ] Domain is configured (if using custom domain)

---

## Troubleshooting

### Build Errors
- Check Node.js version (needs 18+)
- Ensure all dependencies are installed
- Check for TypeScript errors

### Runtime Errors
- Verify all environment variables are set
- Check Supabase connection
- Verify Zoho API credentials
- Check server logs

### API Errors
- Ensure API routes are accessible
- Check CORS settings if needed
- Verify environment variables in production

---

## Quick Deploy Commands

### Vercel:
```bash
npm i -g vercel
vercel
```

### Railway:
```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

### Docker:
```bash
docker build -t invoice-dashboard .
docker run -p 3000:3000 --env-file .env.local invoice-dashboard
```

