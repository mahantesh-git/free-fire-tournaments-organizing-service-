import mongoose from 'mongoose';

const gameStateSchema = new mongoose.Schema({
  active: {
    type: Boolean,
    default: false
  },
  teamsLocked: {
    type: Boolean,
    default: false
  },
  // Change 'teams' to 'randomTeams' to match frontend
  randomTeams: {
    type: [[{
      _id: String,
      playerName: String,
      ffName: String,
      ffId: String,
      map1: Number,
      map2: Number,
      map3: Number,
      total: Number
    }]],
    default: []
  },
  selectedTopPlayers: {
    type: [String],
    default: []
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Only allow one active game at a time
gameStateSchema.index({ active: 1 }, { 
  unique: true, 
  partialFilterExpression: { active: true } 
});

export default mongoose.model('GameState', gameStateSchema);