import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true
    },
    roomNumber: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    mode: {
        type: String,
        enum: ['SOLO', 'DUO', 'SQUAD', 'CLASH_SQUAD'],
        required: true
    },

    // Dynamic ref based on mode? Or just store ObjectIds and handle ref in application logic
    // For better querying, we can have separate arrays or a generic participant list
    squads: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Squad'
    }],
    duos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Duo'
    }],
    players: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    }],

    credentials: {
        roomId: String,
        password: String
    },
    moderatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conductor' // Or User, depending on who moderates
    },
    status: {
        type: String,
        enum: ['PENDING', 'READY', 'ONGOING', 'COMPLETED'],
        default: 'PENDING'
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    currentCapacity: {
        type: Number,
        default: 0
    },
    maxCapacity: {
        type: Number,
        default: 48
    },
    // Multi-match tracking: server is the single source of truth for the active match number
    currentMatchNumber: {
        type: Number,
        default: 1,
        min: 1
    },
    matchesPlayed: {
        type: Number,
        default: 0,
        min: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Enforce uniqueness within a tournament
roomSchema.index({ tournamentId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ tournamentId: 1, name: 1 }, { unique: true });

export default roomSchema;
