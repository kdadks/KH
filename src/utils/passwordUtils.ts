import bcrypt from 'bcryptjs';

/**
 * Salt rounds for bcrypt hashing
 * Higher values are more secure but slower
 * 12 is a good balance between security and performance
 */
const SALT_ROUNDS = 12;

/**
 * Hash a plain text password
 * @param plainPassword - The plain text password to hash
 * @returns Promise<string> - The hashed password
 */
export const hashPassword = async (plainPassword: string): Promise<string> => {
  try {
    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Verify a plain text password against a hashed password
 * @param plainPassword - The plain text password to verify
 * @param hashedPassword - The hashed password to compare against
 * @returns Promise<boolean> - True if the password matches, false otherwise
 */
export const verifyPassword = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
  try {
    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    return isValid;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

/**
 * Check if a password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
 * @param password - The password to check
 * @returns boolean - True if the password appears to be hashed
 */
export const isPasswordHashed = (password: string): boolean => {
  // Bcrypt hashes follow the pattern: $2a$10$... or $2b$10$... or $2y$10$...
  const bcryptPattern = /^\$2[aby]\$\d{2}\$.{53}$/;
  return bcryptPattern.test(password);
};

/**
 * Generate a secure random password
 * @param length - The length of the password (default: 12)
 * @returns string - A randomly generated password
 */
export const generateRandomPassword = (length: number = 12): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};
