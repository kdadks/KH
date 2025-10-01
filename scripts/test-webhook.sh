#!/bin/bash

# Test webhook endpoint after environment variables are set
echo "🧪 Testing webhook with environment variables..."

# Test 1: Basic endpoint availability
echo "1. Testing basic endpoint..."
curl -s -X GET "https://uat--khtherapy.netlify.app/.netlify/functions/sumup-return" | jq '.'

echo ""
echo "2. Testing webhook with mock data..."

# Test 2: Mock webhook call
curl -s -X POST "https://uat--khtherapy.netlify.app/.netlify/functions/sumup-return" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_event_123",
    "type": "checkout.completed",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'",
    "data": {
      "id": "test_checkout_456", 
      "checkout_reference": "payment-request-TEST-'$(date +%s)'",
      "amount": 50.00,
      "currency": "EUR",
      "status": "COMPLETED",
      "transaction_id": "test_txn_'$(date +%s)'",
      "payment_request_id": 999
    }
  }' | jq '.'

echo ""
echo "✅ Webhook test complete!"