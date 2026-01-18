/**
 * Rate limiting for login attempts to prevent brute force attacks
 */

interface LoginAttempt {
  email: string;
  timestamp: number;
  failed: boolean;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Time window in milliseconds
  lockoutMs: number; // Lockout duration after max attempts
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,        // Max 5 attempts
  windowMs: 15 * 60 * 1000, // In 15 minutes
  lockoutMs: 30 * 60 * 1000  // Locked out for 30 minutes
};

// Store attempts in memory (in production, use Redis)
const loginAttempts = new Map<string, LoginAttempt[]>();
const lockoutExpiry = new Map<string, number>();

/**
 * Check if email is currently rate limited
 */
export const isRateLimited = (email: string): { limited: boolean; retryAfterSeconds: number } => {
  const normalizedEmail = email.toLowerCase();
  
  // Check if email is locked out
  const lockoutTime = lockoutExpiry.get(normalizedEmail);
  if (lockoutTime && lockoutTime > Date.now()) {
    const retryAfterSeconds = Math.ceil((lockoutTime - Date.now()) / 1000);
    return { limited: true, retryAfterSeconds };
  }
  
  // Clean up expired lockout
  if (lockoutTime) {
    lockoutExpiry.delete(normalizedEmail);
  }
  
  // Check failed attempts in current window
  const attempts = loginAttempts.get(normalizedEmail) || [];
  const now = Date.now();
  const recentAttempts = attempts.filter(
    attempt => attempt.failed && (now - attempt.timestamp) < DEFAULT_CONFIG.windowMs
  );
  
  const failedCount = recentAttempts.length;
  if (failedCount >= DEFAULT_CONFIG.maxAttempts) {
    // Initiate lockout
    lockoutExpiry.set(normalizedEmail, now + DEFAULT_CONFIG.lockoutMs);
    return { 
      limited: true, 
      retryAfterSeconds: Math.ceil(DEFAULT_CONFIG.lockoutMs / 1000) 
    };
  }
  
  return { limited: false, retryAfterSeconds: 0 };
};

/**
 * Record a login attempt
 */
export const recordLoginAttempt = (email: string, success: boolean): void => {
  const normalizedEmail = email.toLowerCase();
  
  const attempts = loginAttempts.get(normalizedEmail) || [];
  const now = Date.now();
  
  // Remove old attempts outside the window
  const recentAttempts = attempts.filter(
    attempt => (now - attempt.timestamp) < DEFAULT_CONFIG.windowMs
  );
  
  // Add new attempt
  recentAttempts.push({
    email: normalizedEmail,
    timestamp: now,
    failed: !success
  });
  
  loginAttempts.set(normalizedEmail, recentAttempts);
  
  // If successful, clear attempts for this email
  if (success) {
    loginAttempts.delete(normalizedEmail);
    lockoutExpiry.delete(normalizedEmail);
  }
};

/**
 * Get remaining attempts before lockout
 */
export const getRemainingAttempts = (email: string): number => {
  const normalizedEmail = email.toLowerCase();
  
  const attempts = loginAttempts.get(normalizedEmail) || [];
  const now = Date.now();
  const recentFailedAttempts = attempts.filter(
    attempt => attempt.failed && (now - attempt.timestamp) < DEFAULT_CONFIG.windowMs
  ).length;
  
  return Math.max(0, DEFAULT_CONFIG.maxAttempts - recentFailedAttempts);
};

/**
 * Reset attempts for a specific email (call after successful password reset)
 */
export const resetLoginAttempts = (email: string): void => {
  const normalizedEmail = email.toLowerCase();
  loginAttempts.delete(normalizedEmail);
  lockoutExpiry.delete(normalizedEmail);
};

/**
 * Clear all rate limit data (for testing or system reset)
 */
export const clearAllRateLimits = (): void => {
  loginAttempts.clear();
  lockoutExpiry.clear();
};
