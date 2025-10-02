/**
 * Local Test Script for SumUp Handler
 * Tests the sumup-return.cjs function locally before deploying
 */

const fs = require('fs');
const path = require('path');

// Mock environment variables for local testing
process.env.SUPABASE_URL = 'https://your-supabase-url.supabase.co';
process.env.SUPABASE_ANON_KEY = 'your-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'your-service-key';

// Import the SumUp handler
const sumupHandler = require('../netlify/functions/sumup-return.cjs');

/**
 * Test internal payment processing call
 */
async function testInternalCall() {
  console.log('🧪 Testing SumUp Handler - Internal Call...\n');

  // Mock event object for internal call
  const mockEvent = {
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'PaymentRequestUtils/Processing'
    },
    body: JSON.stringify({
      id: `internal_event_${Date.now()}`,
      event_type: 'checkout.completed',
      timestamp: new Date().toISOString(),
      payload: {
        checkout_id: 'test-checkout-123',
        transaction_id: 'test-transaction-456',
        reference: 'payment-request-test-123',
        amount: 65,
        currency: 'EUR',
        status: 'PAID',
        merchant_code: 'INTERNAL_PROCESSING',
        payment_type: 'card',
        created_at: new Date().toISOString(),
        payment_request_id: 999,
        booking_id: 'test-booking-123',
        customer_id: 76
      }
    }),
    queryStringParameters: null,
    isBase64Encoded: false
  };

  // Mock context
  const mockContext = {
    awsRequestId: 'test-request-id',
    functionName: 'sumup-return'
  };

  try {
    console.log('📤 Sending request with body:');
    console.log(JSON.stringify(JSON.parse(mockEvent.body), null, 2));
    console.log('\n⏳ Processing...\n');

    const result = await sumupHandler.handler(mockEvent, mockContext);

    console.log('✅ Response Status:', result.statusCode);
    console.log('✅ Response Headers:', JSON.stringify(result.headers, null, 2));
    
    let responseBody;
    try {
      responseBody = JSON.parse(result.body);
      console.log('✅ Response Body (parsed):');
      console.log(JSON.stringify(responseBody, null, 2));
    } catch (e) {
      console.log('✅ Response Body (text):', result.body);
      responseBody = { raw: result.body };
    }

    // Analyze result
    if (result.statusCode === 200) {
      console.log('\n🎉 SUCCESS - Handler working correctly!');
      console.log('✅ Internal calls should now work in production');
    } else {
      console.log('\n❌ FAILED - Handler returned error');
      console.log('🔍 Error details:', responseBody.error || responseBody.message || 'Unknown error');
    }

    return result;

  } catch (error) {
    console.error('\n❌ LOCAL TEST ERROR:', error.message);
    console.error('Stack:', error.stack);
    return null;
  }
}

/**
 * Test GET request (return URL)
 */
async function testReturnURL() {
  console.log('\n\n🧪 Testing SumUp Handler - Return URL (GET)...\n');

  const mockEvent = {
    httpMethod: 'GET',
    headers: {
      'user-agent': 'Mozilla/5.0 (Test Browser)'
    },
    queryStringParameters: {
      checkout_id: 'co_test_123',
      transaction_id: 'txn_test_456',
      amount: '25.00',
      currency: 'EUR',
      status: 'PAID',
      checkout_reference: 'payment-request-test-789'
    },
    body: null,
    isBase64Encoded: false
  };

  const mockContext = {
    awsRequestId: 'test-request-id-get',
    functionName: 'sumup-return'
  };

  try {
    console.log('📤 GET request with parameters:');
    console.log(JSON.stringify(mockEvent.queryStringParameters, null, 2));
    console.log('\n⏳ Processing...\n');

    const result = await sumupHandler.handler(mockEvent, mockContext);

    console.log('✅ Response Status:', result.statusCode);
    
    if (result.statusCode === 200) {
      console.log('🎉 SUCCESS - GET handler working!');
    } else {
      console.log('❌ FAILED - GET handler error');
    }

    return result;

  } catch (error) {
    console.error('❌ GET TEST ERROR:', error.message);
    return null;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Local SumUp Handler Tests...\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Internal POST call
    const postResult = await testInternalCall();
    
    // Test 2: GET return URL
    const getResult = await testReturnURL();

    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY:');
    console.log(`POST (Internal): ${postResult?.statusCode === 200 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`GET (Return URL): ${getResult?.statusCode === 200 ? '✅ PASS' : '❌ FAIL'}`);

    if (postResult?.statusCode === 200 && getResult?.statusCode === 200) {
      console.log('\n🎉 ALL TESTS PASSED - Safe to deploy!');
    } else {
      console.log('\n⚠️ Some tests failed - fix issues before deploying');
    }

  } catch (error) {
    console.error('\n💥 TEST SUITE ERROR:', error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testInternalCall,
  testReturnURL,
  runAllTests
};