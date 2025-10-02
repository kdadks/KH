/**
 * Alternative log viewing method - Direct function call to capture logs
 * This bypasses Netlify dashboard and CLI issues
 */

const testSumUpFunction = async () => {
  console.log('🔍 Testing SumUp Function Directly');
  console.log('=====================================\n');
  
  const baseUrl = 'https://uat--khtherapy.netlify.app/.netlify/functions/sumup-return';
  
  try {
    // Test 1: Check if function is accessible
    console.log('1. 🎯 Testing function accessibility...');
    
    const healthCheck = await fetch(baseUrl, {
      method: 'GET'
    });
    
    const healthText = await healthCheck.text();
    console.log('   Status:', healthCheck.status);
    console.log('   Response:', healthText.substring(0, 200));
    
    if (healthCheck.status === 200) {
      console.log('   ✅ Function is accessible\n');
    } else {
      console.log('   ❌ Function accessibility issue\n');
    }
    
    // Test 2: Simulate SumUp return URL call
    console.log('2. 🔄 Simulating SumUp return URL...');
    
    const returnParams = new URLSearchParams({
      checkout_id: 'test-checkout-123',
      transaction_id: 'test-txn-456', 
      status: 'COMPLETED',
      amount: '50.00',
      currency: 'EUR',
      checkout_reference: 'test-ref-789',
      timestamp: new Date().toISOString()
    });
    
    const returnUrl = `${baseUrl}?${returnParams.toString()}`;
    console.log('   Calling:', returnUrl);
    
    const returnResponse = await fetch(returnUrl, {
      method: 'GET',
      redirect: 'manual' // Don't follow redirects
    });
    
    console.log('   Status:', returnResponse.status);
    console.log('   Headers:', Object.fromEntries(returnResponse.headers.entries()));
    
    if (returnResponse.status === 302) {
      console.log('   ✅ Return URL processed (redirected)\n');
    } else {
      const returnText = await returnResponse.text();
      console.log('   Response:', returnText);
    }
    
    // Test 3: Simulate webhook call
    console.log('3. 📡 Simulating SumUp webhook...');
    
    const webhookPayload = {
      id: "test_event_direct_" + Date.now(),
      event_type: "checkout.status.updated",
      payload: {
        checkout_id: "test-checkout-123",
        reference: "test-ref-789",
        status: "paid"
      },
      timestamp: new Date().toISOString()
    };
    
    const webhookResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-webhook': 'true' // Enable test mode
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const webhookText = await webhookResponse.text();
    console.log('   Status:', webhookResponse.status);
    console.log('   Response:', webhookText);
    
    if (webhookResponse.status === 200) {
      console.log('   ✅ Webhook processed successfully\n');
    } else {
      console.log('   ❌ Webhook processing issue\n');
    }
    
    console.log('💡 TROUBLESHOOTING TIPS:');
    console.log('- If tests fail, check Netlify deployment status');
    console.log('- Look for error messages in the responses above');
    console.log('- The function logs are captured in Netlify even if you can\'t access dashboard');
    console.log('- Try accessing Netlify dashboard via different browser or incognito mode');
    console.log('\n🔗 Alternative log access:');
    console.log('- Direct function URL:', baseUrl);
    console.log('- Try Netlify app: https://app.netlify.com/teams/[your-team]/sites');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔧 POSSIBLE FIXES:');
    console.log('- Check internet connection');
    console.log('- Verify UAT deployment is live');
    console.log('- Try again in a few minutes');
  }
};

// Instructions
console.log('🚀 SumUp Function Direct Tester');
console.log('===============================');
console.log('This will test your SumUp function directly and show you what\'s happening.');
console.log('Run this instead of trying to access Netlify dashboard.\n');

// Run the test
testSumUpFunction();