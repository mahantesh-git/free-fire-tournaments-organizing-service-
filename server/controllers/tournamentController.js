import tournamentSchema from '../models/tenant/Tournament.js';
import tournamentStandingSchema from '../models/tenant/TournamentStanding.js';
import { getTenantModel } from '../utils/tenantModel.js';
import { calculateTournamentStanding } from '../services/tournamentStandingService.js';

// Create Tournament
export const createTournament = async (req, res) => {
    try {
        const Tournament = getTenantModel(req.tenantConnection, 'Tournament', tournamentSchema);
        const tournament = new Tournament(req.body);
        await tournament.save();

        // Initialize tournament history
        if (req.historyService) {
            try {
                await req.historyService.getOrCreateTournamentHistory(
                    tournament._id,
                    tournament.name,
                    req.tenant._id
                );
                console.log(`📚 Tournament history initialized for: ${tournament.name}`);
            } catch (historyError) {
                console.error('Failed to initialize tournament history:', historyError);
            }
        }

        res.status(201).json({ success: true, tournament });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'A tournament with this name already exists' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Get All Tournaments
export const getTournaments = async (req, res) => {
    try {
        const Tournament = getTenantModel(req.tenantConnection, 'Tournament', tournamentSchema);
        const tournaments = await Tournament.find().sort({ createdAt: -1 });
        res.json({ success: true, tournaments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Single Tournament
export const getTournamentById = async (req, res) => {
    try {
        const Tournament = getTenantModel(req.tenantConnection, 'Tournament', tournamentSchema);
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        res.json({ success: true, tournament });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Tournament
export const updateTournament = async (req, res) => {
    try {
        const Tournament = getTenantModel(req.tenantConnection, 'Tournament', tournamentSchema);
        const tournament = await Tournament.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        res.json({ success: true, tournament });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete Tournament
export const deleteTournament = async (req, res) => {
    try {
        const Tournament = getTenantModel(req.tenantConnection, 'Tournament', tournamentSchema);
        const tournament = await Tournament.findByIdAndDelete(req.params.id);
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        res.json({ success: true, message: 'Tournament deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Tournament Standings
export const getTournamentStandings = async (req, res) => {
    try {
        const { id: tournamentId } = req.params;
        const forceRefresh = req.query.refresh === 'true';

        const result = await calculateTournamentStanding({
            tenantConnection: req.tenantConnection,
            tournamentId,
            forceSave: forceRefresh,
            historyService: req.historyService,
            io: req.app.get('io'),
            tenantSlug: req.tenant?.slug,
            performedBy: { userId: req.tenant?._id, role: 'ORGANIZER' }
        });

        res.json({
            success: true,
            isComplete: result.isComplete,
            standing: result.standing
        });
    } catch (error) {
        console.error('Error getting tournament standings:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Generate / Recalculate Tournament Standings
export const generateTournamentStandings = async (req, res) => {
    try {
        const { id: tournamentId } = req.params;

        const result = await calculateTournamentStanding({
            tenantConnection: req.tenantConnection,
            tournamentId,
            forceSave: true,
            historyService: req.historyService,
            io: req.app.get('io'),
            tenantSlug: req.tenant?.slug,
            performedBy: { userId: req.tenant?._id, role: 'ORGANIZER' }
        });

        res.json({
            success: true,
            message: result.isComplete
                ? 'Official tournament standings compiled and tournament marked COMPLETED.'
                : 'Tournament standings compiled successfully.',
            isComplete: result.isComplete,
            standing: result.standing
        });
    } catch (error) {
        console.error('Error generating tournament standings:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Qualification Status & Cutoff (Publicly accessible / Player verification)
export const getQualificationStatus = async (req, res) => {
    try {
        const { id: tournamentId } = req.params;
        const { playerId, ffId, cutoff: customCutoff, type: customType, includeList } = req.query;

        const Standing = getTenantModel(req.tenantConnection, 'TournamentStanding', tournamentStandingSchema);
        let standing = await Standing.findOne({ tournamentId }).lean();

        if (!standing) {
            const result = await calculateTournamentStanding({
                tenantConnection: req.tenantConnection,
                tournamentId,
                forceSave: false,
                io: req.app.get('io'),
                tenantSlug: req.tenant?.slug
            });
            standing = result.standing;
        }

        if (!standing) {
            return res.status(404).json({
                success: false,
                message: 'No standings or tournament found'
            });
        }

        const isSolo = standing.mode === 'SOLO';
        const configCutoff = customCutoff ? parseInt(customCutoff) : (standing.qualification?.cutoff || 48);
        const configType = isSolo ? 'PLAYERS' : (customType || standing.qualification?.type || 'PLAYERS');
        const customTitle = standing.qualification?.customTitle || 'Qualified for Next Round';

        const eligibleSquads = (standing.teamRankings || []).filter(t => !t.isDisqualified);
        const eligiblePlayers = (standing.playerRankings || []).filter(p => !p.isDisqualified);

        let qualifiedList = [];
        let totalEligible = 0;

        if (configType === 'SQUADS' && !isSolo) {
            totalEligible = eligibleSquads.length;
            const cappedCutoff = Math.max(1, Math.min(configCutoff, eligibleSquads.length || 1));
            qualifiedList = eligibleSquads.slice(0, cappedCutoff).map((t, idx) => ({
                qualificationRank: idx + 1,
                rank: t.rank,
                squadId: t.squadId,
                squadName: t.squadName,
                roomName: t.roomName,
                totalPoints: t.totalPoints,
                totalKills: t.totalKills,
                booyahs: t.booyahs,
                players: t.players || []
            }));
        } else {
            totalEligible = eligiblePlayers.length;
            const cappedCutoff = Math.max(1, Math.min(configCutoff, eligiblePlayers.length || 1));
            qualifiedList = eligiblePlayers.slice(0, cappedCutoff).map((p, idx) => ({
                qualificationRank: idx + 1,
                rank: p.rank,
                playerId: p.playerId,
                playerName: p.playerName || p.ffName,
                ffName: p.ffName,
                ffId: p.ffId,
                teamName: p.teamName,
                roomName: p.roomName,
                totalPoints: p.totalPoints,
                totalKills: p.totalKills,
                booyahs: p.booyahs,
                matchesPlayed: p.matchesPlayed
            }));
        }

        // Search for specific player by ffId or playerId if requested
        let searchResult = null;
        const queryId = (ffId || playerId || '').toString().trim().toLowerCase();

        if (queryId) {
            // Find in player rankings
            const matchedPlayer = (standing.playerRankings || []).find(p => {
                const pFfId = (p.ffId || '').toString().trim().toLowerCase();
                const pPlayerId = (p.playerId || '').toString().trim().toLowerCase();
                const pName = (p.playerName || p.ffName || '').toString().trim().toLowerCase();
                return pFfId === queryId || pPlayerId === queryId || pName === queryId;
            });

            if (matchedPlayer) {
                let isQualified = false;
                let qualifiedRank = null;

                if (configType === 'SQUADS' && !isSolo) {
                    const qualifiedSquad = qualifiedList.find(q =>
                        (q.squadId && matchedPlayer.squadId && q.squadId.toString() === matchedPlayer.squadId.toString()) ||
                        (q.squadName && matchedPlayer.teamName && q.squadName.toLowerCase() === matchedPlayer.teamName.toLowerCase())
                    );
                    if (qualifiedSquad) {
                        isQualified = true;
                        qualifiedRank = qualifiedSquad.qualificationRank;
                    }
                } else {
                    const qualifiedPlayer = qualifiedList.find(q =>
                        (q.ffId && matchedPlayer.ffId && q.ffId.toString() === matchedPlayer.ffId.toString()) ||
                        (q.playerId && matchedPlayer.playerId && q.playerId.toString() === matchedPlayer.playerId.toString())
                    );
                    if (qualifiedPlayer) {
                        isQualified = true;
                        qualifiedRank = qualifiedPlayer.qualificationRank;
                    }
                }

                searchResult = {
                    found: true,
                    isQualified,
                    qualificationRank: qualifiedRank,
                    rank: matchedPlayer.rank,
                    cutoff: configCutoff,
                    isDisqualified: matchedPlayer.isDisqualified,
                    player: {
                        name: matchedPlayer.playerName || matchedPlayer.ffName,
                        ffId: matchedPlayer.ffId,
                        playerId: matchedPlayer.playerId,
                        teamName: matchedPlayer.teamName,
                        roomName: matchedPlayer.roomName,
                        totalPoints: matchedPlayer.totalPoints,
                        totalKills: matchedPlayer.totalKills,
                        booyahs: matchedPlayer.booyahs,
                        matchesPlayed: matchedPlayer.matchesPlayed
                    }
                };
            } else {
                searchResult = {
                    found: false,
                    query: queryId,
                    message: `No player found matching '${queryId}' in this tournament.`
                };
            }
        }

        res.json({
            success: true,
            tournamentId,
            tournamentName: standing.tournamentName,
            mode: standing.mode,
            isComplete: standing.isComplete,
            rankingMetric: standing.rankingMetric,
            killPointsMultiplier: standing.killPointsMultiplier,
            qualification: {
                cutoff: configCutoff,
                type: configType,
                customTitle,
                updatedAt: standing.qualification?.updatedAt || standing.updatedAt
            },
            totalEligible,
            totalQualified: qualifiedList.length,
            ...(includeList === 'true' ? { qualifiedList } : {}),
            searchResult
        });
    } catch (error) {
        console.error('Error getting qualification status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Qualification Cutoff (Organizer action)
export const updateQualificationCutoff = async (req, res) => {
    try {
        const { id: tournamentId } = req.params;
        const { cutoff, type, customTitle } = req.body;

        const numCutoff = parseInt(cutoff);
        if (isNaN(numCutoff) || numCutoff < 1) {
            return res.status(400).json({
                success: false,
                message: 'Cutoff must be a valid positive integer greater than 0.'
            });
        }

        const Standing = getTenantModel(req.tenantConnection, 'TournamentStanding', tournamentStandingSchema);
        let standing = await Standing.findOne({ tournamentId });

        if (!standing) {
            const result = await calculateTournamentStanding({
                tenantConnection: req.tenantConnection,
                tournamentId,
                forceSave: true,
                io: req.app.get('io'),
                tenantSlug: req.tenant?.slug
            });
            standing = result.standingDoc;
        }

        if (!standing) {
            return res.status(404).json({ success: false, message: 'Tournament standing not found.' });
        }

        standing.qualification = {
            cutoff: numCutoff,
            type: type === 'SQUADS' ? 'SQUADS' : 'PLAYERS',
            customTitle: customTitle || 'Qualified for Next Round',
            updatedAt: new Date()
        };

        await standing.save();

        // Emit real-time notification to tenant room
        const io = req.app.get('io');
        const tenantSlug = req.tenant?.slug;
        if (io && tenantSlug) {
            io.to(tenantSlug).emit('qualificationUpdated', {
                tournamentId,
                qualification: standing.qualification
            });
        }

        res.json({
            success: true,
            message: `Top ${numCutoff} qualification cutoff saved successfully!`,
            qualification: standing.qualification
        });
    } catch (error) {
        console.error('Error updating qualification cutoff:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
