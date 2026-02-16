import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let connectionCache = {};

/**
 * Global connection for Tenant Metadata (free_fire_global)
 */
export const connectGlobalDB = async () => {
    try {
        if (mongoose.connection.readyState === 1) return;

        await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'esports_platform_global' // Explicitly set global DB name
        });
        console.log('✅ Global Database Connected');
    } catch (error) {
        console.error('❌ Global Database Connection Error:', error);
        process.exit(1);
    }
};

/**
 * Get or create a connection for a specific tenant
 * @param {string} tenantId - The tenant's unique identifier (subdomain/slug) or DB name
 * @param {string} dbName - The specific database name for this tenant
 * @returns {Promise<mongoose.Connection>}
 */
export const getTenantConnection = async (tenantId, dbName) => {
    if (connectionCache[tenantId]) {
        return connectionCache[tenantId];
    }

    try {
        // Construct URI. Assuming same cluster, just different DB.
        // If URI has database name in it, we need to replace/ensure it points to the correct one.
        // Safest approach with Atlas: use the base URI and options.
        const baseUri = process.env.MONGO_URI;

        // Ensure URI doesn't have a DB name hardcoded that conflicts, or use connection options
        const conn = mongoose.createConnection(baseUri, {
            dbName: dbName // Switch to tenant DB
        });

        // Handle connection events
        conn.on('connected', () => console.log(`🔌 Tenant DB Connected: ${dbName}`));
        conn.on('error', (err) => console.error(`❌ Tenant DB Error (${dbName}):`, err));

        // Cache the connection
        connectionCache[tenantId] = conn;

        return conn;
    } catch (error) {
        console.error(`❌ Failed to connect to tenant DB: ${dbName}`, error);
        throw error;
    }
};

/**
 * Clear all connections (useful for testing/shutdown)
 */
export const clearConnections = async () => {
    await Promise.all(Object.values(connectionCache).map(conn => conn.close()));
    connectionCache = {};
};
