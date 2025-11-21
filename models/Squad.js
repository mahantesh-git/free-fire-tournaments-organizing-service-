import mongoose from 'mongoose';

const squadSchema = new mongoose.Schema({
  squadName: {
    type: String,
    required: [true, 'Squad name is required'],
    trim: true,
    unique: true
  },
  // Room field - auto-assigned based on registration order
  room: {
    type: String,
    required: false,
    trim: true,
    default: 'Unassigned'
  },
  players: [{
    playerName: {
      type: String,
      required: [true, 'Player name is required'],
      trim: true
    },
    ffName: {
      type: String,
      required: [true, 'Free Fire name is required'],
      trim: true
    },
    ffId: {
      type: String,
      required: [true, 'Free Fire ID is required'],
      trim: true
    },
    // Kill tracking fields
    map1: {
      type: Number,
      default: 0
    },
    map2: {
      type: Number,
      default: 0
    },
    map3: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  }],
  registeredAt: {
    type: Date,
    default: Date.now
  }
});

// Validation: Squad must have exactly 4 players
squadSchema.pre('save', function(next) {
  if (this.players.length !== 4) {
    const error = new Error('Squad must have exactly 4 players');
    return next(error);
  }
  next();
});

// Check for duplicate FF IDs within the squad
squadSchema.pre('save', function(next) {
  const ffIds = this.players.map(p => p.ffId);
  const uniqueFFIds = new Set(ffIds);
  
  if (uniqueFFIds.size !== ffIds.length) {
    const error = new Error('Duplicate Free Fire IDs found within squad');
    return next(error);
  }
  next();
});

// Auto-assign room before saving (only for new squads)
squadSchema.pre('save', async function(next) {
  // Only assign room if it's a new squad and room is not already set
  if (this.isNew && (!this.room || this.room === 'Unassigned')) {
    try {
      const SQUADS_PER_ROOM = 12;
      
      // Count total squads
      const totalSquads = await mongoose.model('Squad').countDocuments();
      
      // Calculate which room this squad should be in
      const roomNumber = Math.floor(totalSquads / SQUADS_PER_ROOM) + 1;
      this.room = `Room ${roomNumber}`;
      
      console.log(`🎮 Auto-assigned ${this.squadName} to Room ${roomNumber}`);
    } catch (error) {
      console.error('Error auto-assigning room:', error);
      // Don't fail the save, just leave as Unassigned
    }
  }
  next();
});

const Squad = mongoose.model('Squad', squadSchema);

export default Squad;