/**
 * Simple debug webhook function for testing
 */

exports.handler = async (event, context) => {
  console.log('Debug webhook called:', {
    method: event.httpMethod,
    body: event.body,
    headers: event.headers
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Debug webhook working',
      method: event.httpMethod,
      timestamp: new Date().toISOString(),
      bodyReceived: !!event.body,
      bodyLength: event.body ? event.body.length : 0,
      body: event.body
    })
  };
};