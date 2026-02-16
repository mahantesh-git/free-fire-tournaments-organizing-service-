import axios from 'axios';
import { getTenantSlug, getApiUrl } from '../utils/tenant';

const api = axios.create({
    baseURL: getApiUrl(),
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
api.interceptors.request.use(
    (config) => {
        const excludedRoutes = ['/api/organizers/register', '/api/organizers/login'];
        const isExcluded = excludedRoutes.some(route => config.url.includes(route));

        const tenantSlug = getTenantSlug();
        if (tenantSlug && !isExcluded) {
            config.headers['x-tenant-id'] = tenantSlug; // Pass subdomain as tenant ID
        }

        // Add Auth Token if available
        // Priority: Current context token
        const isModeratorPath = window.location.pathname.includes('/moderator/');
        const isOrganizerPath = window.location.pathname.includes('/organizer/');

        const orgToken = localStorage.getItem('org_token');
        const modToken = localStorage.getItem('mod_token');
        const legacyToken = localStorage.getItem('token');

        let activeToken = null;
        if (isModeratorPath) {
            activeToken = modToken;
        } else if (isOrganizerPath) {
            activeToken = orgToken;
        } else {
            // Generic fallback for shared routes (e.g., scoring)
            activeToken = legacyToken || orgToken || modToken;
        }

        const currentTenant = getTenantSlug();
        const storedTenant = localStorage.getItem('tenantSlug');

        // Only send token if it's for the CURRENT tenant
        // If we are on a different tenant, the token will cause a 403
        if (activeToken && currentTenant === storedTenant) {
            config.headers['Authorization'] = `Bearer ${activeToken}`;
        } else if (activeToken) {
            console.warn(`[API] Suppressing token: Current tenant (${currentTenant}) does not match stored token tenant (${storedTenant})`);
        }

        console.log('--- API REQUEST ---', {
            url: config.url,
            isOrg: isOrganizerPath,
            isMod: isModeratorPath,
            tenant: config.headers['x-tenant-id'],
            path: window.location.pathname
        });

        return config;
    },
    (error) => Promise.reject(error)
);

// Common Error Handler
export const handleAPIError = (error) => {
    if (error.response) {
        // Server responded with a status code outside 2xx
        return error.response.data.message || error.response.data.error || 'Server error occurred';
    } else if (error.request) {
        // Request made but no response
        return 'No response from server. Please check your internet connection.';
    } else {
        // Something else happened
        return error.message || 'An unexpected error occurred';
    }
};

export default api;
