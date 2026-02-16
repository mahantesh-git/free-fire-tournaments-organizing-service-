import mongoose from 'mongoose';

const squadSchema = new mongoose.Schema({
    squadName: {
        type: String,
        required: [true, 'Squad name is required'],
        trim: true,
        // unique: true // REMOVED global unique
    },
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true,
        index: true
    },
    // Room field - auto-assigned based on registration order
    // NOTE: In multi-tenant/room engine, this might be overridden or deprecated in favor of Room model, 
    // but keeping for backward compatibility or simple usage.
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
    // Match specific fields
    roundPlacement: {
        type: Number,
        default: 0
    },
    roundPoints: {
        type: Number,
        default: 0
    },
    totalKills: {
        type: Number,
        default: 0
    },
    registeredAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    isDisqualified: {
        type: Boolean,
        default: false
    },
    disqualificationReason: {
        type: String,
        default: null
    }
});

// Validation: Squad must have exactly 4 players
squadSchema.pre('save', function (next) {
    if (this.players.length !== 4) {
        const error = new Error('Squad must have exactly 4 players');
        return next(error);
    }
    next();
});

// Check for duplicate FF IDs within the squad
squadSchema.pre('save', function (next) {
    const ffIds = this.players.map(p => p.ffId);
    const uniqueFFIds = new Set(ffIds);

    if (uniqueFFIds.size !== ffIds.length) {
        const error = new Error('Duplicate Free Fire IDs found within squad');
        return next(error);
    }
    next();
});

// Auto-assign room logic removed or needs adaptation for multi-tenant service based approach.
// Keeping it commented out or simple if needed, but "Room Assignment Engine" will likely handle this externally.
// Check if we should keep it: The user wants "Smart Room Assignment Engine". 
// The old logic was simple distinct based. We should probably DISABLE this hook and let the service handle it.
/*
squadSchema.pre('save', async function (next) {
  // ... old auto assign logic ...
});
*/

// Compound index to ensure squad name is unique per tournament
squadSchema.index({ squadName: 1, tournamentId: 1 }, { unique: true });

export default squadSchema;
