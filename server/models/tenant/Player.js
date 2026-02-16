import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    ffid: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    createdAt: { type: Date, default: Date.now }
});

export default playerSchema;
