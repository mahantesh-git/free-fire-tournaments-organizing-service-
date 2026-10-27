import { io } from 'socket.io-client';
import { getTenantSlug } from '../utils/tenant';

let rawSocketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || '';
rawSocketUrl = (rawSocketUrl || '').trim().replace(/\/$/, '');
if (rawSocketUrl.endsWith('/api')) {
    rawSocketUrl = rawSocketUrl.slice(0, -4);
}
let SOCKET_URL = rawSocketUrl;
if (!SOCKET_URL) {
    if (typeof window !== 'undefined') {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            SOCKET_URL = 'http://localhost:9000';
        } else {
            SOCKET_URL = window.location.origin;
        }
    } else {
        SOCKET_URL = 'http://localhost:9000';
    }
}

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    connect() {
        const currentTenantId = getTenantSlug() || localStorage.getItem('tenantSlug') || '';

        // If socket exists, check if tenantId matches
        if (this.socket) {
            const previousTenantId = this.socket.auth?.tenantId || '';
            if (previousTenantId === currentTenantId && this.socket.connected) {
                return this.socket;
            }
            if (previousTenantId !== currentTenantId) {
                console.log(`🔌 Tenant mismatch (Old: ${previousTenantId}, New: ${currentTenantId}). Reconnecting...`);
                this.socket.disconnect();
                this.socket = null;
            } else {
                return this.socket;
            }
        }

        console.log(`🔌 Attempting socket connection for tenant: ${currentTenantId || 'GLOBAL'} at ${SOCKET_URL}`);

        this.socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            path: '/socket.io/',
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
            auth: {
                tenantId: currentTenantId
            }
        });

        this.socket.on('connect', () => {
            console.log('🔌 Socket connected successfully. ID:', this.socket.id, 'Tenant:', currentTenantId);
            if (currentTenantId) {
                this.socket.emit('join_tenant', currentTenantId);
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('🔌 Socket connection error:', error);
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.listeners.clear();
        }
    }

    on(event, callback) {
        if (!this.socket) {
            this.connect();
        }

        this.socket.on(event, callback);

        // Store listener for cleanup
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.socket) {
            this.socket.off(event, callback);
        }

        // Remove from stored listeners
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    removeAllListeners(event) {
        if (this.socket) {
            this.socket.removeAllListeners(event);
        }
        this.listeners.delete(event);
    }
}

const socketService = new SocketService();
export default socketService;
