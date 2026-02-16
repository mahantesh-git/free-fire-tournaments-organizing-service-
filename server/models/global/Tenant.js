import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const tenantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true // Indexed for fast lookup by subdomain
    },
    databaseName: {
        type: String,
        required: true,
        unique: true
    },
    ownerEmail: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false // Don't return by default
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'pending'],
        default: 'active'
    },
    maxModerators: {
        type: Number,
        default: 5,
        min: 1,
        max: 50
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
tenantSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Compare password method
tenantSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Since this is a global model, we export the Model directly (bound to default connection)
export default mongoose.model('Tenant', tenantSchema);
