#!/usr/bin/env node

/**
 * Google Places API Setup Helper
 * This script helps you configure the Google Places API for KH Therapy
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function setupGooglePlacesAPI() {
  console.log('\n🔧 KH Therapy - Google Places API Setup\n');
  console.log('This script will help you configure the Google Places API for your testimonials page.\n');

  try {
    // Check if .env exists
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      console.log('✅ Found existing .env file\n');
    } else if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, 'utf8');
      console.log('📋 Creating .env from .env.example\n');
    } else {
      console.log('⚠️  No .env or .env.example found. Creating new .env file.\n');
    }

    // Get API key
    console.log('📍 Step 1: Google Places API Key');
    console.log('Get your API key from: https://console.cloud.google.com/');
    console.log('Make sure you have enabled the Places API.\n');
    
    const apiKey = await question('Enter your Google Places API Key: ');
    
    if (!apiKey.trim()) {
      console.log('❌ API Key is required. Exiting.');
      rl.close();
      return;
    }

    // Get Place ID
    console.log('\n📍 Step 2: Google Place ID');
    console.log('Find your Place ID at: https://developers.google.com/maps/documentation/places/web-service/place-id');
    console.log('Search for "KH Therapy" or your business address.\n');
    
    const placeId = await question('Enter your Google Place ID: ');
    
    if (!placeId.trim()) {
      console.log('❌ Place ID is required. Exiting.');
      rl.close();
      return;
    }

    // Update environment file
    const googleConfig = `
# Google Places API Configuration
GOOGLE_PLACES_API_KEY=${apiKey.trim()}
GOOGLE_PLACE_ID=${placeId.trim()}
VITE_SITE_URL=https://khtherapy.netlify.app
`;

    // Update or create .env file
    if (envContent.includes('GOOGLE_PLACES_API_KEY')) {
      // Update existing Google config
      envContent = envContent.replace(
        /GOOGLE_PLACES_API_KEY=.*/g, 
        `GOOGLE_PLACES_API_KEY=${apiKey.trim()}`
      );
      envContent = envContent.replace(
        /GOOGLE_PLACE_ID=.*/g, 
        `GOOGLE_PLACE_ID=${placeId.trim()}`
      );
    } else {
      // Add Google config
      envContent += googleConfig;
    }

    // Write .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Configuration saved to .env file');
    
    // Security recommendations
    console.log('\n🔒 Security Recommendations:');
    console.log('1. Restrict your API key in Google Cloud Console:');
    console.log('   - Set HTTP referrer restrictions to your domain');
    console.log('   - Limit API access to Places API only');
    console.log('2. Set up billing alerts to monitor usage');
    console.log('3. Add your production domain to API key restrictions\n');

    // Netlify environment variables
    console.log('🚀 Netlify Deployment:');
    console.log('Add these environment variables in Netlify:');
    console.log(`   GOOGLE_PLACES_API_KEY = ${apiKey.trim()}`);
    console.log(`   GOOGLE_PLACE_ID = ${placeId.trim()}`);
    console.log('   VITE_SITE_URL = https://khtherapy.netlify.app\n');

    // Test the configuration
    const testNow = await question('Test the configuration now? (y/n): ');
    
    if (testNow.toLowerCase() === 'y' || testNow.toLowerCase() === 'yes') {
      console.log('\n🧪 Testing Google Places API...');
      await testGooglePlacesAPI(apiKey.trim(), placeId.trim());
    }

    console.log('\n🎉 Setup complete! Your Google Reviews should now work on the testimonials page.');
    console.log('Visit: http://localhost:5173/testimonials to test locally\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

async function testGooglePlacesAPI(apiKey, placeId) {
  try {
    const fields = 'name,rating,user_ratings_total,reviews';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log('✅ API Test Successful!');
      console.log(`   Business: ${data.result.name}`);
      console.log(`   Rating: ${data.result.rating}/5`);
      console.log(`   Total Reviews: ${data.result.user_ratings_total}`);
      console.log(`   Available Reviews: ${data.result.reviews?.length || 0}`);
    } else {
      console.log('❌ API Test Failed:');
      console.log(`   Status: ${data.status}`);
      console.log(`   Error: ${data.error_message || 'Unknown error'}`);
    }
  } catch (error) {
    console.log('❌ API Test Failed:', error.message);
  }
}

// Run the setup
setupGooglePlacesAPI();