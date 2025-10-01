/**
 * Simple test endpoint to verify SumUp return handler is working
 */

exports.handler = async (event, context) => {
  console.log('🧪 Test endpoint called with method:', event.httpMethod);
  console.log('🧪 Headers:', JSON.stringify(event.headers, null, 2));
  console.log('🧪 Body:', event.body);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Test endpoint working',
      method: event.httpMethod,
      timestamp: new Date().toISOString(),
      bodyReceived: !!event.body,
      bodyLength: event.body?.length || 0
    })
  };
};