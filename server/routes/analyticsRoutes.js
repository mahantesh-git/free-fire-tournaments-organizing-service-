import express from 'express';
import { getTenantModel } from '../utils/tenantModel.js';
import matchHistorySchema from '../models/tenant/MatchHistory.js';
import tournamentHistorySchema from '../models/tenant/TournamentHistory.js';
import squadLeaderboardSchema from '../models/tenant/SquadLeaderboard.js';

const router = express.Router();

/**
 * GET /api/analytics/tournament/:tournamentId/overview
 * Get comprehensive tournament analytics
 */
router.get('/tournament/:tournamentId/overview', async (req, res) => {
    try {
        const { tournamentId } = req.params;

        if (!req.historyService) {
            return res.status(500).json({ error: 'History service not available' });
        }

        const MatchHistory = getTenantModel(req.tenantConnection, 'MatchHistory', matchHistorySchema);
        const TournamentHistory = getTenantModel(req.tenantConnection, 'TournamentHistory', tournamentHistorySchema);
        const SquadLeaderboard = getTenantModel(req.tenantConnection, 'SquadLeaderboard', squadLeaderboardSchema);

        // Get tournament history
        const tournamentHistory = await TournamentHistory.findOne({ tournamentId });

        // Get all matches
        const matches = await MatchHistory.find({ tournamentId }).lean();

        // Get leaderboard
        const leaderboard = await SquadLeaderboard.find({ tournamentId })
            .sort({ totalPoints: -1 })
            .limit(10)
            .lean();

        // Calculate analytics
        const totalMatches = matches.length;
        const totalKills = matches.reduce((sum, match) => {
            return sum + match.participants.reduce((pSum, p) => pSum + (p.totalKills || 0), 0);
        }, 0);

        const averageMatchDuration = totalMatches > 0
            ? Math.floor(matches.reduce((sum, m) => sum + m.duration, 0) / totalMatches)
            : 0;

        const topKillers = [];
        const playerKills = {};

        matches.forEach(match => {
            match.participants.forEach(participant => {
                participant.players?.forEach(player => {
                    if (!playerKills[player.ffId]) {
                        playerKills[player.ffId] = {
                            ffId: player.ffId,
                            playerName: player.playerName,
                            ffName: player.ffName,
                            totalKills: 0,
                            matches: 0
                        };
                    }
                    playerKills[player.ffId].totalKills += player.kills || 0;
                    playerKills[player.ffId].matches += 1;
                });
            });
        });

        const topKillersArray = Object.values(playerKills)
            .sort((a, b) => b.totalKills - a.totalKills)
            .slice(0, 10);

        res.json({
            success: true,
            analytics: {
                overview: {
                    totalMatches,
                    totalKills,
                    averageMatchDuration,
                    totalParticipants: tournamentHistory?.statistics?.totalSquads || 0
                },
                leaderboard,
                topKillers: topKillersArray,
                recentMatches: matches.slice(-5).reverse(),
                timeline: tournamentHistory?.timeline || []
            }
        });
    } catch (error) {
        console.error('Error fetching tournament analytics:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/analytics/tournament/:tournamentId/export
 * Export tournament data as JSON
 */
router.get('/tournament/:tournamentId/export', async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const { format = 'json' } = req.query;

        if (!req.historyService) {
            return res.status(500).json({ error: 'History service not available' });
        }

        const MatchHistory = getTenantModel(req.tenantConnection, 'MatchHistory', matchHistorySchema);
        const TournamentHistory = getTenantModel(req.tenantConnection, 'TournamentHistory', tournamentHistorySchema);
        const SquadLeaderboard = getTenantModel(req.tenantConnection, 'SquadLeaderboard', squadLeaderboardSchema);

        const [tournamentHistory, matches, leaderboard] = await Promise.all([
            TournamentHistory.findOne({ tournamentId }).lean(),
            MatchHistory.find({ tournamentId }).lean(),
            SquadLeaderboard.find({ tournamentId }).sort({ totalPoints: -1 }).lean()
        ]);

        const exportData = {
            tournament: {
                id: tournamentId,
                name: tournamentHistory?.tournamentName,
                status: tournamentHistory?.status,
                statistics: tournamentHistory?.statistics,
                timeline: tournamentHistory?.timeline
            },
            matches,
            leaderboard,
            exportedAt: new Date().toISOString()
        };

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="tournament-${tournamentId}-${Date.now()}.json"`);
            res.json(exportData);
        } else {
            // CSV format
            const csv = convertToCSV(leaderboard);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="leaderboard-${tournamentId}-${Date.now()}.csv"`);
            res.send(csv);
        }
    } catch (error) {
        console.error('Error exporting tournament data:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/analytics/player/:playerId/stats
 * Get player performance statistics
 */
router.get('/player/:playerId/stats', async (req, res) => {
    try {
        const { playerId } = req.params;

        if (!req.historyService) {
            return res.status(500).json({ error: 'History service not available' });
        }

        const MatchHistory = getTenantModel(req.tenantConnection, 'MatchHistory', matchHistorySchema);

        const matches = await MatchHistory.find({
            'participants.players.playerId': playerId
        }).lean();

        let totalKills = 0;
        let totalPoints = 0;
        let totalMatches = matches.length;
        let wins = 0;
        let top3Finishes = 0;

        matches.forEach(match => {
            match.participants.forEach(participant => {
                const player = participant.players?.find(p => p.playerId === playerId);
                if (player) {
                    totalKills += player.kills || 0;
                    totalPoints += (player.killPoints || 0) + (player.placementPoints || 0);

                    if (participant.finalRank === 1) wins++;
                    if (participant.finalRank <= 3) top3Finishes++;
                }
            });
        });

        res.json({
            success: true,
            stats: {
                playerId,
                totalMatches,
                totalKills,
                totalPoints,
                wins,
                top3Finishes,
                averageKills: totalMatches > 0 ? (totalKills / totalMatches).toFixed(2) : 0,
                averagePoints: totalMatches > 0 ? (totalPoints / totalMatches).toFixed(2) : 0,
                winRate: totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(2) + '%' : '0%'
            }
        });
    } catch (error) {
        console.error('Error fetching player stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to convert leaderboard to CSV
function convertToCSV(leaderboard) {
    const headers = ['Rank', 'Squad Name', 'Total Points', 'Total Kills', 'Matches Played', 'Wins'];
    const rows = leaderboard.map((squad, index) => [
        index + 1,
        squad.squadName,
        squad.totalPoints,
        squad.totalKills,
        squad.matchesPlayed,
        squad.wins
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
}

export default router;
