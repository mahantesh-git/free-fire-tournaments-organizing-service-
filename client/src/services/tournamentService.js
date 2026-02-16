import api, { handleAPIError } from './api';
import { sanitizeObject } from '../security/inputSanitizer';

/**
 * Tournament Service - Handles scoreboard and game state (Unified with Kills)
 */

/**
 * Get all players
 */
// Get all players for a specific tournament
export const getPlayers = async (tournamentId, matchNumber = null) => {
    try {
        let query = tournamentId ? `tournamentId=${tournamentId}` : '';
        if (matchNumber) {
            query += (query ? '&' : '') + `matchNumber=${matchNumber}`;
        }
        const response = await api.get(`/api/kills/getPlayers${query ? '?' + query : ''}`);
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

/**
 * Get all squads
 */
// Get all squads for a specific tournament
export const getSquads = async (tournamentId, matchNumber = null) => {
    try {
        let query = tournamentId ? `tournamentId=${tournamentId}` : '';
        if (matchNumber) {
            query += (query ? '&' : '') + `matchNumber=${matchNumber}`;
        }
        const response = await api.get(`/api/kills/getSquads${query ? '?' + query : ''}`);
        return Array.isArray(response.data) ? response.data : (response.data.squads || []);
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

/**
 * Update squad player kills
 */
export const updateSquadPlayerKills = async (data) => {
    try {
        const sanitizedData = sanitizeObject(data);
        const response = await api.put('/api/kills/updateSquadPlayerKills', sanitizedData);
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

/**
 * Update individual player kills/data (Synced across models)
 */
export const updatePlayerKills = async (data) => {
    try {
        const sanitizedData = sanitizeObject(data);
        const response = await api.put('/api/kills/updateKillsSync', sanitizedData);
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

/**
 * Delete all players and squads
 */
export const deleteAllData = async () => {
    try {
        const response = await api.delete('/api/kills/deleteAll');
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

/**
 * Get game state
 */
export const getGameState = async () => {
    try {
        const response = await api.get('/api/gamestate');
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

/**
 * Save game state
 */
export const saveGameState = async (state) => {
    try {
        const sanitizedState = sanitizeObject(state);
        const response = await api.post('/api/gamestate', sanitizedState);
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

/**
 * Update Timer
 */
export const updateTimer = async (action, duration) => {
    try {
        const response = await api.put('/api/gamestate/timer', { action, duration });
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

/**
 * Get active squad matches
 */
export const getActiveMatches = async () => {
    try {
        const response = await api.get('/api/squadGame/activeMatches');
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

/**
 * Complete a squad match
 */
export const completeSquadMatch = async (gameStateId, placement) => {
    try {
        const response = await api.put(`/api/squadGame/completeMatch/${gameStateId}`, {
            squadPlacement: placement
        });
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

/**
 * End global game state
 */
export const endGlobalMatch = async () => {
    try {
        const response = await api.delete('/api/gamestate');
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};
