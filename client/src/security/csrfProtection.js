/**
 * Generate a random CSRF token
 * @returns {string} - CSRF token
 */
export const generateCSRFToken = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Store CSRF token in sessionStorage
 * @param {string} token - CSRF token
 */
export const storeCSRFToken = (token) => {
    sessionStorage.setItem('csrf_token', token);
};

/**
 * Get CSRF token from sessionStorage
 * @returns {string|null} - CSRF token or null
 */
export const getCSRFToken = () => {
    return sessionStorage.getItem('csrf_token');
};

/**
 * Remove CSRF token from sessionStorage
 */
export const removeCSRFToken = () => {
    sessionStorage.removeItem('csrf_token');
};

/**
 * Initialize CSRF protection
 * @returns {string} - Generated CSRF token
 */
export const initCSRFProtection = () => {
    let token = getCSRFToken();
    if (!token) {
        token = generateCSRFToken();
        storeCSRFToken(token);
    }
    return token;
};

/**
 * Validate CSRF token
 * @param {string} token - Token to validate
 * @returns {boolean} - Is valid
 */
export const validateCSRFToken = (token) => {
    const storedToken = getCSRFToken();
    return storedToken && token === storedToken;
};
