/**
 * Quick test for debug viewer after Supabase fix
 */

const testDebugViewer = async () => {
  console.log('🧪 Testing Debug Viewer After Supabase Fix');
  console.log('='.repeat(50));

  try {
    const response = await fetch('https://uat--khtherapy.netlify.app/.netlify/functions/debug-viewer?json=1&limit=5');
    
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.status === 200) {
      const result = await response.json();
      console.log('✅ Debug viewer is working!');
      console.log('Summary:', result.summary);
      console.log(`Debug logs: ${result.debugLogs?.length || 0}`);
      console.log(`Recent payments: ${result.recentPayments?.length || 0}`);
      console.log(`Payment requests: ${result.recentPaymentRequests?.length || 0}`);
    } else {
      const errorText = await response.text();
      console.log('❌ Debug viewer error:');
      console.log(errorText);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testDebugViewer();