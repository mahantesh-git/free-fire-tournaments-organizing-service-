import mongoose from 'mongoose';

const squadGameStateSchema = new mongoose.Schema({
  squadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Squad',
    required: true
  },
  squadName: {
    type: String,
    required: true
  },
  
  // Match/Game information
  matchNumber: {
    type: Number,
    default: 1
  },
  
  // Squad-level stats
  squadPlacement: {
    type: Number,
    min: 1,
    default: null
  },
  squadPoints: {
    type: Number,
    default: 0
  },
  totalKills: {
    type: Number,
    default: 0
  },
  
  // Individual player performance within the squad
  players: [{
    playerId: {
      type: String, // We'll use ffId as unique identifier
      required: true
    },
    playerName: {
      type: String,
      required: true
    },
    ffName: {
      type: String,
      required: true
    },
    ffId: {
      type: String,
      required: true
    },
    kills: {
      type: Number,
      default: 0
    },
    assists: {
      type: Number,
      default: 0
    },
    damage: {
      type: Number,
      default: 0
    },
    survived: {
      type: Boolean,
      default: false
    },
    revives: {
      type: Number,
      default: 0
    }
  }],
  
  // Timestamps
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Calculate total kills from all players
squadGameStateSchema.methods.calculateTotalKills = function() {
  this.totalKills = this.players.reduce((sum, player) => sum + player.kills, 0);
  return this.totalKills;
};

// Calculate placement points (standard PUBG/FF scoring)
squadGameStateSchema.methods.calculatePlacementPoints = function() {
  const placementPointsMap = {
    1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1,
    9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0
  };
  return placementPointsMap[this.squadPlacement] || 0;
};

// Calculate total squad points
squadGameStateSchema.methods.calculateSquadPoints = function() {
  const placementPoints = this.calculatePlacementPoints();
  const killPoints = this.totalKills;
  this.squadPoints = placementPoints + killPoints;
  return this.squadPoints;
};

// Complete the match
squadGameStateSchema.methods.completeMatch = function() {
  this.isActive = false;
  this.isCompleted = true;
  this.endTime = new Date();
  this.calculateTotalKills();
  this.calculateSquadPoints();
};

const SquadGameState = mongoose.model('SquadGameState', squadGameStateSchema);

export default SquadGameState;
