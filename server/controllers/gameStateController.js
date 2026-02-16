import { getTenantModel } from '../utils/tenantModel.js';
import gameStateSchema from '../models/tenant/GameState.js';

const getModels = (req) => ({
    GameState: getTenantModel(req.tenantConnection, 'GameState', gameStateSchema)
});

// Get current game state
export const getGameState = async (req, res) => {
    try {
        const { GameState } = getModels(req);
        let gameState = await GameState.findOne({ active: true });

        // If no active game state exists, return a default empty state
        if (!gameState) {
            return res.json({
                success: true,
                gameState: {
                    active: false,
                    selectedTopPlayers: [],
                    scoringConfig: null
                }
            });
        }

        res.json({ success: true, gameState });
    } catch (error) {
        console.error('Error fetching game state:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create or save game state
export const saveGameState = async (req, res) => {
    try {
        const { GameState } = getModels(req);
        const { scoringConfig, selectedTopPlayers } = req.body;

        // Check if there's already an active game state
        let gameState = await GameState.findOne({ active: true });

        if (gameState) {
            // Update existing
            gameState.scoringConfig = scoringConfig;
            gameState.selectedTopPlayers = selectedTopPlayers || [];
            await gameState.save();
        } else {
            // Create new
            gameState = new GameState({
                active: true,
                scoringConfig,
                selectedTopPlayers: selectedTopPlayers || []
            });
            await gameState.save();
        }

        // Emit sync event
        if (req.app.get('io')) {
            const tenantSlug = req.tenant?.slug;
            if (tenantSlug) {
                req.app.get('io').to(tenantSlug).emit('squadUpdate', { type: 'gameStateUpdated' });
            }
        }

        res.json({ success: true, gameState });
    } catch (error) {
        console.error('Error saving game state:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update game state
export const updateGameState = async (req, res) => {
    try {
        const { GameState } = getModels(req);
        const updates = req.body;

        const gameState = await GameState.findOneAndUpdate(
            { active: true },
            updates,
            { new: true }
        );

        if (!gameState) {
            return res.status(404).json({ error: 'No active game state found' });
        }

        // Emit sync event
        if (req.app.get('io')) {
            const tenantSlug = req.tenant?.slug;
            if (tenantSlug) {
                req.app.get('io').to(tenantSlug).emit('squadUpdate', { type: 'gameStateUpdated' });
            }
        }

        res.json({ success: true, gameState });
    } catch (error) {
        console.error('Error updating game state:', error);
        res.status(500).json({ error: error.message });
    }
};

// End game (mark as inactive)
export const endGame = async (req, res) => {
    try {
        const { GameState } = getModels(req);

        const gameState = await GameState.findOneAndUpdate(
            { active: true },
            { active: false },
            { new: true }
        );

        if (!gameState) {
            return res.status(404).json({ error: 'No active game state found' });
        }

        // Emit sync event
        if (req.app.get('io')) {
            const tenantSlug = req.tenant?.slug;
            if (tenantSlug) {
                req.app.get('io').to(tenantSlug).emit('squadUpdate', { type: 'gameStateUpdated', active: false });
            }
        }

        res.json({ success: true, message: 'Game ended successfully' });
    } catch (error) {
        console.error('Error ending game:', error);
        res.status(500).json({ error: error.message });
    }
};
// Update timer state
export const updateTimer = async (req, res) => {
    try {
        const { GameState } = getModels(req);
        const { action, duration } = req.body;

        let gameState = await GameState.findOne({ active: true });
        if (!gameState) {
            // Auto-create if not exists
            gameState = new GameState({ active: true, timer: {} });
        }

        const now = new Date();

        switch (action) {
            case 'set':
                gameState.timer.duration = duration || 300; // Default 5 mins
                gameState.timer.remaining = gameState.timer.duration;
                gameState.timer.status = 'IDLE';
                gameState.timer.endsAt = null;
                break;
            case 'start':
            case 'resume':
                if (gameState.timer.status !== 'RUNNING') {
                    const remaining = gameState.timer.status === 'PAUSED'
                        ? (gameState.timer.remaining || gameState.timer.duration)
                        : gameState.timer.duration;

                    gameState.timer.status = 'RUNNING';
                    gameState.timer.endsAt = new Date(now.getTime() + remaining * 1000);
                }
                break;
            case 'pause':
                if (gameState.timer.status === 'RUNNING') {
                    const remainingMillis = gameState.timer.endsAt ? gameState.timer.endsAt - now : 0;
                    gameState.timer.remaining = Math.max(0, Math.ceil(remainingMillis / 1000));
                    gameState.timer.status = 'PAUSED';
                    gameState.timer.endsAt = null;
                }
                break;
            case 'reset':
                gameState.timer.status = 'IDLE';
                gameState.timer.remaining = gameState.timer.duration;
                gameState.timer.endsAt = null;
                break;
        }

        await gameState.save();

        // Emit socket update
        if (req.app.get('io')) {
            const tenantSlug = req.tenant?.slug;
            if (tenantSlug) {
                req.app.get('io').to(tenantSlug).emit('timerUpdate', gameState.timer);
            }
        }

        res.json({ success: true, timer: gameState.timer });
    } catch (error) {
        console.error('Error updating timer:', error);
        res.status(500).json({ error: error.message });
    }
};
