#!/bin/bash
# This script will guide you to add env vars via Vercel API
# First, we need your Vercel token

echo "To add environment variables via API, we need:"
echo "1. Your Vercel token (get it from: https://vercel.com/account/tokens)"
echo "2. The values from your .env.local file"
echo ""
echo "Alternatively, use the dashboard (easiest):"
echo "https://vercel.com/zoho-dashboards-projects/greenads-invoice-dashboard/settings/environment-variables"
echo ""
echo "Or run these commands manually (each will prompt for the value):"
echo "npx vercel env add SUPABASE_URL"
echo "npx vercel env add SUPABASE_SERVICE_ROLE_KEY"
echo "npx vercel env add ZOHO_CLIENT_ID"
echo "npx vercel env add ZOHO_CLIENT_SECRET"
echo "npx vercel env add ZOHO_REFRESH_TOKEN"
echo "npx vercel env add ZOHO_ORG_ID"
