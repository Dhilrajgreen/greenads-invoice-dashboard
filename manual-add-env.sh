#!/bin/bash
# Manual script to add env vars - fill in your values below

TOKEN="Qsttz8Cmot74HkrpTIUPUhFd"
PROJECT_ID="prj_N3AcodCDYqGd6iQq8zrXpw0PlA2E"

# ===== FILL IN YOUR VALUES BELOW =====
SUPABASE_URL="YOUR_SUPABASE_URL_HERE"
SUPABASE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE"
ZOHO_CLIENT_ID="YOUR_ZOHO_CLIENT_ID_HERE"
ZOHO_CLIENT_SECRET="YOUR_ZOHO_CLIENT_SECRET_HERE"
ZOHO_REFRESH="YOUR_ZOHO_REFRESH_TOKEN_HERE"
ZOHO_ORG="YOUR_ZOHO_ORG_ID_HERE"
# =====================================

add_env_var() {
  local name=$1
  local value=$2
  local env=$3
  
  if [ "$value" = "YOUR_${name}_HERE" ] || [ -z "$value" ]; then
    echo "⚠ Skipping $name (not set)"
    return 1
  fi
  
  value_escaped=$(echo "$value" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | tr -d '\n\r')
  
  echo "Adding $name to $env..."
  response=$(curl -s -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$name\",\"value\":\"$value_escaped\",\"type\":\"encrypted\",\"target\":[\"$env\"]}")
  
  if echo "$response" | grep -q "\"key\"" || echo "$response" | grep -q "\"id\""; then
    echo "✓ Added $name to $env"
  else
    echo "✗ Failed: $response"
  fi
}

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
