import mongoose from 'mongoose';

const duoSchema = new mongoose.Schema({
    teamName: {
        type: String,
        required: [true, 'Team name is required'],
        trim: true
    },
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true,
        index: true
    },
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
        map1: { type: Number, default: 0 },
        map2: { type: Number, default: 0 },
        map3: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    }],
    // Match specific fields
    roundPlacement: { type: Number, default: 0 },
    roundPoints: { type: Number, default: 0 },
    totalKills: { type: Number, default: 0 },
    registeredAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    isDisqualified: { type: Boolean, default: false },
    disqualificationReason: { type: String, default: null }
});

// Validation: Duo must have exactly 2 players
duoSchema.pre('save', function (next) {
    if (this.players.length !== 2) {
        const error = new Error('Duo team must have exactly 2 players');
        return next(error);
    }
    next();
});

// Check for duplicate FF IDs within the duo
duoSchema.pre('save', function (next) {
    const ffIds = this.players.map(p => p.ffId);
    const uniqueFFIds = new Set(ffIds);
    if (uniqueFFIds.size !== ffIds.length) {
        const error = new Error('Duplicate Free Fire IDs found within duo team');
        return next(error);
    }
    next();
});

// Compound index: team name unique per tournament
duoSchema.index({ teamName: 1, tournamentId: 1 }, { unique: true });

export default duoSchema;
