import { getTenantModel } from '../utils/tenantModel.js';
import matchHistorySchema from '../models/tenant/MatchHistory.js';
import tournamentHistorySchema from '../models/tenant/TournamentHistory.js';
import auditLogSchema from '../models/tenant/AuditLog.js';

/**
 * History Service - Centralized service for managing history and audit logs
 */
class HistoryService {
    constructor(tenantConnection) {
        this.connection = tenantConnection;
        this.MatchHistory = getTenantModel(tenantConnection, 'MatchHistory', matchHistorySchema);
        this.TournamentHistory = getTenantModel(tenantConnection, 'TournamentHistory', tournamentHistorySchema);
        this.AuditLog = getTenantModel(tenantConnection, 'AuditLog', auditLogSchema);
    }

    /**
     * Create a match history record from completed match data
     */
    async createMatchHistory(matchData) {
        try {
            const history = new this.MatchHistory(matchData);
            await history.save();
            console.log(`✅ Match history created: ${matchData.roomId} - Match ${matchData.matchNumber}`);
            return history;
        } catch (error) {
            console.error('❌ Failed to create match history:', error);
            throw error;
        }
    }

    /**
     * Delete a match history record (used when reverting a crowned winner)
     */
    async deleteMatchHistory(roomId, matchNumber) {
        try {
            const result = await this.MatchHistory.deleteOne({ roomId, matchNumber });
            if (result.deletedCount > 0) {
                console.log(`🗑️ Match history deleted for Room ${roomId} - Match ${matchNumber}`);
            }
            return result;
        } catch (error) {
            console.error('❌ Failed to delete match history:', error);
            throw error;
        }
    }

    /**
     * Add an event to match history timeline
     */
    async addMatchEvent(matchHistoryId, event) {
        try {
            const history = await this.MatchHistory.findById(matchHistoryId);
            if (!history) {
                throw new Error('Match history not found');
            }

            history.events.push({
                timestamp: new Date(),
                ...event
            });

            await history.save();
            return history;
        } catch (error) {
            console.error('❌ Failed to add match event:', error);
            throw error;
        }
    }

    /**
     * Get or create tournament history
     */
    async getOrCreateTournamentHistory(tournamentId, tournamentName, organizerId) {
        try {
            let history = await this.TournamentHistory.findOne({ tournamentId });

            if (!history) {
                history = new this.TournamentHistory({
                    tournamentId,
                    tournamentName,
                    organizerId,
                    timeline: [{
                        timestamp: new Date(),
                        event: 'CREATED',
                        performedBy: {
                            userId: organizerId,
                            role: 'ORGANIZER'
                        }
                    }]
                });
                await history.save();
                console.log(`✅ Tournament history created: ${tournamentName}`);
            }

            return history;
        } catch (error) {
            console.error('❌ Failed to get/create tournament history:', error);
            throw error;
        }
    }

    /**
     * Add timeline event to tournament history
     */
    async addTournamentEvent(tournamentId, event, performedBy, details = {}) {
        try {
            const history = await this.TournamentHistory.findOne({ tournamentId });
            if (!history) {
                throw new Error('Tournament history not found');
            }

            await history.addEvent(event, performedBy, details);
            console.log(`✅ Tournament event added: ${event}`);
            return history;
        } catch (error) {
            console.error('❌ Failed to add tournament event:', error);
            throw error;
        }
    }

    /**
     * Update tournament statistics
     */
    async updateTournamentStats(tournamentId, stats) {
        try {
            const history = await this.TournamentHistory.findOne({ tournamentId });
            if (!history) {
                throw new Error('Tournament history not found');
            }

            await history.updateStats(stats);
            return history;
        } catch (error) {
            console.error('❌ Failed to update tournament stats:', error);
            throw error;
        }
    }

    /**
     * Create an audit log entry
     */
    async logAction(logData) {
        try {
            const log = new this.AuditLog({
                ...logData,
                timestamp: new Date()
            });
            await log.save();
            console.log(`📝 Audit log: ${logData.action} by ${logData.performedBy.role}`);
            return log;
        } catch (error) {
            console.error('❌ Failed to create audit log:', error);
            // Don't throw - audit logging should not break main flow
            return null;
        }
    }

    /**
     * Get match history for a tournament
     */
    async getTournamentMatches(tournamentId, options = {}) {
        const { limit = 50, skip = 0, sort = { completedAt: -1 } } = options;

        return await this.MatchHistory
            .find({ tournamentId })
            .sort(sort)
            .limit(limit)
            .skip(skip)
            .lean();
    }

    /**
     * Get match history for a room
     */
    async getRoomMatches(roomId) {
        return await this.MatchHistory
            .find({ roomId })
            .sort({ matchNumber: 1 })
            .lean();
    }

    /**
     * Get player match history
     */
    async getPlayerMatches(playerId, options = {}) {
        const { limit = 20, skip = 0 } = options;

        return await this.MatchHistory
            .find({ 'participants.players.playerId': playerId })
            .sort({ completedAt: -1 })
            .limit(limit)
            .skip(skip)
            .lean();
    }

    /**
     * Get tournament timeline
     */
    async getTournamentTimeline(tournamentId) {
        const history = await this.TournamentHistory.findOne({ tournamentId });
        return history ? history.timeline : [];
    }

    /**
     * Get audit logs with filters
     */
    async getAuditLogs(filters = {}, options = {}) {
        const { limit = 100, skip = 0 } = options;
        const query = {};

        if (filters.tournamentId) query.tournamentId = filters.tournamentId;
        if (filters.action) query.action = filters.action;
        if (filters.userId) query['performedBy.userId'] = filters.userId;
        if (filters.startDate || filters.endDate) {
            query.timestamp = {};
            if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
            if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
        }

        return await this.AuditLog
            .find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip)
            .lean();
    }

    /**
     * Archive tournament history
     */
    async archiveTournament(tournamentId, performedBy) {
        try {
            const history = await this.TournamentHistory.findOne({ tournamentId });
            if (!history) {
                throw new Error('Tournament history not found');
            }

            history.status = 'ARCHIVED';
            history.archivedAt = new Date();
            await history.addEvent('ARCHIVED', performedBy);
            await history.save();

            console.log(`📦 Tournament archived: ${history.tournamentName}`);
            return history;
        } catch (error) {
            console.error('❌ Failed to archive tournament:', error);
            throw error;
        }
    }
}

export default HistoryService;
