/**
 * Extracts the tenant slug from the current window location.
 * Assumes format: tenant-slug.domain.com
 * If localhost, returns null or a default for testing.
 */
export const getTenantSlug = () => {
    const hostname = window.location.hostname;

    // 1. Priority: URL Query Parameter (Dynamic Overrides)
    const params = new URLSearchParams(window.location.search);
    const querySlug = params.get('tenant');
    if (querySlug) return querySlug;

    // 2. Subdomain check (Production/Dev Subdomains)
    if (hostname.includes('localhost')) {
        const parts = hostname.split('.');
        if (parts.length > 1 && parts[0] !== 'localhost') {
            return parts[0];
        }
    }

    // Production: tenant.myesports.com
    const parts = hostname.split('.');
    if (parts.length > 2) {
        return parts[0];
    }

    // Fallback: Check LocalStorage (For Localhost/Dev or if subdomain is missing but user is logged in)
    const storedSlug = localStorage.getItem('tenantSlug');
    if (storedSlug) return storedSlug;

    return null; // Main domain
};

/**
 * Get the base API URL dynamically.
 * If we are on a tenant subdomain, we might want to hit the main api or tenant specific?
 * Our backend handles tenant resolution via subdomain, so we can just hit the relative /api 
 * if we are serving from the same domain/port.
 * But we are strictly separating headers for explicit control.
 */
export const getApiUrl = () => {
    // Determine API URL based on environment
    return import.meta.env.VITE_API_URL || 'http://localhost:9000';
};
