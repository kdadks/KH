// Email delivery test utility
// This function can be called to test different email scenarios

const testEmailDelivery = async () => {
  const testScenarios = [
    {
      name: "Customer to External Email",
      from: "info@khtherapy.ie",
      to: "amit.ranjan78@outlook.com", // Working scenario
      type: "booking_confirmation"
    },
    {
      name: "Admin Same-Domain",
      from: "info@khtherapy.ie", 
      to: "info@khtherapy.ie", // Problem scenario
      type: "admin_booking_confirmation"
    },
    {
      name: "Admin Alternative From",
      from: "noreply@khtherapy.ie",
      to: "info@khtherapy.ie", // Test scenario
      type: "admin_booking_confirmation"
    }
  ];

  console.log("🧪 Starting email delivery tests...");
  
  for (const scenario of testScenarios) {
    try {
      console.log(`\n📧 Testing: ${scenario.name}`);
      console.log(`   From: ${scenario.from}`);
      console.log(`   To: ${scenario.to}`);
      
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: scenario.type,
          to: scenario.to,
          customer_name: "Test Customer",
          service_name: "Test Service",
          appointment_date: "2025-08-17",
          appointment_time: "10:00:00",
          booking_reference: "TEST-001",
          is_admin_notification: scenario.type === 'admin_booking_confirmation'
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`   ✅ Success - MessageID: ${result.messageId}`);
      } else {
        console.log(`   ❌ Failed - Error: ${result.error}`);
      }
      
      // Wait 2 seconds between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log(`   💥 Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log("\n🏁 Email delivery tests completed");
  console.log("📋 Check your email inboxes and spam folders");
  console.log("📊 Review the results above to identify delivery patterns");
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testEmailDelivery = testEmailDelivery;
}

export default testEmailDelivery;
