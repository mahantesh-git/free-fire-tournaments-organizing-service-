import api from './api';

/**
 * History Service - Frontend API client for history and audit data
 */

// Match History
export const getTournamentMatches = async (tournamentId, options = {}) => {
    const { limit = 50, skip = 0 } = options;
    const response = await api.get(`/api/history/tournament/${tournamentId}/matches`, {
        params: { limit, skip }
    });
    return response.data;
};

export const getRoomMatches = async (roomId) => {
    const response = await api.get(`/api/history/room/${roomId}/matches`);
    return response.data;
};

export const getPlayerMatches = async (playerId, options = {}) => {
    const { limit = 20, skip = 0 } = options;
    const response = await api.get(`/api/history/player/${playerId}/matches`, {
        params: { limit, skip }
    });
    return response.data;
};

// Tournament Timeline
export const getTournamentTimeline = async (tournamentId) => {
    const response = await api.get(`/api/history/tournament/${tournamentId}/timeline`);
    return response.data;
};

export const getTournamentStats = async (tournamentId) => {
    const response = await api.get(`/api/history/tournament/${tournamentId}/stats`);
    return response.data;
};

// Audit Logs
export const getTournamentAuditLogs = async (tournamentId, options = {}) => {
    const { limit = 100, skip = 0 } = options;
    const response = await api.get(`/api/audit/tournament/${tournamentId}`, {
        params: { limit, skip }
    });
    return response.data;
};

export const searchAuditLogs = async (filters = {}, options = {}) => {
    const { limit = 100, skip = 0 } = options;
    const response = await api.get('/api/audit/search', {
        params: { ...filters, limit, skip }
    });
    return response.data;
};
