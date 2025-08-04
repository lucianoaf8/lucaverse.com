// CSRF Protection Utilities
// Implements double-submit cookie pattern for CSRF protection

/**
 * Generate a cryptographically secure CSRF token
 * @returns {string} CSRF token
 */
export const generateCSRFToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Store CSRF token in cookie and sessionStorage
 * @param {string} token - CSRF token to store
 */
export const storeCSRFToken = (token) => {
  // Store in sessionStorage for form submission
  sessionStorage.setItem('csrf_token', token);
  
  // Also set as cookie for double-submit verification
  const domain = window.location.hostname;
  const secure = window.location.protocol === 'https:';
  
  document.cookie = `csrf_token=${token}; path=/; domain=${domain}; SameSite=Strict${secure ? '; Secure' : ''}`;
};

/**
 * Get CSRF token from storage
 * @returns {string|null} CSRF token or null if not found
 */
export const getCSRFToken = () => {
  return sessionStorage.getItem('csrf_token');
};

/**
 * Get CSRF token from cookie
 * @returns {string|null} CSRF token from cookie
 */
export const getCSRFTokenFromCookie = () => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token') {
      return value;
    }
  }
  return null;
};

/**
 * Initialize CSRF protection for the application
 * Generates and stores a new token if one doesn't exist
 */
export const initializeCSRFProtection = () => {
  const existingToken = getCSRFToken();
  const cookieToken = getCSRFTokenFromCookie();
  
  // Verify tokens match (double-submit cookie pattern)
  if (existingToken && cookieToken && existingToken === cookieToken) {
    return existingToken;
  }
  
  // Generate new token if missing or mismatched
  const newToken = generateCSRFToken();
  storeCSRFToken(newToken);
  return newToken;
};

/**
 * Add CSRF token to form data
 * @param {FormData} formData - Form data to append token to
 * @returns {FormData} Form data with CSRF token
 */
export const addCSRFTokenToFormData = (formData) => {
  const token = getCSRFToken();
  if (!token) {
    throw new Error('CSRF token not found. Please refresh the page.');
  }
  
  formData.append('csrf_token', token);
  return formData;
};

/**
 * Verify CSRF token on server side (for reference)
 * This function shows the server-side validation logic
 * @param {string} formToken - Token from form submission
 * @param {string} cookieToken - Token from cookie header
 * @returns {boolean} Whether tokens are valid and match
 */
export const serverSideCSRFValidation = (formToken, cookieToken) => {
  // Both tokens must be present
  if (!formToken || !cookieToken) {
    return false;
  }
  
  // Tokens must match (double-submit cookie pattern)
  if (formToken !== cookieToken) {
    return false;
  }
  
  // Token must have valid format (64 hex characters)
  const tokenRegex = /^[a-f0-9]{64}$/;
  if (!tokenRegex.test(formToken)) {
    return false;
  }
  
  return true;
};

// Auto-initialize CSRF protection when module loads
if (typeof window !== 'undefined') {
  initializeCSRFProtection();
}