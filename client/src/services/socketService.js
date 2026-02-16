import { io } from 'socket.io-client';
import { getTenantSlug } from '../utils/tenant';

// Use environment variable or default to backend port 9000
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    connect() {
        const currentTenantId = getTenantSlug() || '';

        // If socket exists, check if tenantId matches
        if (this.socket) {
            const previousTenantId = this.socket.auth?.tenantId || '';
            if (previousTenantId === currentTenantId) {
                return this.socket;
            }
            console.log(`🔌 Tenant mismatch (Old: ${previousTenantId}, New: ${currentTenantId}). Reconnecting...`);
            this.socket.disconnect();
            this.socket = null;
        }

        console.log(`🔌 Attempting socket connection for tenant: ${currentTenantId || 'GLOBAL'}`);

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'],
            path: '/socket.io/',
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            auth: {
                tenantId: currentTenantId
            }
        });

        this.socket.on('connect', () => {
            console.log('🔌 Socket connected successfully. ID:', this.socket.id, 'Tenant:', currentTenantId);
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
