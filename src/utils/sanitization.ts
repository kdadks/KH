import DOMPurify from 'dompurify';

/**
 * Sanitization utility to prevent XSS attacks
 * Uses DOMPurify to clean user-generated content
 */

/**
 * Sanitize HTML content for safe display
 * @param dirty - Raw HTML string that may contain malicious content
 * @returns Sanitized HTML string safe for display
 */
export const sanitizeHtml = (dirty: string): string => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
};

/**
 * Sanitize plain text input (strip all HTML tags)
 * @param input - Raw user input that should be plain text
 * @returns Sanitized plain text
 */
export const sanitizeText = (input: string): string => {
  if (!input) return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

/**
 * Sanitize email addresses
 * @param email - Email address to sanitize
 * @returns Sanitized email or empty string if invalid format
 */
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  const sanitized = sanitizeText(email).trim().toLowerCase();
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  return emailRegex.test(sanitized) ? sanitized : '';
};

/**
 * Sanitize phone numbers (allow digits, spaces, hyphens, parentheses, plus)
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/[^0-9\s\-()+]/g, '').trim();
};

/**
 * Sanitize names (allow letters, spaces, hyphens, apostrophes)
 * @param name - Name to sanitize
 * @returns Sanitized name
 */
export const sanitizeName = (name: string): string => {
  if (!name) return '';
  return sanitizeText(name).replace(/[^a-zA-Z\s\-']/g, '').trim();
};

/**
 * Sanitize URLs
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  const sanitized = sanitizeText(url).trim();
  try {
    const urlObj = new URL(sanitized);
    // Only allow http and https protocols
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return urlObj.toString();
    }
  } catch {
    return '';
  }
  return '';
};

/**
 * Sanitize user-generated content for display with basic HTML formatting
 * Useful for notes, comments, descriptions, etc.
 * @param content - User-generated content
 * @returns Sanitized content safe for dangerouslySetInnerHTML
 */
export const sanitizeUserContent = (content: string): string => {
  if (!content) return '';
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ADD_ATTR: ['target'], // Allow target for links
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
};

/**
 * React component helper: Safely render HTML content
 * @param htmlContent - HTML string to render
 * @returns Object for dangerouslySetInnerHTML prop
 */
export const createSafeMarkup = (htmlContent: string) => {
  return {
    __html: sanitizeHtml(htmlContent),
  };
};
