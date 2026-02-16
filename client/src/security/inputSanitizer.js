import DOMPurify from 'dompurify';

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

/**
 * Sanitize HTML content (allows safe HTML tags)
 * @param {string} html - HTML content
 * @returns {string} - Sanitized HTML
 */
export const sanitizeHTML = (html) => {
    if (typeof html !== 'string') return html;
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
};

/**
 * Validate player name
 * @param {string} name - Player name
 * @returns {boolean} - Is valid
 */
export const validatePlayerName = (name) => {
    if (!name || typeof name !== 'string') return false;
    // Allow alphanumeric, spaces, and common special characters
    const regex = /^[a-zA-Z0-9\s._-]{2,30}$/;
    return regex.test(name);
};

/**
 * Validate Free Fire ID
 * @param {string} ffId - Free Fire ID
 * @returns {boolean} - Is valid
 */
export const validateFFID = (ffId) => {
    if (!ffId) return false;
    const id = String(ffId);
    // FF IDs are typically 8-12 digit numbers
    const regex = /^\d{8,12}$/;
    return regex.test(id);
};

/**
 * Validate squad name
 * @param {string} name - Squad name
 * @returns {boolean} - Is valid
 */
export const validateSquadName = (name) => {
    if (!name || typeof name !== 'string') return false;
    // Allow alphanumeric, spaces, and common special characters
    const regex = /^[a-zA-Z0-9\s._-]{2,50}$/;
    return regex.test(name);
};

/**
 * Validate kill count
 * @param {number} kills - Kill count
 * @returns {boolean} - Is valid
 */
export const validateKills = (kills) => {
    const num = Number(kills);
    return !isNaN(num) && num >= 0 && num <= 99 && Number.isInteger(num);
};

/**
 * Validate points
 * @param {number} points - Points value
 * @returns {boolean} - Is valid
 */
export const validatePoints = (points) => {
    const num = Number(points);
    return !isNaN(num) && num >= 0 && num <= 1000;
};

/**
 * Sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
export const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    const sanitized = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (typeof value === 'string') {
                sanitized[key] = sanitizeInput(value);
            } else if (typeof value === 'object') {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
    }
    return sanitized;
};

/**
 * Escape HTML entities
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
export const escapeHTML = (text) => {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

/**
 * Debounce function to prevent rapid API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait = 300) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};
