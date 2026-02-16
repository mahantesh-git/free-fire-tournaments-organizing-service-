import mongoose from 'mongoose';

const squadLeaderboardSchema = new mongoose.Schema({
    squadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Squad',
        required: true
    },
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true
    },
    squadName: {
        type: String,
        required: true
    },

    // Aggregate statistics across all matches
    totalMatches: {
        type: Number,
        default: 0
    },
    totalKills: {
        type: Number,
        default: 0
    },
    totalPoints: {
        type: Number,
        default: 0
    },
    averageKills: {
        type: Number,
        default: 0
    },
    averagePoints: {
        type: Number,
        default: 0
    },

    // Best performance
    bestPlacement: {
        type: Number,
        default: null
    },
    highestKills: {
        type: Number,
        default: 0
    },

    // Win statistics
    wins: {
        type: Number,
        default: 0
    },
    top3: {
        type: Number,
        default: 0
    },
    top5: {
        type: Number,
        default: 0
    },

    // Player statistics within squad
    playerStats: [{
        playerId: String,
        playerName: String,
        ffName: String,
        ffId: String,
        totalKills: { type: Number, default: 0 },
        totalAssists: { type: Number, default: 0 },
        totalDamage: { type: Number, default: 0 },
        totalRevives: { type: Number, default: 0 },
        totalKillPoints: { type: Number, default: 0 },
        totalPlacementPoints: { type: Number, default: 0 },
        totalIndividualPoints: { type: Number, default: 0 },
        matchesPlayed: { type: Number, default: 0 },
        averageKills: { type: Number, default: 0 }
    }],

    // Recent form (last 5 matches)
    recentForm: [{
        matchNumber: Number,
        placement: Number,
        kills: Number,
        points: Number,
        date: Date
    }],

    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Update leaderboard after each match
squadLeaderboardSchema.methods.updateFromMatch = function (matchData) {
    this.totalMatches += 1;
    this.totalKills += matchData.totalKills;
    this.totalPoints += matchData.squadPoints;

    // Update averages
    this.averageKills = (this.totalKills / this.totalMatches).toFixed(2);
    this.averagePoints = (this.totalPoints / this.totalMatches).toFixed(2);

    // Update best stats
    if (!this.bestPlacement || matchData.squadPlacement < this.bestPlacement) {
        this.bestPlacement = matchData.squadPlacement;
    }
    if (matchData.totalKills > this.highestKills) {
        this.highestKills = matchData.totalKills;
    }

    // Update win statistics
    if (matchData.squadPlacement === 1) this.wins += 1;
    if (matchData.squadPlacement <= 3) this.top3 += 1;
    if (matchData.squadPlacement <= 5) this.top5 += 1;

    // Update recent form (keep last 5 matches)
    this.recentForm.unshift({
        matchNumber: matchData.matchNumber,
        placement: matchData.squadPlacement,
        kills: matchData.totalKills,
        points: matchData.squadPoints,
        date: matchData.endTime
    });
    if (this.recentForm.length > 5) {
        this.recentForm = this.recentForm.slice(0, 5);
    }

    // Update player stats
    matchData.players.forEach(matchPlayer => {
        let playerStat = this.playerStats.find(p => p.ffId === matchPlayer.ffId);

        if (!playerStat) {
            playerStat = {
                playerId: matchPlayer.playerId,
                playerName: matchPlayer.playerName,
                ffName: matchPlayer.ffName,
                ffId: matchPlayer.ffId,
                totalKills: 0,
                totalAssists: 0,
                totalDamage: 0,
                totalRevives: 0,
                totalKillPoints: 0,
                totalPlacementPoints: 0,
                totalIndividualPoints: 0,
                matchesPlayed: 0,
                averageKills: 0
            };
            this.playerStats.push(playerStat);
        }

        playerStat.totalKills += (matchPlayer.kills || 0);
        playerStat.totalAssists += (matchPlayer.assists || 0);
        playerStat.totalDamage += (matchPlayer.damage || 0);
        playerStat.totalRevives += (matchPlayer.revives || 0);
        playerStat.totalKillPoints += (matchPlayer.killPoints || 0);
        playerStat.totalPlacementPoints += (matchPlayer.placementPoints || 0);
        playerStat.totalIndividualPoints = parseFloat((playerStat.totalKillPoints + playerStat.totalPlacementPoints).toFixed(2));
        playerStat.matchesPlayed += 1;
        playerStat.averageKills = (playerStat.totalKills / playerStat.matchesPlayed).toFixed(2);
    });

    this.lastUpdated = new Date();
};

// Revert match stats from leaderboard
squadLeaderboardSchema.methods.revertFromMatch = function (matchData) {
    if (this.totalMatches > 0) {
        this.totalMatches -= 1;
        this.totalKills -= (matchData.totalKills || 0);
        this.totalPoints -= (matchData.squadPoints || 0);

        // Update averages
        if (this.totalMatches > 0) {
            this.averageKills = (this.totalKills / this.totalMatches).toFixed(2);
            this.averagePoints = (this.totalPoints / this.totalMatches).toFixed(2);
        } else {
            this.averageKills = 0;
            this.averagePoints = 0;
        }

        // Win statistics rollback
        if (matchData.squadPlacement === 1 && this.wins > 0) this.wins -= 1;
        if (matchData.squadPlacement <= 3 && this.top3 > 0) this.top3 -= 1;
        if (matchData.squadPlacement <= 5 && this.top5 > 0) this.top5 -= 1;

        // Remove from recent form
        this.recentForm = this.recentForm.filter(f =>
            !(f.matchNumber === matchData.matchNumber &&
                f.placement === matchData.squadPlacement &&
                f.kills === matchData.totalKills)
        );

        // Player statistics rollback
        matchData.players.forEach(matchPlayer => {
            let playerStat = this.playerStats.find(p => p.ffId === matchPlayer.ffId);
            if (playerStat && playerStat.matchesPlayed > 0) {
                playerStat.totalKills -= (matchPlayer.kills || 0);
                playerStat.totalKillPoints -= (matchPlayer.killPoints || 0);
                playerStat.totalPlacementPoints -= (matchPlayer.placementPoints || 0);
                playerStat.totalIndividualPoints = parseFloat((playerStat.totalKillPoints + playerStat.totalPlacementPoints).toFixed(2));
                playerStat.matchesPlayed -= 1;

                if (playerStat.matchesPlayed > 0) {
                    playerStat.averageKills = (playerStat.totalKills / playerStat.matchesPlayed).toFixed(2);
                } else {
                    playerStat.averageKills = 0;
                }
            }
        });

        // Best placement reversal is complex because we don't store 2nd best, 
        // but we can at least reset if it matches the current best and we have recent form
        if (matchData.squadPlacement === this.bestPlacement) {
            this.bestPlacement = this.recentForm.length > 0
                ? Math.min(...this.recentForm.map(f => f.placement))
                : null;
        }

        this.lastUpdated = new Date();
    }
};

// Compound unique index to ensure one leaderboard per squad per tournament
squadLeaderboardSchema.index({ squadId: 1, tournamentId: 1 }, { unique: true });

export default squadLeaderboardSchema;
