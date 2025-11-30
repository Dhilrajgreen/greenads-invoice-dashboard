#!/bin/bash

TOKEN="Qsttz8Cmot74HkrpTIUPUhFd"
PROJECT_ID="prj_N3AcodCDYqGd6iQq8zrXpw0PlA2E"
ORG_ID="team_CwA7mCAgmJyOztURRiOmLuCO"

# Function to extract value from .env.local
get_env_value() {
  grep "^$1=" .env.local | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//' | sed "s/^'//" | sed "s/'$//"
}

# Function to add env var to Vercel
add_env_var() {
  local name=$1
  local value=$2
  local env=$3
  
  if [ -z "$value" ]; then
    echo "Skipping $name (empty value)"
    return 1
  fi
  
  echo "Adding $name to $env..."
  
  response=$(curl -s -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"key\": \"$name\",
      \"value\": \"$value\",
      \"type\": \"encrypted\",
      \"target\": [\"$env\"]
    }")
  
  if echo "$response" | grep -q "\"key\""; then
    echo "✓ Added $name to $env"
  else
    echo "✗ Failed to add $name to $env: $response"
  fi
}

# Read values
SUPABASE_URL=$(get_env_value "SUPABASE_URL")
SUPABASE_KEY=$(get_env_value "SUPABASE_SERVICE_ROLE_KEY")
ZOHO_CLIENT_ID=$(get_env_value "ZOHO_CLIENT_ID")
ZOHO_CLIENT_SECRET=$(get_env_value "ZOHO_CLIENT_SECRET")
ZOHO_REFRESH=$(get_env_value "ZOHO_REFRESH_TOKEN")
ZOHO_ORG=$(get_env_value "ZOHO_ORG_ID")

echo "Adding environment variables to Vercel..."
echo ""

# Add to all environments
for env in production preview development; do
  echo "=== $env ==="
  add_env_var "SUPABASE_URL" "$SUPABASE_URL" "$env"
  add_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_KEY" "$env"
  add_env_var "ZOHO_CLIENT_ID" "$ZOHO_CLIENT_ID" "$env"
  add_env_var "ZOHO_CLIENT_SECRET" "$ZOHO_CLIENT_SECRET" "$env"
  add_env_var "ZOHO_REFRESH_TOKEN" "$ZOHO_REFRESH" "$env"
  add_env_var "ZOHO_ORG_ID" "$ZOHO_ORG" "$env"
  echo ""
done

echo "Done!"
