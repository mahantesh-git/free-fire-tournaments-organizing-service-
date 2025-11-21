import express from 'express';
import Kills from '../models/Kills.js';
import Squad from '../models/Squad.js'

const router = express.Router();

// Register a new player
router.post('/playerRegister', async (req, res) => {
    try {
        const { playerName, ffName, ffId } = req.body;
        if (!playerName || !ffName || !ffId) {
            return res.status(400).json({ message: 'Missing player data' });
        }

        const player = new Kills({ playerName, ffName, ffId });
        await player.save();
        res.status(201).json({ message: 'Player registered successfully', player });
    } catch (err) {
        //console.log(err)
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get all players
router.get('/getPlayers', async (req, res) => {
    try {
        const players = await Kills.find();
        res.json(players);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.put('/updateSquadPlayerKills', async (req, res) => {
  try {
    const { squadId, ffId, map1, map2, map3 } = req.body;
    
    const squad = await Squad.findById(squadId);
    if (!squad) {
      return res.status(404).json({ 
        success: false, 
        message: 'Squad not found' 
      });
    }
    
    // Find the player in the squad
    const playerIndex = squad.players.findIndex(p => p.ffId === ffId);
    if (playerIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Player not found in squad' 
      });
    }
    
    // Update player kills
    squad.players[playerIndex].map1 = map1;
    squad.players[playerIndex].map2 = map2;
    squad.players[playerIndex].map3 = map3;
    squad.players[playerIndex].total = map1 + map2 + map3;
    
    await squad.save();
    
    res.json({ 
      success: true, 
      message: 'Squad player kills updated successfully',
      squad 
    });
  } catch (error) {
    console.error('Error updating squad player kills:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating squad player kills',
      error: error.message 
    });
  }
});

// Update kills
router.put('/:id', async (req, res) => {
    try {
        const { map1, map2, map3 } = req.body;
        const total = (map1 || 0) + (map2 || 0) + (map3 || 0);

        const player = await Kills.findByIdAndUpdate(
            req.params.id,
            { map1, map2, map3, total },
            { new: true }
        );

        if (!player) return res.status(404).json({ message: 'Player not found' });

        res.json({ message: 'Player updated', player });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Delete player
router.delete('/deleteAll', async (req, res) => {
    try {
        await Kills.deleteMany({});
        res.json({ message: 'All players deleted successfully' });
        console.log('deleted allplayers');
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const player = await Kills.findByIdAndDelete(req.params.id);
        if (!player) return res.status(404).json({ message: 'Player not found' });
        res.json({ message: 'Player deleted' });
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.post('/squadRegister', async (req, res) => {
  try {
    const { squadName, players } = req.body;
    
    // Validation
    if (!squadName || !squadName.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Squad name is required' 
      });
    }
    
    if (!players || players.length !== 4) {
      return res.status(400).json({ 
        success: false, 
        message: 'Squad must have exactly 4 players' 
      });
    }
    
    // Validate each player
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (!player.playerName || !player.ffName || !player.ffId) {
        return res.status(400).json({ 
          success: false, 
          message: `Player ${i + 1} is missing required fields` 
        });
      }
    }
    
    // Check for duplicate squad names (optional)
    const existingSquad = await Squad.findOne({ squadName });
    if (existingSquad) {
      return res.status(400).json({ 
        success: false, 
        message: 'Squad name already exists' 
      });
    }
    
    // Create squad
    const squad = new Squad({
      squadName: squadName.trim(),
      players: players.map(p => ({
        playerName: p.playerName.trim(),
        ffName: p.ffName.trim(),
        ffId: p.ffId.trim()
      }))
    });
    
    await squad.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Squad registered successfully',
      squad 
    });
    
  } catch (error) {
    console.error('Squad registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during squad registration' 
    });
  }
});

router.get('/getSquads', async (req, res) => {
  try {
    const squads = await Squad.find().sort({ registeredAt: -1 });
    res.status(200).json(squads);
  } catch (error) {
    console.error('Error fetching squads:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching squads' 
    });
  }
});

// Add to your kills routes
// Update squad player kills

// Delete squad (if not already present)
router.delete('/deleteSquad/:squadId', async (req, res) => {
  try {
    const squad = await Squad.findByIdAndDelete(req.params.squadId);
    
    if (!squad) {
      return res.status(404).json({
        success: false,
        message: 'Squad not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Squad deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting squad:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting squad',
      error: error.message
    });
  }
});

export default router;
