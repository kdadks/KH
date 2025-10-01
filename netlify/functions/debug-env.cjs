/**
 * Debug webhook to check environment variables
 */

exports.handler = async (event, context) => {
  console.log('🔍 Debug webhook called - checking environment variables');
  
  // Get all environment variables that might be relevant
  const envVars = {
    // Netlify context
    CONTEXT: process.env.CONTEXT,
    URL: process.env.URL,
    DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
    BRANCH: process.env.BRANCH,
    HEAD: process.env.HEAD,
    
    // Supabase variables we're looking for
    SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY?.length + ')' : 'NOT SET',
    
    // Check for any SUPABASE variables
    allSupabaseVars: Object.keys(process.env).filter(key => key.includes('SUPABASE')),
    
    // Check for VITE variables (shouldn't be available in functions but let's check)
    allViteVars: Object.keys(process.env).filter(key => key.includes('VITE')),
    
    // Total env vars count
    totalEnvVars: Object.keys(process.env).length
  };
  
  console.log('Environment variables check:', envVars);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Environment variables debug info',
      method: event.httpMethod,
      timestamp: new Date().toISOString(),
      environment: envVars
    })
  };
};