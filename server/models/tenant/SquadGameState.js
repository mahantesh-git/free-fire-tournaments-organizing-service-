import mongoose from 'mongoose';

const squadGameStateSchema = new mongoose.Schema({
    squadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Squad',
        required: true
    },
    squadName: {
        type: String,
        required: true
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
    },
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament'
    },

    // Match/Game information
    matchNumber: {
        type: Number,
        default: 1
    },

    // Squad-level stats
    squadPlacement: {
        type: Number,
        min: 1,
        default: null
    },
    squadPoints: {
        type: Number,
        default: 0
    },
    totalKills: {
        type: Number,
        default: 0
    },

    // Individual player performance within the squad
    players: [{
        playerId: {
            type: String, // We'll use ffId as unique identifier
            required: true
        },
        playerName: {
            type: String,
            required: true
        },
        ffName: {
            type: String,
            required: true
        },
        ffId: {
            type: String,
            required: true
        },
        kills: {
            type: Number,
            default: 0
        },
        assists: {
            type: Number,
            default: 0
        },
        damage: {
            type: Number,
            default: 0
        },
        survived: {
            type: Boolean,
            default: false
        },
        revives: {
            type: Number,
            default: 0
        },
        isEliminated: {
            type: Boolean,
            default: false
        },
        // Individual point contribution
        killPoints: {
            type: Number,
            default: 0
        },
        placementPoints: {
            type: Number,
            default: 0
        }
    }],

    // Timestamps
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date,
        default: null
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    isDisqualified: {
        type: Boolean,
        default: false
    },
    disqualificationReason: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for HIGH PERFORMANCE
squadGameStateSchema.index({ squadId: 1, matchNumber: 1, roomId: 1 }); // Unique identifier per ROOM instance + Quick lookup
squadGameStateSchema.index({ matchNumber: 1, isCompleted: 1 }); // Filtering for active/completed matches
squadGameStateSchema.index({ squadId: 1 }); // General squad queries
squadGameStateSchema.index({ tournamentId: 1, isCompleted: 1 }); // History queries

// Calculate total kills from all players
squadGameStateSchema.methods.calculateTotalKills = function () {
    this.totalKills = this.players.reduce((sum, player) => sum + player.kills, 0);
    return this.totalKills;
};

// Calculate placement points (Dynamic scoring)
squadGameStateSchema.methods.calculatePlacementPoints = function (scoringConfig) {
    if (!scoringConfig || !scoringConfig.placementPoints) {
        // Fallback to default if no config provided
        const placementPointsMap = {
            1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5,
            7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0
        };
        return placementPointsMap[this.squadPlacement] || 0;
    }

    // Handle Map or Object structure from Mongoose
    const pointsMap = scoringConfig.placementPoints instanceof Map ?
        Object.fromEntries(scoringConfig.placementPoints) :
        scoringConfig.placementPoints;

    if (!this.squadPlacement) return 0;
    return pointsMap[this.squadPlacement.toString()] || 0;
};

// Calculate total squad points and individual contributions
squadGameStateSchema.methods.calculateSquadPoints = function (scoringConfig) {
    if (this.isDisqualified) {
        this.squadPoints = 0;
        this.players.forEach(p => {
            p.killPoints = 0;
            p.placementPoints = 0;
        });
        return 0;
    }

    const totalPlacementPoints = this.calculatePlacementPoints(scoringConfig);
    const killPointsValue = scoringConfig?.killPoints || 1;
    const totalKillPoints = this.totalKills * killPointsValue;

    // Distribute placement points equally among players
    const playersCount = this.players.length || 1;
    const individualPlacementPoints = parseFloat((totalPlacementPoints / playersCount).toFixed(2));

    this.players.forEach(player => {
        player.killPoints = player.kills * killPointsValue;
        player.placementPoints = individualPlacementPoints;
    });

    this.squadPoints = totalPlacementPoints + totalKillPoints;
    return this.squadPoints;
};

// Complete the match
squadGameStateSchema.methods.completeMatch = function (scoringConfig) {
    this.isActive = false;
    this.isCompleted = true;
    this.endTime = new Date();

    // Mark all players as eliminated when squad is eliminated
    this.players.forEach(player => {
        player.isEliminated = true;
    });

    this.calculateTotalKills();
    this.calculateSquadPoints(scoringConfig);
};

// Disqualify and finalize
squadGameStateSchema.methods.disqualifySquad = function (reason) {
    this.isActive = false;
    this.isCompleted = true;
    this.isDisqualified = true;
    this.disqualificationReason = reason || 'Rule violation';
    this.endTime = new Date();
    this.squadPoints = 0;
};

// Revoke disqualification and reactivate
squadGameStateSchema.methods.revokeDisqualification = function () {
    this.isActive = true;
    this.isCompleted = false;
    this.isDisqualified = false;
    this.disqualificationReason = null;
    this.endTime = null;
    this.squadPlacement = null;
    // Note: points and kills are kept, but points will be recalculated on next completion
};

// Revert a completed match back to active state
squadGameStateSchema.methods.revertMatch = function () {
    this.isActive = true;
    this.isCompleted = false;
    this.endTime = null;
    this.squadPlacement = null;
    // Reset points as they will be recalculated
    this.squadPoints = 0;
    this.players.forEach(p => {
        p.killPoints = 0;
        p.placementPoints = 0;
    });
};

export default squadGameStateSchema;
