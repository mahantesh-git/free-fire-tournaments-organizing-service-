import express from 'express';
import SquadGameState from '../models/SquadGameState.js';
import SquadLeaderboard from '../models/SquadLeaderboard.js';
import Squad from '../models/Squad.js';

const router = express.Router();

// ============================================
// SQUAD GAME STATE ROUTES
// ============================================

/**
 * POST /api/squadGame/startMatch
 * Start a new match for a squad
 */
router.post('/startMatch', async (req, res) => {
  try {
    const { squadId, matchNumber } = req.body;
    
    // Get squad details
    const squad = await Squad.findById(squadId);
    if (!squad) {
      return res.status(404).json({
        success: false,
        message: 'Squad not found'
      });
    }
    
    // Create game state
    const gameState = new SquadGameState({
      squadId: squad._id,
      squadName: squad.squadName,
      matchNumber: matchNumber || 1,
      players: squad.players.map(player => ({
        playerId: player.ffId,
        playerName: player.playerName,
        ffName: player.ffName,
        ffId: player.ffId,
        kills: 0,
        assists: 0,
        damage: 0,
        survived: false,
        revives: 0
      }))
    });
    
    await gameState.save();
    
    res.status(201).json({
      success: true,
      message: 'Match started successfully',
      gameState
    });
    
  } catch (error) {
    console.error('Error starting match:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting match',
      error: error.message
    });
  }
});


/**
 * PUT /api/squadGame/updateKills/:gameStateId
 * Update kills for a player in a match
 */
router.put('/updateKills/:gameStateId', async (req, res) => {
  try {
    const { gameStateId } = req.params;
    const { ffId, kills } = req.body;
    
    const gameState = await SquadGameState.findById(gameStateId);
    if (!gameState) {
      return res.status(404).json({
        success: false,
        message: 'Game state not found'
      });
    }
    
    if (!gameState.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Match is already completed'
      });
    }
    
    // Find and update player kills
    const player = gameState.players.find(p => p.ffId === ffId);
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found in this squad'
      });
    }
    
    player.kills = kills;
    gameState.calculateTotalKills();
    
    await gameState.save();
    
    res.json({
      success: true,
      message: 'Kills updated successfully',
      gameState
    });
    
  } catch (error) {
    console.error('Error updating kills:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating kills'
    });
  }
});


/**
 * PUT /api/squadGame/updatePlayerStats/:gameStateId
 * Update all stats for a player
 */
router.put('/updatePlayerStats/:gameStateId', async (req, res) => {
  try {
    const { gameStateId } = req.params;
    const { ffId, kills, assists, damage, survived, revives } = req.body;
    
    const gameState = await SquadGameState.findById(gameStateId);
    if (!gameState) {
      return res.status(404).json({
        success: false,
        message: 'Game state not found'
      });
    }
    
    if (!gameState.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Match is already completed'
      });
    }
    
    const player = gameState.players.find(p => p.ffId === ffId);
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found in this squad'
      });
    }
    
    // Update player stats
    if (kills !== undefined) player.kills = kills;
    if (assists !== undefined) player.assists = assists;
    if (damage !== undefined) player.damage = damage;
    if (survived !== undefined) player.survived = survived;
    if (revives !== undefined) player.revives = revives;
    
    gameState.calculateTotalKills();
    await gameState.save();
    
    res.json({
      success: true,
      message: 'Player stats updated successfully',
      gameState
    });
    
  } catch (error) {
    console.error('Error updating player stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating player stats'
    });
  }
});


/**
 * PUT /api/squadGame/completeMatch/:gameStateId
 * Complete a match and update leaderboard
 */
router.put('/completeMatch/:gameStateId', async (req, res) => {
  try {
    const { gameStateId } = req.params;
    const { squadPlacement } = req.body;
    
    const gameState = await SquadGameState.findById(gameStateId);
    if (!gameState) {
      return res.status(404).json({
        success: false,
        message: 'Game state not found'
      });
    }
    
    if (!gameState.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Match is already completed'
      });
    }
    
    // Set placement and complete match
    gameState.squadPlacement = squadPlacement;
    gameState.completeMatch();
    await gameState.save();
    
    // Update or create leaderboard entry
    let leaderboard = await SquadLeaderboard.findOne({ 
      squadId: gameState.squadId 
    });
    
    if (!leaderboard) {
      leaderboard = new SquadLeaderboard({
        squadId: gameState.squadId,
        squadName: gameState.squadName,
        playerStats: []
      });
    }
    
    leaderboard.updateFromMatch(gameState);
    await leaderboard.save();
    
    res.json({
      success: true,
      message: 'Match completed successfully',
      gameState,
      leaderboard
    });
    
  } catch (error) {
    console.error('Error completing match:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing match',
      error: error.message
    });
  }
});


/**
 * GET /api/squadGame/activeMatches
 * Get all active matches
 */
router.get('/activeMatches', async (req, res) => {
  try {
    const activeMatches = await SquadGameState.find({ isActive: true })
      .populate('squadId')
      .sort({ startTime: -1 });
    
    res.json({
      success: true,
      count: activeMatches.length,
      matches: activeMatches
    });
    
  } catch (error) {
    console.error('Error fetching active matches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active matches'
    });
  }
});


/**
 * GET /api/squadGame/matchHistory/:squadId
 * Get match history for a squad
 */
router.get('/matchHistory/:squadId', async (req, res) => {
  try {
    const { squadId } = req.params;
    
    const matches = await SquadGameState.find({ 
      squadId,
      isCompleted: true 
    }).sort({ endTime: -1 });
    
    res.json({
      success: true,
      count: matches.length,
      matches
    });
    
  } catch (error) {
    console.error('Error fetching match history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching match history'
    });
  }
});


/**
 * GET /api/squadGame/leaderboard
 * Get squad leaderboard (sorted by total points)
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await SquadLeaderboard.find()
      .sort({ totalPoints: -1 })
      .populate('squadId');
    
    res.json({
      success: true,
      count: leaderboard.length,
      leaderboard
    });
    
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leaderboard'
    });
  }
});


/**
 * GET /api/squadGame/squadStats/:squadId
 * Get detailed stats for a squad
 */
router.get('/squadStats/:squadId', async (req, res) => {
  try {
    const { squadId } = req.params;
    
    const leaderboard = await SquadLeaderboard.findOne({ squadId })
      .populate('squadId');
    
    if (!leaderboard) {
      return res.status(404).json({
        success: false,
        message: 'No stats found for this squad'
      });
    }
    
    res.json({
      success: true,
      stats: leaderboard
    });
    
  } catch (error) {
    console.error('Error fetching squad stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching squad stats'
    });
  }
});


/**
 * DELETE /api/squadGame/deleteMatch/:gameStateId
 * Delete a match (ADMIN only - optional)
 */
router.delete('/deleteMatch/:gameStateId', async (req, res) => {
  try {
    const gameState = await SquadGameState.findByIdAndDelete(req.params.gameStateId);
    
    if (!gameState) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Match deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting match'
    });
  }
});

export default router;