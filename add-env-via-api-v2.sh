#!/bin/bash

TOKEN="Qsttz8Cmot74HkrpTIUPUhFd"
PROJECT_ID="prj_N3AcodCDYqGd6iQq8zrXpw0PlA2E"

# Better function to extract value - handles various formats
get_env_value() {
  local key=$1
  # Try different extraction methods
  local value=$(grep "^${key}=" .env.local 2>/dev/null | sed "s/^${key}=//" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/")
  echo "$value"
}

# Function to add env var to Vercel
add_env_var() {
  local name=$1
  local value=$2
  local env=$3
  
  # Remove any newlines from value
  value=$(echo "$value" | tr -d '\n\r')
  
  if [ -z "$value" ] || [ "$value" = "" ]; then
    echo "⚠ Skipping $name (empty or not found)"
    return 1
  fi
  
  echo "Adding $name to $env (value length: ${#value})..."
  
  # Escape JSON special characters
  value_escaped=$(echo "$value" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')
  
  response=$(curl -s -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"key\": \"$name\",
      \"value\": \"$value_escaped\",
      \"type\": \"encrypted\",
      \"target\": [\"$env\"]
    }")
  
  if echo "$response" | grep -q "\"key\"" || echo "$response" | grep -q "\"id\""; then
    echo "✓ Successfully added $name to $env"
    return 0
  else
    echo "✗ Failed: $response"
    return 1
  fi
}

echo "Reading environment variables from .env.local..."
echo ""

# Read and display values (first 20 chars for verification)
SUPABASE_URL=$(get_env_value "SUPABASE_URL")
SUPABASE_KEY=$(get_env_value "SUPABASE_SERVICE_ROLE_KEY")
ZOHO_CLIENT_ID=$(get_env_value "ZOHO_CLIENT_ID")
ZOHO_CLIENT_SECRET=$(get_env_value "ZOHO_CLIENT_SECRET")
ZOHO_REFRESH=$(get_env_value "ZOHO_REFRESH_TOKEN")
ZOHO_ORG=$(get_env_value "ZOHO_ORG_ID")

echo "Found values (first 20 chars):"
echo "SUPABASE_URL: ${SUPABASE_URL:0:20}..."
echo "SUPABASE_KEY: ${SUPABASE_KEY:0:20}..."
echo "ZOHO_CLIENT_ID: ${ZOHO_CLIENT_ID:0:20}..."
echo "ZOHO_CLIENT_SECRET: ${ZOHO_CLIENT_SECRET:0:20}..."
echo "ZOHO_REFRESH: ${ZOHO_REFRESH:0:20}..."
echo "ZOHO_ORG: ${ZOHO_ORG:0:20}..."
echo ""

# Add to all environments
for env in production preview development; do
  echo "=== Adding to $env environment ==="
  add_env_var "SUPABASE_URL" "$SUPABASE_URL" "$env"
  add_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_KEY" "$env"
  add_env_var "ZOHO_CLIENT_ID" "$ZOHO_CLIENT_ID" "$env"
  add_env_var "ZOHO_CLIENT_SECRET" "$ZOHO_CLIENT_SECRET" "$env"
  add_env_var "ZOHO_REFRESH_TOKEN" "$ZOHO_REFRESH" "$env"
  add_env_var "ZOHO_ORG_ID" "$ZOHO_ORG" "$env"
  echo ""
done

echo "✅ Environment variables setup complete!"
