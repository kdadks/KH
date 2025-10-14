exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { checkout_id } = JSON.parse(event.body);

    if (!checkout_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'checkout_id is required' })
      };
    }

    // Check with SumUp API
    const response = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkout_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SUMUP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('SumUp API error:', response.status, await response.text());
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Failed to check payment status' })
      };
    }

    const checkoutData = await response.json();
    
    // Return the checkout status
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: checkoutData.status,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        transaction_id: checkoutData.transaction_id,
        date: checkoutData.date
      })
    };

  } catch (error) {
    console.error('Error checking payment status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};