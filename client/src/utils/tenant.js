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
    if (hostname.includes('localhost') || hostname === '127.0.0.1') {
        const parts = hostname.split('.');
        if (parts.length > 1 && parts[0] !== 'localhost') {
            return parts[0];
        }
    } else {
        const parts = hostname.split('.');
        const isPlatformDomain = hostname.endsWith('.onrender.com') ||
                                 hostname.endsWith('.railway.app') ||
                                 hostname.endsWith('.up.railway.app') ||
                                 hostname.endsWith('.ngrok-free.dev') ||
                                 hostname.endsWith('.ngrok-free.app') ||
                                 hostname.endsWith('.vercel.app') ||
                                 hostname.endsWith('.netlify.app');

        if (isPlatformDomain) {
            // Platform hosts have base domains like myapp.onrender.com (3 parts)
            // A tenant subdomain would be tenant.myapp.onrender.com (4 parts)
            const minParts = (hostname.endsWith('.up.railway.app') || hostname.endsWith('.ngrok-free.dev') || hostname.endsWith('.ngrok-free.app')) ? 4 : 3;
            if (parts.length > minParts) {
                return parts[0];
            }
        } else if (parts.length > 2) {
            // Custom domain: tenant.myesports.com
            if (parts[0] !== 'www') {
                return parts[0];
            }
        }
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
    // Determine API URL based on environment (supports VITE_API_URL and VITE_API_BASE_URL)
    let rawUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';
    rawUrl = rawUrl.trim().replace(/\/$/, '');
    if (rawUrl.endsWith('/api')) {
        rawUrl = rawUrl.slice(0, -4);
    }
    return rawUrl;
};
