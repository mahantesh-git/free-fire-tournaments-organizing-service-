/**
 * Get a model associated with the current tenant connection.
 * Mongoose automatically caches models on connections, so we can define them repeatedly.
 * However, we must ensure we pass the schema every time if it's not cached.
 * 
 * @param {import('mongoose').Connection} connection - Tenant connection
 * @param {string} modelName - Name of the model (e.g., 'Player')
 * @param {import('mongoose').Schema} schema - The schema for the model
 * @returns {import('mongoose').Model}
 */
export const getTenantModel = (connection, modelName, schema) => {
    if (!connection) {
        throw new Error('Tenant connection is missing');
    }

    // Check if model is already registered on this specific connection
    if (connection.models[modelName]) {
        return connection.models[modelName];
    }

    // Otherwise, register it
    return connection.model(modelName, schema);
};
