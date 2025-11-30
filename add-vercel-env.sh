#!/bin/bash
# Helper script to add environment variables to Vercel from .env.local

if [ ! -f .env.local ]; then
  echo "Error: .env.local not found"
  exit 1
fi

# Read variables from .env.local
source .env.local

# Function to add env var to all environments
add_env_var() {
  local var_name=$1
  local var_value=$2
  
  if [ -z "$var_value" ]; then
    echo "Skipping $var_name (empty value)"
    return
  fi
  
  echo "Adding $var_name..."
  echo "$var_value" | npx vercel env add "$var_name" production
  echo "$var_value" | npx vercel env add "$var_name" preview  
  echo "$var_value" | npx vercel env add "$var_name" development
}

# Add each variable
add_env_var "SUPABASE_URL" "$SUPABASE_URL"
add_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
add_env_var "ZOHO_CLIENT_ID" "$ZOHO_CLIENT_ID"
add_env_var "ZOHO_CLIENT_SECRET" "$ZOHO_CLIENT_SECRET"
add_env_var "ZOHO_REFRESH_TOKEN" "$ZOHO_REFRESH_TOKEN"
add_env_var "ZOHO_ORG_ID" "$ZOHO_ORG_ID"

echo "Done!"
