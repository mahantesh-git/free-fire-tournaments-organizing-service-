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
    // Dynamic scoring configuration
    scoringConfig: {
        killPoints: { type: Number, default: 1 },
        placementPoints: {
            type: Map,
            of: Number,
            default: {
                1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5,
                7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0
            }
        }
    },
    gameMode: {
        type: String,
        enum: ['random', 'squads'],
        default: 'squads'
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
    },
    // Match Countdown Timer
    timer: {
        status: {
            type: String,
            enum: ['IDLE', 'RUNNING', 'PAUSED'],
            default: 'IDLE'
        },
        duration: {
            type: Number,
            default: 0 // in seconds
        },
        endsAt: {
            type: Date,
            default: null
        },
        remaining: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Only allow one active game at a time (per tenant)
gameStateSchema.index({ active: 1 }, {
    unique: true,
    partialFilterExpression: { active: true }
});

export default gameStateSchema;
