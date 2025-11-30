#!/bin/bash
# Read .env.local and extract values
if [ ! -f .env.local ]; then
  echo ".env.local not found"
  exit 1
fi

# Extract values (handling quoted and unquoted values)
SUPABASE_URL=$(grep "^SUPABASE_URL=" .env.local | sed 's/^SUPABASE_URL=//' | sed 's/^"//' | sed 's/"$//')
SUPABASE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | sed 's/^SUPABASE_SERVICE_ROLE_KEY=//' | sed 's/^"//' | sed 's/"$//')
ZOHO_CLIENT_ID=$(grep "^ZOHO_CLIENT_ID=" .env.local | sed 's/^ZOHO_CLIENT_ID=//' | sed 's/^"//' | sed 's/"$//')
ZOHO_CLIENT_SECRET=$(grep "^ZOHO_CLIENT_SECRET=" .env.local | sed 's/^ZOHO_CLIENT_SECRET=//' | sed 's/^"//' | sed 's/"$//')
ZOHO_REFRESH=$(grep "^ZOHO_REFRESH_TOKEN=" .env.local | sed 's/^ZOHO_REFRESH_TOKEN=//' | sed 's/^"//' | sed 's/"$//')
ZOHO_ORG=$(grep "^ZOHO_ORG_ID=" .env.local | sed 's/^ZOHO_ORG_ID=//' | sed 's/^"//' | sed 's/"$//')

echo "Found environment variables. Adding to Vercel..."
echo ""

# Add each variable to all environments
for env in production preview development; do
  echo "Adding to $env environment..."
  
  echo "$SUPABASE_URL" | npx vercel env add SUPABASE_URL $env <<< "y" 2>/dev/null || echo "$SUPABASE_URL" | npx vercel env add SUPABASE_URL $env
  echo "$SUPABASE_KEY" | npx vercel env add SUPABASE_SERVICE_ROLE_KEY $env <<< "y" 2>/dev/null || echo "$SUPABASE_KEY" | npx vercel env add SUPABASE_SERVICE_ROLE_KEY $env
  echo "$ZOHO_CLIENT_ID" | npx vercel env add ZOHO_CLIENT_ID $env <<< "y" 2>/dev/null || echo "$ZOHO_CLIENT_ID" | npx vercel env add ZOHO_CLIENT_ID $env
  echo "$ZOHO_CLIENT_SECRET" | npx vercel env add ZOHO_CLIENT_SECRET $env <<< "y" 2>/dev/null || echo "$ZOHO_CLIENT_SECRET" | npx vercel env add ZOHO_CLIENT_SECRET $env
  echo "$ZOHO_REFRESH" | npx vercel env add ZOHO_REFRESH_TOKEN $env <<< "y" 2>/dev/null || echo "$ZOHO_REFRESH" | npx vercel env add ZOHO_REFRESH_TOKEN $env
  echo "$ZOHO_ORG" | npx vercel env add ZOHO_ORG_ID $env <<< "y" 2>/dev/null || echo "$ZOHO_ORG" | npx vercel env add ZOHO_ORG_ID $env
done

echo ""
echo "Done!"
