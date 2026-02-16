import api, { handleAPIError } from './api';
import { sanitizeInput, validatePlayerName, validateFFID } from '../security/inputSanitizer';
import Toast from '../components/common/Toast';

/**
 * Player Service - Handles all player-related API calls (Unified with Kills)
 */

// Get all players
// Get all players for a specific tournament
export const getPlayers = async (tournamentId) => {
    try {
        const query = tournamentId ? `?tournamentId=${tournamentId}` : '';
        const response = await api.get(`/api/kills/getPlayers${query}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching players:', error);
        throw new Error('Failed to load players');
    }
};

// Add a new player
export const addPlayer = async (playerData) => {
    try {
        // Validate and sanitize
        const sanitizedData = {
            playerName: sanitizeInput(playerData.playerName),
            ffName: sanitizeInput(playerData.ffName),
            ffId: sanitizeInput(playerData.ffId),
            tournamentId: playerData.tournamentId, // Include Tournament ID
        };

        if (!validatePlayerName(sanitizedData.playerName)) {
            throw new Error('Invalid username (2-30 chars, alphanumeric)');
        }

        if (!validateFFID(sanitizedData.ffId)) {
            throw new Error('Invalid Free Fire ID (8-12 digits)');
        }

        const response = await api.post('/api/kills/playerRegister', sanitizedData);
        Toast.success('Player registered successfully!');
        return response.data;
    } catch (error) {
        console.error('Error registering player:', error);
        const message = handleAPIError(error);
        Toast.error(message);
        throw error;
    }
};

// Update player data
export const updatePlayer = async (id, playerData) => {
    try {
        const sanitizedData = {
            playerName: sanitizeInput(playerData.playerName),
            ffName: sanitizeInput(playerData.ffName),
            ffId: sanitizeInput(playerData.ffId),
        };

        const response = await api.put(`/api/kills/${id}`, sanitizedData);
        Toast.success('Player updated successfully!');
        return response.data;
    } catch (error) {
        const message = handleAPIError(error);
        Toast.error(message);
        throw error;
    }
};

// Delete player
export const deletePlayer = async (id) => {
    try {
        const response = await api.delete(`/api/kills/${id}`);
        Toast.success('Player deleted successfully!');
        return response.data;
    } catch (error) {
        const message = handleAPIError(error);
        Toast.error(message);
        throw error;
    }
};

// Import players from excel
export const importPlayersFromExcel = async (file, tournamentId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (tournamentId) {
        formData.append('tournamentId', tournamentId);
    }

    try {
        const response = await api.post('/api/kills/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        Toast.success(`Successfully imported ${response.data.count || 0} players!`);
        return response.data;
    } catch (error) {
        const message = handleAPIError(error);
        Toast.error(message);
        throw error;
    }
};

// Export players to Excel
export const exportPlayersToExcel = async (tournamentId) => {
    try {
        const query = tournamentId ? `?tournamentId=${tournamentId}` : '';
        const response = await api.get(`/api/kills/export${query}`, {
            responseType: 'blob'
        });

        // Create blob link to download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'players_export.xlsx');

        // Append to html link element page
        document.body.appendChild(link);

        // Start download
        link.click();

        // Clean up and remove the link
        link.parentNode.removeChild(link);
        Toast.success('Export downloaded successfully!');
    } catch (error) {
        console.error('Export failed:', error);
        Toast.error('Failed to export data');
    }
};

export default {
    getPlayers,
    addPlayer,
    updatePlayer,
    deletePlayer,
    importPlayersFromExcel,
    exportPlayersToExcel,
};
