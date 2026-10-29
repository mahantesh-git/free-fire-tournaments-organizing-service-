import mongoose from 'mongoose';

const tournamentStandingSchema = new mongoose.Schema({
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
    mode: {
        type: String,
        enum: ['SOLO', 'DUO', 'SQUAD', 'CLASH_SQUAD', 'CUSTOM'],
        default: 'SQUAD'
    },
    rankingMetric: {
        type: String,
        enum: ['POINTS', 'KILLS'],
        default: 'POINTS'
    },
    killPointsMultiplier: {
        type: Number,
        default: 1
    },
    placementPointsMap: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    totalRooms: {
        type: Number,
        default: 0
    },
    totalMatchesPlayed: {
        type: Number,
        default: 0
    },
    playedMatchNumbers: [{
        type: Number
    }],
    roomsSummary: [{
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room'
        },
        roomNumber: Number,
        roomName: String,
        matchesPlayed: Number,
        status: String
    }],
    teamRankings: [{
        rank: mongoose.Schema.Types.Mixed,
        squadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Squad'
        },
        squadName: String,
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room'
        },
        roomName: String,
        matchesPlayed: {
            type: Number,
            default: 0
        },
        totalKills: {
            type: Number,
            default: 0
        },
        placementPoints: {
            type: Number,
            default: 0
        },
        totalPoints: {
            type: Number,
            default: 0
        },
        booyahs: {
            type: Number,
            default: 0
        },
        bestPlacement: {
            type: Number,
            default: 999
        },
        isDisqualified: {
            type: Boolean,
            default: false
        },
        disqualificationReason: String,
        matchBreakdown: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        players: [{
            playerId: String,
            playerName: String,
            ffName: String,
            ffId: String,
            totalKills: { type: Number, default: 0 },
            totalDamage: { type: Number, default: 0 },
            totalPoints: { type: Number, default: 0 }
        }]
    }],
    playerRankings: [{
        rank: mongoose.Schema.Types.Mixed,
        playerId: String,
        playerName: String,
        ffName: String,
        ffId: String,
        teamName: String,
        squadId: {
            type: mongoose.Schema.Types.ObjectId
        },
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room'
        },
        roomName: String,
        matchesPlayed: {
            type: Number,
            default: 0
        },
        totalKills: {
            type: Number,
            default: 0
        },
        totalDamage: {
            type: Number,
            default: 0
        },
        killPoints: {
            type: Number,
            default: 0
        },
        placementPoints: {
            type: Number,
            default: 0
        },
        totalPoints: {
            type: Number,
            default: 0
        },
        booyahs: {
            type: Number,
            default: 0
        },
        bestPlacement: {
            type: Number,
            default: 999
        },
        isDisqualified: {
            type: Boolean,
            default: false
        },
        matchBreakdown: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        matchPointsBreakdown: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    }],
    qualification: {
        cutoff: {
            type: Number,
            default: 48
        },
        type: {
            type: String,
            enum: ['PLAYERS', 'SQUADS'],
            default: 'PLAYERS'
        },
        customTitle: {
            type: String,
            default: 'Qualified for Next Round'
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    isComplete: {
        type: Boolean,
        default: false
    },
    generatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

export default tournamentStandingSchema;
