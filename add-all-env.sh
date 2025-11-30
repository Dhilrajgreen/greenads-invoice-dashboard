#!/bin/bash
# Read values from .env.local
source <(grep -v '^#' .env.local | grep -E '^(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|ZOHO_CLIENT_ID|ZOHO_CLIENT_SECRET|ZOHO_REFRESH_TOKEN|ZOHO_ORG_ID)=' | sed 's/^/export /')

# Function to add env var
add_var() {
  local name=$1
  local value=$2
  local env=$3
  
  if [ -z "$value" ]; then
    echo "Skipping $name (empty)"
    return
  fi
  
  echo "Adding $name to $env..."
  (echo "y"; echo "$value") | npx vercel env add "$name" "$env" 2>&1 | grep -v "Your value will be encrypted" || true
}

# Add to all environments
for env in production preview development; do
  echo "=== Adding to $env ==="
  add_var "SUPABASE_URL" "$SUPABASE_URL" "$env"
  add_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "$env"
  add_var "ZOHO_CLIENT_ID" "$ZOHO_CLIENT_ID" "$env"
  add_var "ZOHO_CLIENT_SECRET" "$ZOHO_CLIENT_SECRET" "$env"
  add_var "ZOHO_REFRESH_TOKEN" "$ZOHO_REFRESH_TOKEN" "$env"
  add_var "ZOHO_ORG_ID" "$ZOHO_ORG_ID" "$env"
done

echo "Done!"
