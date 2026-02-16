import mongoose from 'mongoose';

const matchHistorySchema = new mongoose.Schema({
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true,
        index: true
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
        index: true
    },
    matchNumber: {
        type: Number,
        required: true
    },
    mode: {
        type: String,
        enum: ['SOLO', 'SQUAD'],
        required: true
    },

    // Timing
    startedAt: {
        type: Date,
        required: true
    },
    completedAt: {
        type: Date,
        required: true
    },
    duration: {
        type: Number // in seconds
    },

    // Participants snapshot
    participants: [{
        squadId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        squadName: {
            type: String,
            required: true
        },
        finalRank: {
            type: Number,
            required: true
        },
        totalKills: {
            type: Number,
            default: 0
        },
        totalPoints: {
            type: Number,
            default: 0
        },
        eliminatedAt: Date,
        isDisqualified: {
            type: Boolean,
            default: false
        },
        disqualificationReason: String,

        // Player-level details (for detailed replay)
        players: [{
            playerId: String,
            playerName: String,
            ffName: String,
            ffId: String,
            kills: Number,
            killPoints: Number,
            placementPoints: Number,
            isEliminated: Boolean
        }]
    }],

    // Event timeline for replay
    events: [{
        timestamp: {
            type: Date,
            required: true
        },
        type: {
            type: String,
            enum: ['KILL', 'ELIMINATION', 'DISQUALIFY', 'WINNER', 'REVOKE_DQ'],
            required: true
        },
        actorId: mongoose.Schema.Types.ObjectId, // Who performed the action (squadId)
        targetId: mongoose.Schema.Types.ObjectId, // Who was affected
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed
        }
    }],

    // Winner info
    winner: {
        squadId: mongoose.Schema.Types.ObjectId,
        squadName: String,
        totalPoints: Number
    },

    // Moderation
    moderatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Moderator'
    },

    // Scoring config snapshot
    scoringConfig: {
        killPoints: Number,
        placementPoints: {
            type: Map,
            of: Number
        }
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
matchHistorySchema.index({ tournamentId: 1, completedAt: -1 });
matchHistorySchema.index({ roomId: 1, matchNumber: 1 });
matchHistorySchema.index({ 'participants.squadId': 1 });
matchHistorySchema.index({ completedAt: -1 });

// Calculate duration before save
matchHistorySchema.pre('save', function (next) {
    if (this.startedAt && this.completedAt) {
        this.duration = Math.floor((this.completedAt - this.startedAt) / 1000);
    }
    next();
});

export default matchHistorySchema;
