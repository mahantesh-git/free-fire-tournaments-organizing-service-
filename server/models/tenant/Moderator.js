import mongoose from 'mongoose';

const moderatorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
        index: true
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    accessCode: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    assignedSquads: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Squad'
    }],
    assignedRooms: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organizer',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastUsed: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Generate complex access code
// Format: Mod#[8 random chars: uppercase + lowercase + numbers]
// Example: Mod#7kPx2QwN
moderatorSchema.statics.generateAccessCode = function () {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const prefix = 'Mod#';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return prefix + code;
};

// Check if moderator has access to a specific squad
moderatorSchema.methods.hasSquadAccess = function (squadId) {
    return this.assignedSquads.some(id => id.toString() === squadId.toString());
};

// Check if moderator has access to a specific room
moderatorSchema.methods.hasRoomAccess = function (roomId) {
    return this.assignedRooms.some(id => id.toString() === roomId.toString());
};

// Update last used timestamp
moderatorSchema.methods.updateLastUsed = function () {
    this.lastUsed = new Date();
    return this.save();
};

export { moderatorSchema };
