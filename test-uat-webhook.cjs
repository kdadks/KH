/**
 * Simple webhook test for UAT/Staging environments
 * Works without requiring production webhook secrets
 */

const testUATWebhook = async () => {
  const webhookUrl = 'https://uat--khtherapy.netlify.app/.netlify/functions/sumup-return';
  
  // Test webhook payload for UAT (no signature required)
  // NOTE: This will find the most recent SumUp payment to update in test mode
  const testPayload = {
    id: "test_event_uat_" + Date.now(),
    event_type: "checkout.status.updated", 
    payload: {
      checkout_id: "test-checkout-uat-" + Date.now(),
      reference: "test-checkout-ref-uat-" + Date.now(),
      status: "paid"
    },
    timestamp: new Date().toISOString(),
    test_webhook_payload: true // Indicates this is a test - will find recent payment
  };

  console.log('🧪 Testing UAT webhook (no signature verification)');
  console.log('📡 Webhook URL:', webhookUrl);
  console.log('📦 Test payload:', JSON.stringify(testPayload, null, 2));
  console.log('\n🔍 Webhook will try to:');
  console.log('1. Find existing payment by checkout_reference');
  console.log('2. Find existing payment by checkout_id');
  console.log('3. Find recent SumUp payment (test mode)');
  console.log('4. Find payment_request and create payment record');
  console.log('5. Update all webhook columns with proper data');
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-webhook': 'true', // Enables test mode
        'User-Agent': 'UAT-Webhook-Test/1.0'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }
    
    console.log('\n📊 UAT WEBHOOK TEST RESULTS:');
    console.log('Status:', response.status);
    console.log('Test Mode:', responseData.testMode);
    console.log('Environment:', responseData.environment);
    console.log('Response:', responseData);
    
    if (response.status === 200) {
      console.log('\n✅ UAT Webhook test PASSED');
      if (responseData.testMode) {
        console.log('🧪 Confirmed running in test mode (no signature verification)');
      }
      
      console.log('\n📊 WEBHOOK RESULT:');
      console.log('Action:', responseData.result?.action);
      console.log('Payment ID:', responseData.result?.paymentId);
      console.log('Status:', responseData.result?.status);
      
      if (responseData.result?.webhook_data) {
        console.log('\n✅ WEBHOOK COLUMNS POPULATED:');
        console.log('- webhook_processed_at:', responseData.result.webhook_data.webhook_processed_at);
        console.log('- sumup_event_type:', responseData.result.webhook_data.sumup_event_type);
        console.log('- sumup_event_id:', responseData.result.webhook_data.sumup_event_id);
        console.log('- sumup_checkout_reference:', responseData.result.webhook_data.sumup_checkout_reference);
        console.log('- payment_request_id:', responseData.result.webhook_data.payment_request_id);
      }
      
      if (responseData.result?.searchAttempts) {
        console.log('\n🔍 SEARCH ATTEMPTS:');
        responseData.result.searchAttempts.forEach((attempt, index) => {
          console.log(`${index + 1}. ${attempt.method}: Found ${attempt.found} records`);
        });
      }
      
    } else {
      console.log('\n❌ UAT Webhook test FAILED');
    }
    
  } catch (error) {
    console.error('\n❌ UAT Webhook test error:', error.message);
  }
};

// Instructions for production
const showProductionInstructions = () => {
  console.log('\n📋 PRODUCTION WEBHOOK SETUP:');
  console.log('1. Set SUMUP_WEBHOOK_SECRET_PROD in Netlify production environment');
  console.log('2. Configure SumUp webhook endpoint to point to production URL');  
  console.log('3. Production will require proper signature verification');
  console.log('4. Use SUMUP_WEBHOOK_SECRET_UAT for staging environment testing');
  console.log('\n🔧 Environment Variables Needed:');
  console.log('- Production: SUMUP_WEBHOOK_SECRET_PROD');
  console.log('- UAT/Staging: SUMUP_WEBHOOK_SECRET_UAT (optional for testing)');
};

// Run test
console.log('🚀 Starting UAT webhook test...\n');
testUATWebhook()
  .then(() => {
    showProductionInstructions();
  })
  .catch(console.error);