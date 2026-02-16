import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        index: true
    },

    // Action details
    action: {
        type: String,
        required: true,
        index: true
        // Examples: 'CREATE_MODERATOR', 'DELETE_ROOM', 'UPDATE_PLAYER', 'FINALIZE_MATCH'
    },

    // Who performed the action
    performedBy: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        role: {
            type: String,
            enum: ['ORGANIZER', 'MODERATOR', 'ADMIN', 'SYSTEM'],
            required: true
        },
        email: String,
        name: String
    },

    // What was affected
    target: {
        type: {
            type: String,
            enum: ['TOURNAMENT', 'ROOM', 'PLAYER', 'SQUAD', 'MODERATOR', 'MATCH', 'SETTINGS'],
            required: true
        },
        id: mongoose.Schema.Types.ObjectId,
        name: String
    },

    // Change tracking
    changes: {
        before: {
            type: Map,
            of: mongoose.Schema.Types.Mixed
        },
        after: {
            type: Map,
            of: mongoose.Schema.Types.Mixed
        }
    },

    // Request metadata
    ipAddress: String,
    userAgent: String,

    // Result
    success: {
        type: Boolean,
        default: true
    },
    errorMessage: String,

    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Compound indexes for common queries
auditLogSchema.index({ tournamentId: 1, timestamp: -1 });
auditLogSchema.index({ 'performedBy.userId': 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 }); // For recent activity

// TTL index for auto-deletion after 90 days (optional)
// auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

export default auditLogSchema;
