import { supabase } from '../supabaseClient';

export interface ServicePricing {
  id: number;
  name: string;
  category: string;
  in_hour_price: string;
  out_of_hour_price: string;
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
export async function fetchServicePricing(serviceName: string): Promise<ServicePricing | null> {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, category, in_hour_price, out_of_hour_price, features, description, is_active')
      .eq('name', serviceName)
      .eq('is_active', true)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

    if (error) {
      console.error('Error fetching service pricing:', error.message);
      return null;
    }

    if (!data) {
      console.warn(`Service pricing not found for: ${serviceName}`);
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
  const priceString = timeSlotType === 'in_hour' 
    ? servicePricing.in_hour_price 
    : servicePricing.out_of_hour_price;
    
  return extractNumericPrice(priceString);
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
  let serviceName = serviceNameWithDetails;
  
  // Remove price in parentheses (e.g., "(€90)" or "(€25 / class)")
  serviceName = serviceName.replace(/\s*\([^)]*\)\s*$/, '');
  
  // Remove " - In Hour" or " - Out of Hour" suffixes
  serviceName = serviceName.replace(/\s*-\s*(In|Out of)\s+Hour\s*$/i, '');
  
  return serviceName.trim();
}
