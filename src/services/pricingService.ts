import { supabase } from '../supabaseClient';

export interface ServicePricing {
  id: number;
  name: string;
  category: string;
  price?: string; // For flat pricing (e.g., "€90", "Contact for Quote")
  in_hour_price?: string; // For time-based pricing
  out_of_hour_price?: string; // For time-based pricing
  features?: string[];
  description?: string;
  is_active: boolean;
}

/**
 * Extracts numeric price from price string (e.g., "€250" -> 250)
 */
export function extractNumericPrice(priceString: string): number {
  if (!priceString) return 0;
  
  // Remove currency symbols and extract numbers
  const numericMatch = priceString.match(/\d+/);
  return numericMatch ? parseInt(numericMatch[0], 10) : 0;
}

/**
 * Fetches service pricing information from the database
 */
export async function fetchServicePricing(serviceName: string, retryCount = 0): Promise<ServicePricing | null> {
  const maxRetries = 3;
  const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s

  try {
    // First try exact match - use limit(1) instead of maybeSingle() to handle duplicates
    const { data: exactMatchData, error } = await supabase
      .from('services')
      .select('id, name, category, price, in_hour_price, out_of_hour_price, features, description, is_active')
      .eq('name', serviceName)
      .eq('is_active', true)
      .limit(1);

    let data = exactMatchData?.[0] || null;

    if (error) {
      console.error('Error fetching service pricing (exact match):', error.message);

      // Check if this is a network/QUIC error that we should retry
      if ((error.message?.includes('Failed to fetch') || error.message?.includes('QUIC') || error.message?.includes('network')) && retryCount < maxRetries) {
        console.log(`🔄 Retrying service pricing fetch (attempt ${retryCount + 1}/${maxRetries}) in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchServicePricing(serviceName, retryCount + 1);
      }

      // Try case-insensitive search if exact match fails
      console.log('🔄 Trying case-insensitive search...');
      const searchResult = await supabase
        .from('services')
        .select('id, name, category, price, in_hour_price, out_of_hour_price, features, description, is_active')
        .ilike('name', serviceName)
        .eq('is_active', true)
        .limit(1);

      if (searchResult.error) {
        console.error('Error in case-insensitive search:', searchResult.error.message);
        return null;
      }

      data = searchResult.data?.[0] || null;
    }

    if (!data) {
      console.warn(`Service pricing not found for: ${serviceName}`);

      // Try case-insensitive search if exact match returned no results
      console.log('🔄 Trying case-insensitive search...');
      const caseInsensitiveResult = await supabase
        .from('services')
        .select('id, name, category, price, in_hour_price, out_of_hour_price, features, description, is_active')
        .ilike('name', serviceName)
        .eq('is_active', true)
        .limit(1);

      if (!caseInsensitiveResult.error && caseInsensitiveResult.data?.[0]) {
        data = caseInsensitiveResult.data[0];
        console.log('✅ Found case-insensitive match:', data.name);
      } else {
        // Try partial match as last resort
        console.log('🔄 Trying partial match search...');
        const partialResult = await supabase
          .from('services')
          .select('id, name, category, price, in_hour_price, out_of_hour_price, features, description, is_active')
          .ilike('name', `%${serviceName}%`)
          .eq('is_active', true)
          .limit(1);

        if (partialResult.error) {
          console.error('Error in partial match search:', partialResult.error.message);
          return null;
        }

        data = partialResult.data?.[0] || null;

        if (data) {
          console.log('✅ Found partial match:', data.name);
        }
      }
    }

    if (!data) {
      console.warn(`No service pricing found for: ${serviceName}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in fetchServicePricing:', error);
    return null;
  }
}

/**
 * Gets the appropriate price for a service based on time slot type
 */
export function getServicePrice(servicePricing: ServicePricing, timeSlotType: 'in_hour' | 'out_of_hour'): number {
  // First check if the service has a flat price (like "€90" for Pre & Post Surgery Rehab)
  if (servicePricing.price && servicePricing.price.trim() !== '') {
    return extractNumericPrice(servicePricing.price);
  }
  
  // Otherwise, use time-based pricing
  const priceString = timeSlotType === 'in_hour' 
    ? servicePricing.in_hour_price 
    : servicePricing.out_of_hour_price;
    
  return extractNumericPrice(priceString || '');
}

/**
 * Determines if a service name indicates in-hour or out-of-hour pricing
 * Based on the naming convention used in the booking system
 */
export function determineTimeSlotType(serviceNameWithDetails: string): 'in_hour' | 'out_of_hour' {
  // Check if the service name contains "In Hour" or "Out of Hour"
  if (serviceNameWithDetails.toLowerCase().includes('in hour')) {
    return 'in_hour';
  } else if (serviceNameWithDetails.toLowerCase().includes('out of hour')) {
    return 'out_of_hour';
  }
  
  // Default to in_hour if not specified
  return 'in_hour';
}

/**
 * Extracts the base service name from a full service string
 * e.g., "Ultimate Health - Out of Hour (€280)" -> "Ultimate Health"
 * e.g., "Pre & Post Surgery Rehab (€90)" -> "Pre & Post Surgery Rehab"
 */
export function extractBaseServiceName(serviceNameWithDetails: string): string {
  if (!serviceNameWithDetails) {
    console.warn('Empty service name provided to extractBaseServiceName');
    return '';
  }

  let serviceName = serviceNameWithDetails.trim();

  // Remove price in parentheses (e.g., "(€90)" or "(€25 / class)")
  serviceName = serviceName.replace(/\s*\([^)]*\)\s*$/, '');

  // Remove " - In Hour" or " - Out of Hour" suffixes
  serviceName = serviceName.replace(/\s*-\s*(In|Out of)\s+Hour\s*$/i, '');

  const finalName = serviceName.trim();

  return finalName;
}
