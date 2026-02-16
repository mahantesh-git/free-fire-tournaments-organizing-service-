import mongoose from 'mongoose';

const tournamentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        index: true
    },
    mode: {
        type: String,
        enum: ['SOLO', 'SQUAD'],
        default: 'SQUAD'
    },
    maxPlayersPerRoom: {
        type: Number,
        default: 48
    },
    totalRooms: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['OPEN', 'ONGOING', 'COMPLETED'],
        default: 'OPEN'
    },
    settings: {
        killPoints: { type: Number, default: 1 },
        placementPoints: {
            type: Map,
            of: Number,
            default: {
                1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5,
                7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0
            }
        },
        rankingSort: {
            type: String,
            enum: ['POINTS', 'KILLS'],
            default: 'POINTS'
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default tournamentSchema;
