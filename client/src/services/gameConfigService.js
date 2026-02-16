import api from './api';
import Toast from '../components/common/Toast';

/**
 * Game Configuration Service
 */

// Start a new match with configuration
export const startMatch = async (config) => {
    try {
        const response = await api.post('/gamestate', config);
        Toast.success('Match started successfully!');
        return response.data;
    } catch (error) {
        console.error('Error starting match:', error);
        Toast.error(error.response?.data?.message || 'Failed to start match');
        throw error;
    }
};

// Get current game configuration/state
export const getGameConfig = async () => {
    try {
        const response = await api.get('/gamestate');
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return null; // No active game
        }
        console.error('Error fetching configuration:', error);
        return null;
    }
};

// Reset match (end game)
export const resetMatch = async () => {
    try {
        await api.delete('/gamestate');
        Toast.success('Match reset successfully!');
    } catch (error) {
        console.error('Error resetting match:', error);
        Toast.error('Failed to reset match');
        throw error;
    }
};

export default {
    startMatch,
    getGameConfig,
    resetMatch
};
