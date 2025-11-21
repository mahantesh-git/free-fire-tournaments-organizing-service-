import GameState from '../models/GameState.js';

// Get current game state
export const getGameState = async (req, res) => {
  try {
    const gameState = await GameState.findOne({ active: true });
    if (!gameState) {
      return res.status(404).json({ message: 'No active game' });
    }
    res.json(gameState);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create or update game state
export const saveGameState = async (req, res) => {
  try {
    // Delete any existing active game first
    if (req.body.active) {
      await GameState.deleteMany({ active: true });
    }
    
    const gameState = new GameState(req.body);
    await gameState.save();
    res.json(gameState);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update existing game state (for kill updates during game)
export const updateGameState = async (req, res) => {
  try {
    const gameState = await GameState.findOneAndUpdate(
      { active: true },
      { 
        ...req.body,
        lastUpdated: new Date()
      },
      { new: true }
    );
    
    if (!gameState) {
      return res.status(404).json({ message: 'No active game to update' });
    }
    
    res.json(gameState);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// End game
export const endGame = async (req, res) => {
  try {
    const result = await GameState.findOneAndDelete({ active: true });
    
    if (!result) {
      return res.status(404).json({ message: 'No active game to end' });
    }
    
    res.json({ message: 'Game ended successfully', gameState: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};