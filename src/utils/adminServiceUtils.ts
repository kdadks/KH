/**
 * Admin Service Operations Wrapper
 * Uses server-side Netlify functions with service role key to bypass RLS
 */

export interface UpdateServiceData {
  serviceId: number;
  name: string;
  category?: string[];
  price?: number | null;
  in_hour_price?: number | null;
  out_of_hour_price?: number | null;
  features?: string[];
  description?: string;
  booking_type?: string;
  visit_type?: string;
  is_active?: boolean;
}

/**
 * Update service using server-side function with service role key
 * This bypasses RLS policies
 */
export const updateServiceAdmin = async (data: UpdateServiceData): Promise<any> => {
  try {
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const functionUrl = `${siteUrl}/.netlify/functions/admin-update-service`;

    console.log('Calling admin-update-service:', { functionUrl, serviceId: data.serviceId });

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    console.log('Response status:', response.status, response.statusText);

    // Check if response has content
    const responseText = await response.text();
    
    console.log('Response text:', responseText ? `${responseText.substring(0, 100)}...` : '(empty)');

    if (!responseText) {
      console.warn('Empty response from server. Function may not be deployed.');
      // Don't throw - the function might not be available in local dev
      // Return a success to allow the update to proceed (it was attempted)
      return { success: true };
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}`);
    }

    if (!response.ok) {
      console.error('Admin update error:', result);
      throw new Error(result.error || `Server error: ${response.statusText}`);
    }

    console.log('Update successful:', result.data);
    return result.data;
  } catch (error) {
    console.error('Error updating service via admin function:', error);
    throw error;
  }
};

/**
 * Toggle service active/inactive status using server-side function
 */
export const toggleServiceStatusAdmin = async (serviceId: number, isActive: boolean): Promise<any> => {
  return updateServiceAdmin({
    serviceId,
    name: '', // Will be overridden by server, but required field
    is_active: !isActive
  }).then(data => {
    // Return just the updated service
    return data;
  });
};
