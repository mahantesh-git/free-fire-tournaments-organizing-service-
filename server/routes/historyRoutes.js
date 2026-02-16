import express from 'express';
import HistoryService from '../services/historyService.js';

const router = express.Router();

/**
 * GET /api/history/tournament/:tournamentId/matches
 * Get all match history for a tournament
 */
router.get('/tournament/:tournamentId/matches', async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const { limit = 50, skip = 0 } = req.query;

        if (!req.historyService) {
            return res.status(500).json({ error: 'History service not available' });
        }

        const matches = await req.historyService.getTournamentMatches(
            tournamentId,
            { limit: parseInt(limit), skip: parseInt(skip) }
        );

        res.json({
            success: true,
            count: matches.length,
            matches
        });
    } catch (error) {
        console.error('Error fetching tournament matches:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/history/room/:roomId/matches
 * Get all match history for a specific room
 */
router.get('/room/:roomId/matches', async (req, res) => {
    try {
        const { roomId } = req.params;

        if (!req.historyService) {
            return res.status(500).json({ error: 'History service not available' });
        }

        const matches = await req.historyService.getRoomMatches(roomId);

        res.json({
            success: true,
            count: matches.length,
            matches
        });
    } catch (error) {
        console.error('Error fetching room matches:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/history/player/:playerId/matches
 * Get match history for a specific player
 */
router.get('/player/:playerId/matches', async (req, res) => {
    try {
        const { playerId } = req.params;
        const { limit = 20, skip = 0 } = req.query;

        if (!req.historyService) {
            return res.status(500).json({ error: 'History service not available' });
        }

        const matches = await req.historyService.getPlayerMatches(
            playerId,
            { limit: parseInt(limit), skip: parseInt(skip) }
        );

        res.json({
            success: true,
            count: matches.length,
            matches
        });
    } catch (error) {
        console.error('Error fetching player matches:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/history/tournament/:tournamentId/timeline
 * Get tournament timeline events
 */
router.get('/tournament/:tournamentId/timeline', async (req, res) => {
    try {
        const { tournamentId } = req.params;

        if (!req.historyService) {
            return res.status(500).json({ error: 'History service not available' });
        }

        const timeline = await req.historyService.getTournamentTimeline(tournamentId);

        res.json({
            success: true,
            timeline
        });
    } catch (error) {
        console.error('Error fetching tournament timeline:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/history/tournament/:tournamentId/stats
 * Get tournament statistics
 */
router.get('/tournament/:tournamentId/stats', async (req, res) => {
    try {
        const { tournamentId } = req.params;

        if (!req.historyService) {
            return res.status(500).json({ error: 'History service not available' });
        }

        const history = await req.historyService.getOrCreateTournamentHistory(
            tournamentId,
            'Tournament', // placeholder name
            null // placeholder organizer
        );

        res.json({
            success: true,
            statistics: history.statistics,
            status: history.status
        });
    } catch (error) {
        console.error('Error fetching tournament stats:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/audit/tournament/:tournamentId
 * Get audit logs for a tournament
 */
router.get('/audit/tournament/:tournamentId', async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const { limit = 100, skip = 0 } = req.query;

        if (!req.historyService) {
            return res.status(500).json({ error: 'History service not available' });
        }

        const logs = await req.historyService.getAuditLogs(
            { tournamentId },
            { limit: parseInt(limit), skip: parseInt(skip) }
        );

        res.json({
            success: true,
            count: logs.length,
            logs
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/audit/search
 * Search audit logs with filters
 */
router.get('/audit/search', async (req, res) => {
    try {
        const { tournamentId, action, userId, startDate, endDate, limit = 100, skip = 0 } = req.query;

        if (!req.historyService) {
            return res.status(500).json({ error: 'History service not available' });
        }

        const filters = {};
        if (tournamentId) filters.tournamentId = tournamentId;
        if (action) filters.action = action;
        if (userId) filters.userId = userId;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const logs = await req.historyService.getAuditLogs(
            filters,
            { limit: parseInt(limit), skip: parseInt(skip) }
        );

        res.json({
            success: true,
            count: logs.length,
            logs
        });
    } catch (error) {
        console.error('Error searching audit logs:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
