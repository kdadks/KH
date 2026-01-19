/**
 * Server-side CSRF Token Validation
 * Use in Netlify Functions to validate incoming CSRF tokens
 * 
 * This complements client-side token generation to prevent CSRF attacks
 */

// In-memory token store with expiration
// In production, use Redis or database for distributed deployments
const tokenStore = new Map<string, number>();

// Token expiration time (1 hour)
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Validate CSRF token from request headers
 * Returns true if token is valid, false otherwise
 */
export const validateCSRFToken = (
  token: string | string[] | undefined
): boolean => {
  // Token should be a string from headers
  if (!token || Array.isArray(token)) {
    console.warn('CSRF: Token missing or invalid format');
    return false;
  }

  // Validate token format
  const parts = token.split('.');
  if (parts.length !== 2 || isNaN(Number(parts[0]))) {
    console.warn('CSRF: Token format invalid');
    return false;
  }

  const timestamp = Number(parts[0]);
  const now = Date.now();

  // Check token expiration
  if (now - timestamp > TOKEN_EXPIRY_MS) {
    console.warn('CSRF: Token expired');
    return false;
  }

  // Check if token exists in store (for replay attack prevention)
  // Note: This is a simple check. For distributed systems, use database
  if (tokenStore.has(token)) {
    console.warn('CSRF: Token replay detected');
    return false;
  }

  // Mark token as used
  tokenStore.set(token, now);

  // Cleanup old tokens periodically (every 100 tokens)
  if (tokenStore.size % 100 === 0) {
    cleanupExpiredTokens();
  }

  return true;
};

/**
 * Remove expired tokens from store
 */
const cleanupExpiredTokens = (): void => {
  const now = Date.now();
  let cleaned = 0;

  for (const [token, timestamp] of tokenStore.entries()) {
    if (now - timestamp > TOKEN_EXPIRY_MS) {
      tokenStore.delete(token);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`CSRF: Cleaned up ${cleaned} expired tokens`);
  }
};

/**
 * Extract CSRF token from request headers
 */
export const extractCSRFToken = (
  headers: Record<string, string | string[] | undefined>
): string | undefined => {
  // Check for x-csrf-token header
  return headers['x-csrf-token'] as string | undefined;
};

/**
 * Create CORS headers with SameSite cookie policy
 * Use in Netlify Function responses
 */
export const createSecureHeaders = (origin?: string) => {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-csrf-token',
    'Access-Control-Allow-Credentials': 'true',
    'Set-Cookie': 'SameSite=Strict; Secure; HttpOnly',
  };
};

/**
 * Log CSRF validation failures for security monitoring
 */
export const logCSRFFailure = (
  reason: string,
  event: any,
  additionalInfo?: Record<string, any>
): void => {
  const failureLog = {
    timestamp: new Date().toISOString(),
    reason,
    method: event.httpMethod,
    path: event.path,
    sourceIP: event.headers['x-forwarded-for'] || event.headers['client-ip'],
    userAgent: event.headers['user-agent'],
    ...additionalInfo,
  };

  console.error('CSRF VALIDATION FAILURE:', JSON.stringify(failureLog, null, 2));
};
