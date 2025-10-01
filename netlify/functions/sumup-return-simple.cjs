/**
 * Simplified SumUp Return Handler for testing
 */

exports.handler = async (event, context) => {
  console.log('🔥 Simple sumup-return called:', event.httpMethod);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Simple sumup-return working',
      method: event.httpMethod,
      timestamp: new Date().toISOString(),
      test: true
    })
  };
};