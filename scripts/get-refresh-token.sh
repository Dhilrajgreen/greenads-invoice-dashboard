#!/bin/bash

# Script to exchange authorization code for refresh token
# Usage: ./scripts/get-refresh-token.sh YOUR_AUTHORIZATION_CODE

CLIENT_ID="1000.COFK03HI8UUBCB61VACWPLYHY1RKBX"
CLIENT_SECRET="4904f275019b8330557293c8aaa39520a740c2a13a"
REDIRECT_URI="https://www.zoho.com/books"

if [ -z "$1" ]; then
  echo "Usage: ./scripts/get-refresh-token.sh YOUR_AUTHORIZATION_CODE"
  echo ""
  echo "Steps:"
  echo "1. Visit this URL in your browser:"
  echo "   https://accounts.zoho.com/oauth/v2/auth?scope=ZohoBooks.fullaccess.all&client_id=${CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=${REDIRECT_URI}"
  echo ""
  echo "2. Sign in and authorize the application"
  echo ""
  echo "3. You'll be redirected to: https://www.zoho.com/books?code=1000.xxxxxxxxxxxxx"
  echo ""
  echo "4. Copy the code value (the part after code=) and run:"
  echo "   ./scripts/get-refresh-token.sh 1000.xxxxxxxxxxxxx"
  exit 1
fi

AUTH_CODE=$1

echo "Exchanging authorization code for refresh token..."
echo ""

response=$(curl -s -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "redirect_uri=${REDIRECT_URI}" \
  -d "code=${AUTH_CODE}")

echo "Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"
echo ""

# Extract refresh token if successful
refresh_token=$(echo "$response" | grep -o '"refresh_token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$refresh_token" ]; then
  echo ""
  echo "✅ SUCCESS! Refresh token obtained:"
  echo "$refresh_token"
  echo ""
  echo "Update your .env.local file with:"
  echo "ZOHO_REFRESH_TOKEN=$refresh_token"
else
  echo ""
  echo "❌ Failed to get refresh token. Check the error message above."
fi

