import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
    playerName: String,
    ffName: String,
    ffId: { type: String, unique: true },
    map1: { type: Number, default: 0 },
    map2: { type: Number, default: 0 },
    map3: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
});

const playerKills = mongoose.model('playerKills', playerSchema);

export default playerKills;




