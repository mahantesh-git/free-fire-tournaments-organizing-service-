import mongoose from 'mongoose';

const squadLeaderboardSchema = new mongoose.Schema({
  squadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Squad',
    required: true,
    unique: true
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
squadLeaderboardSchema.methods.updateFromMatch = function(matchData) {
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
        matchesPlayed: 0,
        averageKills: 0
      };
      this.playerStats.push(playerStat);
    }
    
    playerStat.totalKills += matchPlayer.kills;
    playerStat.totalAssists += matchPlayer.assists;
    playerStat.totalDamage += matchPlayer.damage;
    playerStat.totalRevives += matchPlayer.revives;
    playerStat.matchesPlayed += 1;
    playerStat.averageKills = (playerStat.totalKills / playerStat.matchesPlayed).toFixed(2);
  });
  
  this.lastUpdated = new Date();
};

const SquadLeaderboard = mongoose.model('SquadLeaderboard', squadLeaderboardSchema);

export default SquadLeaderboard;