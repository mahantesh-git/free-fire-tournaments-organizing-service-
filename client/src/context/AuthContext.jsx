import { createContext, useState, useContext, useEffect } from 'react';
import { initCSRFProtection, removeCSRFToken } from '../security/csrfProtection';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initialize CSRF protection
        initCSRFProtection();

        // Check if user is authenticated
        const token = localStorage.getItem('auth_token');
        if (token) {
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);

    const login = (token, userData) => {
        localStorage.setItem('auth_token', token);
        setIsAuthenticated(true);
        setUser(userData);
        initCSRFProtection();
    };

    const logout = async () => {
        const orgToken = localStorage.getItem('org_token');
        if (orgToken) {
            try {
                const api = (await import('../services/api')).default;
                await api.post('/api/organizers/logout');
            } catch (e) {
                console.error('Logout error:', e);
            }
        }
        // Clear ALL auth tokens for both organizer and moderator
        localStorage.removeItem('auth_token');
        localStorage.removeItem('org_token');
        localStorage.removeItem('mod_token');
        localStorage.removeItem('token');
        localStorage.removeItem('tenantSlug');
        localStorage.removeItem('moderator');
        removeCSRFToken();
        setIsAuthenticated(false);
        setUser(null);
    };

    const value = {
        isAuthenticated,
        user,
        loading,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
