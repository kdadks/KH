/**
 * CSRF Protection Utility
 * Provides client-side token generation and management
 * Complements server-side validation in Netlify Functions
 */

const CSRF_TOKEN_KEY = 'x-csrf-token';
const CSRF_TOKEN_STORAGE_KEY = 'csrf_token';

/**
 * Generate a new CSRF token (client-side)
 * Tokens are stored in sessionStorage and sent with state-changing requests
 */
export const generateCSRFToken = (): string => {
  // Use a combination of random values to create a unique token
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const token = `${timestamp}.${random}`;
  
  // Store in sessionStorage (cleared on browser close)
  sessionStorage.setItem(CSRF_TOKEN_STORAGE_KEY, token);
  
  return token;
};

/**
 * Get the current CSRF token, generating one if needed
 */
export const getCSRFToken = (): string => {
  let token = sessionStorage.getItem(CSRF_TOKEN_STORAGE_KEY);
  
  if (!token) {
    token = generateCSRFToken();
  }
  
  return token;
};

/**
 * Add CSRF token to fetch request headers
 * Use this wrapper for all state-changing API calls
 */
export const fetchWithCSRF = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getCSRFToken();
  
  const headers = {
    ...options.headers,
    [CSRF_TOKEN_KEY]: token,
    'Content-Type': 'application/json',
  };
  
  return fetch(url, {
    ...options,
    headers,
  });
};

/**
 * Clear CSRF token (on logout or sensitive operations)
 */
export const clearCSRFToken = (): void => {
  sessionStorage.removeItem(CSRF_TOKEN_STORAGE_KEY);
};

/**
 * Validate CSRF token format (client-side check)
 * This is a basic check; server-side validation is the authoritative check
 */
export const isValidCSRFTokenFormat = (token: string): boolean => {
  // Token format: timestamp.randomString
  const parts = token.split('.');
  return parts.length === 2 && !isNaN(Number(parts[0])) && parts[1].length > 0;
};
