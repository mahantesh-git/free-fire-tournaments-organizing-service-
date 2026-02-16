import mongoose from 'mongoose';

const killsSchema = new mongoose.Schema({
    playerName: String,
    ffName: String,
    ffId: { type: String }, // Removed unique constraint for testing
    map1: { type: Number, default: 0 },
    map2: { type: Number, default: 0 },
    map3: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now, index: true },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true }, // Scoped to Tournament
    room: { type: String, default: 'Unassigned', index: true }
});

// Index for sorting by timestamp (Newest first)
killsSchema.index({ timestamp: -1 });
// Compound index to ensure player is unique per tournament
killsSchema.index({ tournamentId: 1, ffId: 1 }, { unique: true });
killsSchema.index({ tournamentId: 1, playerName: 1 }, { unique: true });

export default killsSchema;
