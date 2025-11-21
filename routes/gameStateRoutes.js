import express from 'express';
import * as gameStateController from '../controllers/gameStateController.js';

const router = express.Router();

// Get current game state
router.get('/', gameStateController.getGameState);

// Create or save game state
router.post('/', gameStateController.saveGameState);

// Update game state
router.put('/', gameStateController.updateGameState);

// End game (delete game state)
router.delete('/', gameStateController.endGame);

export default router;