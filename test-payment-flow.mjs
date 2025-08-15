// Quick test for payment request generation with correct Supabase client
import { fetchServicePricing, extractBaseServiceName, determineTimeSlotType } from './src/services/pricingService.js';

async function testPaymentRequestFlow() {
  console.log('🧪 Testing payment request flow with corrected Supabase client...\n');
  
  const testServiceName = "Ultimate Health - Out of Hour (€280)";
  console.log('Testing service:', testServiceName);
  
  // Test service name parsing
  const baseName = extractBaseServiceName(testServiceName);
  const timeSlotType = determineTimeSlotType(testServiceName);
  
  console.log('Parsed base name:', baseName);
  console.log('Time slot type:', timeSlotType);
  
  // Test database lookup
  try {
    console.log('\n🔍 Testing database lookup...');
    const servicePricing = await fetchServicePricing(baseName);
    console.log('Service pricing result:', servicePricing);
    
    if (servicePricing) {
      console.log('✅ Database lookup successful!');
      console.log('In hour price:', servicePricing.in_hour_price);
      console.log('Out of hour price:', servicePricing.out_of_hour_price);
    } else {
      console.log('❌ No service found in database for:', baseName);
    }
  } catch (error) {
    console.error('❌ Database lookup error:', error.message);
  }
}

testPaymentRequestFlow().catch(console.error);
