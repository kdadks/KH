/**
 * Breach detection using Have I Been Pwned API
 * Checks if email or password has been compromised in known data breaches
 */

interface BreachCheckResult {
  isCompromised: boolean;
  breachCount: number;
  hashedEmailBreaches: boolean;
  passwordBreaches: number;
}

/**
 * SHA1 hash for browser (using SubtleCrypto API)
 * Used for k-anonymous password breach checking
 */
const sha1Hash = async (str: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
};

/**
 * Check if email has been in a known data breach
 * Uses HaveIBeenPwned API
 */
export const checkEmailBreach = async (email: string): Promise<{ compromised: boolean; breachCount: number }> => {
  try {
    const response = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`, {
      headers: {
        'User-Agent': 'KH-Therapy-App'
      }
    });

    if (response.status === 404) {
      // Email not found in any breach
      return { compromised: false, breachCount: 0 };
    }

    if (response.status === 200) {
      const breaches = await response.json();
      return { compromised: true, breachCount: breaches.length };
    }

    // If rate limited or error, don't fail the login but log warning
    if (response.status === 429) {
      console.warn('HaveIBeenPwned API rate limited');
      return { compromised: false, breachCount: 0 };
    }

    throw new Error(`Unexpected status: ${response.status}`);
  } catch (error) {
    // Don't fail login if breach check fails
    console.warn('Breach check failed:', error);
    return { compromised: false, breachCount: 0 };
  }
};

/**
 * Check if password has been in a known data breach
 * Uses k-anonymity to avoid sending full password hash
 * https://haveibeenpwned.com/API/v3#PwnedPasswords
 */
export const checkPasswordBreach = async (password: string): Promise<{ breached: boolean; count: number }> => {
  try {
    // Hash password with SHA-1
    const sha1Digest = await sha1Hash(password);

    // Take first 5 characters and rest for k-anonymity
    const prefix = sha1Digest.substring(0, 5);
    const suffix = sha1Digest.substring(5);

    // Query API with prefix only (k-anonymity)
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'KH-Therapy-App'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const text = await response.text();
    const hashes = text.split('\r\n');

    // Check if our suffix appears in the response
    for (const line of hashes) {
      const [hash, count] = line.split(':');
      if (hash === suffix) {
        // Password found in breaches
        return { breached: true, count: parseInt(count) };
      }
    }

    // Password not found in any breach
    return { breached: false, count: 0 };
  } catch (error) {
    // Don't fail login if breach check fails
    console.warn('Password breach check failed:', error);
    return { breached: false, count: 0 };
  }
};

/**
 * Full breach check for login (email + password)
 */
export const performBreachCheck = async (email: string, password: string): Promise<BreachCheckResult> => {
  try {
    const [emailResult, passwordResult] = await Promise.all([
      checkEmailBreach(email),
      checkPasswordBreach(password)
    ]);

    return {
      isCompromised: emailResult.compromised || passwordResult.breached,
      breachCount: emailResult.breachCount,
      hashedEmailBreaches: emailResult.compromised,
      passwordBreaches: passwordResult.count
    };
  } catch (error) {
    console.error('Breach check error:', error);
    return {
      isCompromised: false,
      breachCount: 0,
      hashedEmailBreaches: false,
      passwordBreaches: 0
    };
  }
};

/**
 * Get breach warning message for display to user
 */
export const getBreachWarning = (result: BreachCheckResult): string | null => {
  if (result.hashedEmailBreaches && result.passwordBreaches > 0) {
    return `⚠️ WARNING: Your email AND password have been found in ${result.breachCount + result.passwordBreaches} data breaches. We recommend changing your password immediately.`;
  }

  if (result.hashedEmailBreaches) {
    return `⚠️ Your email has been found in ${result.breachCount} data breach(es). Consider changing your password for this account.`;
  }

  if (result.passwordBreaches > 0) {
    return `⚠️ This password has been found in ${result.passwordBreaches} data breach(es). We recommend using a unique password for this account.`;
  }

  return null;
};
