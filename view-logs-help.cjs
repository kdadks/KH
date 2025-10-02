/**
 * View SumUp processing logs from the database
 * Run this after completing a payment to see what happened
 */

// Simple log viewer that works with Supabase
console.log('🔍 SumUp Processing Log Viewer');
console.log('=====================================');
console.log('');
console.log('To view logs after completing a payment:');
console.log('');
console.log('1. 📱 BROWSER METHOD (Easiest):');
console.log('   - Open browser console on any page of your site');
console.log('   - Run: viewSumUpLogs()');
console.log('');
console.log('2. 🌐 NETLIFY DASHBOARD METHOD:');
console.log('   - Go to https://app.netlify.com');
console.log('   - Select your KH project');
console.log('   - Go to "Functions" tab');
console.log('   - Click "sumup-return" function');
console.log('   - View "Function log" tab');
console.log('');
console.log('3. 💻 NETLIFY CLI METHOD (Real-time):');
console.log('   - Install: npm install -g netlify-cli');
console.log('   - Login: netlify login');
console.log('   - Link: netlify link (select your project)');
console.log('   - Watch: netlify functions:logs --live');
console.log('');
console.log('4. 🎯 DIRECT FUNCTION URL TEST:');
console.log('   - Visit: https://uat--khtherapy.netlify.app/.netlify/functions/sumup-return');
console.log('   - This will show you if the function is working');
console.log('');
console.log('💡 TIP: The best logs are in the Netlify dashboard under Functions > sumup-return > Function log');
console.log('    These show exactly what happens when SumUp calls your webhook or return URL.');
console.log('');