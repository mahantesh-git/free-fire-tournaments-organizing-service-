import mongoose from 'mongoose';

const tournamentHistorySchema = new mongoose.Schema({
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true,
        unique: true,
        index: true
    },
    tournamentName: {
        type: String,
        required: true
    },
    organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    // Timeline of major events
    timeline: [{
        timestamp: {
            type: Date,
            required: true,
            default: Date.now
        },
        event: {
            type: String,
            enum: [
                'CREATED',
                'STARTED',
                'ROOMS_GENERATED',
                'MATCH_COMPLETED',
                'PLAYER_REGISTERED',
                'SQUAD_REGISTERED',
                'MODERATOR_ASSIGNED',
                'COMPLETED',
                'ARCHIVED'
            ],
            required: true
        },
        performedBy: {
            userId: mongoose.Schema.Types.ObjectId,
            role: String,
            email: String
        },
        details: {
            type: Map,
            of: mongoose.Schema.Types.Mixed
        }
    }],

    // Aggregated statistics
    statistics: {
        totalPlayers: {
            type: Number,
            default: 0
        },
        totalSquads: {
            type: Number,
            default: 0
        },
        totalRooms: {
            type: Number,
            default: 0
        },
        totalMatches: {
            type: Number,
            default: 0
        },
        totalKills: {
            type: Number,
            default: 0
        },
        averageMatchDuration: {
            type: Number,
            default: 0
        }
    },

    // Status
    status: {
        type: String,
        enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'],
        default: 'ACTIVE'
    },

    archivedAt: Date
}, {
    timestamps: true
});

// Method to add timeline event
tournamentHistorySchema.methods.addEvent = function (event, performedBy, details = {}) {
    this.timeline.push({
        timestamp: new Date(),
        event,
        performedBy,
        details: new Map(Object.entries(details))
    });
    return this.save();
};

// Method to update statistics
tournamentHistorySchema.methods.updateStats = function (stats) {
    Object.assign(this.statistics, stats);
    return this.save();
};

export default tournamentHistorySchema;
