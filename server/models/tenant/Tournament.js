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
        enum: ['SOLO', 'DUO', 'SQUAD', 'CLASH_SQUAD', 'CUSTOM'],
        default: 'SQUAD'
    },
    // Team size per unit (auto-derived or custom)
    teamSize: {
        type: Number,
        default: 4,
        min: 1,
        max: 6
    },
    maxPlayersPerRoom: {
        type: Number,
        default: 48,
        min: 2
    },
    autoRoomAssignment: {
        type: Boolean,
        default: true
    },
    roomsLocked: {
        type: Boolean,
        default: false
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
    // Lock scoring settings once tournament starts
    settingsLocked: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-set teamSize based on mode before saving
tournamentSchema.pre('save', function (next) {
    if (this.isModified('mode') || this.isModified('teamSize')) {
        const teamSizeMap = {
            'SOLO': 1,
            'DUO': 2,
            'SQUAD': 4,
            'CLASH_SQUAD': this.teamSize || 4,
            'CUSTOM': this.teamSize || 4
        };
        this.teamSize = teamSizeMap[this.mode] || 4;
    }
    next();
});

export default tournamentSchema;
