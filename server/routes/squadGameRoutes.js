import express from 'express';
import mongoose from 'mongoose';
import squadGameStateSchema from '../models/tenant/SquadGameState.js';
import squadLeaderboardSchema from '../models/tenant/SquadLeaderboard.js';
import squadSchema from '../models/tenant/Squad.js';
import tournamentSchema from '../models/tenant/Tournament.js';
import gameStateSchema from '../models/tenant/GameState.js';
import roomSchema from '../models/tenant/Room.js';
import killsSchema from '../models/tenant/Kills.js'; // Use Kills schema for Players in SOLO mode
import { getTenantModel } from '../utils/tenantModel.js';
import { checkKillUpdateAuth, validateSquadAccess } from '../middlewares/authMiddleware.js';
import HistoryService from '../services/historyService.js';

const router = express.Router();

const getModels = (req) => ({
    SquadGameState: getTenantModel(req.tenantConnection, 'SquadGameState', squadGameStateSchema),
    SquadLeaderboard: getTenantModel(req.tenantConnection, 'SquadLeaderboard', squadLeaderboardSchema),
    Squad: getTenantModel(req.tenantConnection, 'Squad', squadSchema),
    GameState: getTenantModel(req.tenantConnection, 'GameState', gameStateSchema),
    Tournament: getTenantModel(req.tenantConnection, 'Tournament', tournamentSchema),
    Room: getTenantModel(req.tenantConnection, 'Room', roomSchema),
    Player: getTenantModel(req.tenantConnection, 'Kills', killsSchema) // Use Kills model as Player source
});

// Helper to finalize a squad match (used by manual button and auto-elimination)
const finalizeSquadMatch = async (req, gameStateId, providedPlacement = null) => {
    const { SquadGameState, SquadLeaderboard, GameState, Room, Tournament } = getModels(req);

    // 1. Fetch the squad being finalized
    const gameState = await SquadGameState.findById(gameStateId);
    if (!gameState || !gameState.isActive) {
        console.log(`⚠️ finalizeSquadMatch: GameState ${gameStateId} not found or already completed.`);
        return null;
    }

    // 2. Find the room to get all participating squads/players
    // Check both 'squads' and 'players' arrays
    let room = await Room.findOne({ squads: gameState.squadId });
    if (!room) {
        // Try finding by player ID (SOLO mode)
        room = await Room.findOne({ players: gameState.squadId });
    }

    if (!room) {
        console.error(`❌ [Rank Error] No room found for squad/player ${gameState.squadId}`);
        return null;
    }

    // Determine if we should look at squads or players based on room mode
    const participantsList = room.mode === 'SOLO' ? room.players : room.squads;

    // 3. Robust Ranking Logic: 
    // Your rank is the number of squads that were still "alive" (isActive) when you were eliminated.
    const activeStates = await SquadGameState.find({
        squadId: { $in: participantsList },
        matchNumber: gameState.matchNumber,
        isActive: true,
        isDisqualified: false
    });

    let placement = providedPlacement || activeStates.length;

    console.log(`📊 [Dynamic Ranking] Squad: ${gameState.squadName}, Active: ${activeStates.length} => Rank: ${placement}`);

    const activeGlobalState = await GameState.findOne({ active: true });
    const tournament = await Tournament.findById(gameState.tournamentId);
    gameState.squadPlacement = placement;
    gameState.completeMatch(tournament?.settings || (activeGlobalState ? activeGlobalState.scoringConfig : null));
    await gameState.save();

    // 4. Update Leaderboard
    let leaderboard = await SquadLeaderboard.findOne({ squadId: gameState.squadId });
    if (!leaderboard) {
        leaderboard = new SquadLeaderboard({
            squadId: gameState.squadId,
            tournamentId: gameState.tournamentId,
            squadName: gameState.squadName,
            playerStats: []
        });
    }
    leaderboard.updateFromMatch(gameState);
    await leaderboard.save();

    // 5. Emit Socket for this squad
    if (req.app.get('io')) {
        req.app.get('io').to(req.tenant.slug).emit('squadUpdate', {
            type: 'matchComplete',
            squadId: gameState.squadId,
            gameStateId: gameState._id,
            data: { rank: gameState.squadPlacement, points: gameState.squadPoints }
        });
    }

    // 6. AUTO-CROWN: If only ONE squad remains active, they are the Winner (Rank 1)
    const survivors = await SquadGameState.find({
        squadId: { $in: participantsList },
        matchNumber: gameState.matchNumber,
        isActive: true,
        isDisqualified: false
    });

    if (survivors.length === 1) {
        const winner = survivors[0];
        console.log(`🏆 [Auto-Crown] Last squad standing: ${winner.squadName}. Finalizing as Rank 1.`);

        winner.squadPlacement = 1;
        winner.squadPlacement = 1;
        winner.completeMatch(tournament?.settings || (activeGlobalState ? activeGlobalState.scoringConfig : null));
        await winner.save();

        // Update Winner Leaderboard
        let winLeaderboard = await SquadLeaderboard.findOne({ squadId: winner.squadId });
        if (!winLeaderboard) {
            winLeaderboard = new SquadLeaderboard({
                squadId: winner.squadId,
                tournamentId: winner.tournamentId,
                squadName: winner.squadName,
                playerStats: []
            });
        }
        winLeaderboard.updateFromMatch(winner);
        await winLeaderboard.save();

        // Emit winner event
        if (req.app.get('io')) {
            req.app.get('io').to(req.tenant.slug).emit('squadUpdate', {
                type: 'matchComplete',
                squadId: winner.squadId,
                gameStateId: winner._id,
                data: { rank: 1, points: winner.squadPoints, isWinner: true }
            });
        }

        // 7. Update Room Status to COMPLETED
        room.status = 'COMPLETED';
        await room.save();

        // 8. CAPTURE MATCH HISTORY
        try {
            if (req.historyService) {
                // Get all match participants
                const allMatchStates = await SquadGameState.find({
                    squadId: { $in: participantsList },
                    matchNumber: gameState.matchNumber
                }).sort({ squadPlacement: 1 });

                const matchStartTime = allMatchStates.reduce((earliest, state) => {
                    return !earliest || state.startTime < earliest ? state.startTime : earliest;
                }, null);

                const matchHistoryData = {
                    tournamentId: room.tournamentId,
                    roomId: room._id,
                    matchNumber: gameState.matchNumber,
                    mode: room.mode,
                    startedAt: matchStartTime || new Date(),
                    completedAt: new Date(),
                    participants: allMatchStates.map(state => ({
                        squadId: state.squadId,
                        squadName: state.squadName,
                        finalRank: state.squadPlacement || 99,
                        totalKills: state.totalKills,
                        totalPoints: state.squadPoints,
                        eliminatedAt: state.endTime,
                        isDisqualified: state.isDisqualified,
                        disqualificationReason: state.disqualificationReason,
                        players: state.players.map(p => ({
                            playerId: p.playerId,
                            playerName: p.playerName,
                            ffName: p.ffName,
                            ffId: p.ffId,
                            kills: p.kills,
                            killPoints: p.killPoints,
                            placementPoints: p.placementPoints,
                            isEliminated: p.isEliminated
                        }))
                    })),
                    winner: {
                        squadId: winner.squadId,
                        squadName: winner.squadName,
                        totalPoints: winner.squadPoints
                    },
                    moderatorId: req.moderator?._id,
                    scoringConfig: activeGlobalState?.scoringConfig
                };

                await req.historyService.createMatchHistory(matchHistoryData);
                console.log(`📚 Match history saved for Room ${room.roomName} - Match ${gameState.matchNumber}`);

                // 8.1 Update Tournament Statistics
                const totalKillsInMatch = matchHistoryData.participants.reduce((sum, p) => sum + (p.totalKills || 0), 0);
                const tournyHistory = await req.historyService.TournamentHistory.findOne({ tournamentId: room.tournamentId });
                if (tournyHistory) {
                    await req.historyService.updateTournamentStats(room.tournamentId, {
                        totalMatches: (tournyHistory.statistics?.totalMatches || 0) + 1,
                        totalKills: (tournyHistory.statistics?.totalKills || 0) + totalKillsInMatch
                    });

                    // Add timeline event
                    await req.historyService.addTournamentEvent(
                        room.tournamentId,
                        'MATCH_COMPLETED',
                        { userId: req.tenant._id, role: 'SYSTEM' },
                        { matchNumber: gameState.matchNumber, roomName: room.name, winner: winner.squadName }
                    );
                }
            }
        } catch (historyError) {
            console.error('❌ Failed to save match history/stats:', historyError);
        }
    }

    // 9. CHECK IF MATCH IS FULLY COMPLETE (No survivors left = This was the winner/last squad)
    // This handles the case where the user manually "Crowns Winner" (finalizing the last squad),
    // which results in 0 active survivors, skipping the block above.
    if (survivors.length === 0) {
        console.log(`🏆 [Match Finalized] Last squad ${gameState.squadName} completed. Match Over.`);

        // Update Room Status to COMPLETED
        room.status = 'COMPLETED';
        await room.save();

        if (req.historyService) {
            try {
                // Get all match participants for this match
                const allMatchStates = await SquadGameState.find({
                    squadId: { $in: participantsList },
                    matchNumber: gameState.matchNumber
                }).sort({ squadPlacement: 1 });

                const matchStartTime = allMatchStates.reduce((earliest, state) => {
                    return !earliest || state.startTime < earliest ? state.startTime : earliest;
                }, null);

                const matchHistoryData = {
                    tournamentId: room.tournamentId,
                    roomId: room._id,
                    matchNumber: gameState.matchNumber,
                    mode: room.mode,
                    startedAt: matchStartTime || new Date(),
                    completedAt: new Date(),
                    participants: allMatchStates.map(state => ({
                        squadId: state.squadId,
                        squadName: state.squadName,
                        finalRank: state.squadPlacement || 99,
                        totalKills: state.totalKills,
                        totalPoints: state.squadPoints,
                        eliminatedAt: state.endTime,
                        isDisqualified: state.isDisqualified,
                        disqualificationReason: state.disqualificationReason,
                        players: state.players.map(p => ({
                            playerId: p.playerId,
                            playerName: p.playerName,
                            ffName: p.ffName,
                            ffId: p.ffId,
                            kills: p.kills,
                            killPoints: p.killPoints,
                            placementPoints: p.placementPoints,
                            isEliminated: p.isEliminated
                        }))
                    })),
                    winner: {
                        squadId: gameState.squadId, // The one just finalized is the winner if Rank 1
                        squadName: gameState.squadName,
                        totalPoints: gameState.squadPoints
                    },
                    moderatorId: req.moderator?._id,
                    scoringConfig: activeGlobalState?.scoringConfig
                };

                // Only save if it was truly a win (Rank 1) or just the last squad?
                if (gameState.squadPlacement === 1) {
                    await req.historyService.createMatchHistory(matchHistoryData);
                    console.log(`📚 Match history saved (Manual Win) for Room ${room.roomName} - Match ${gameState.matchNumber}`);

                    // Update Tournament Statistics
                    const totalKillsInMatch = matchHistoryData.participants.reduce((sum, p) => sum + (p.totalKills || 0), 0);
                    const tournyHistory = await req.historyService.TournamentHistory.findOne({ tournamentId: room.tournamentId });
                    if (tournyHistory) {
                        await req.historyService.updateTournamentStats(room.tournamentId, {
                            totalMatches: (tournyHistory.statistics?.totalMatches || 0) + 1,
                            totalKills: (tournyHistory.statistics?.totalKills || 0) + totalKillsInMatch
                        });

                        // Add timeline event
                        await req.historyService.addTournamentEvent(
                            room.tournamentId,
                            'MATCH_COMPLETED',
                            { userId: req.tenant._id, role: 'SYSTEM' },
                            { matchNumber: gameState.matchNumber, roomName: room.name, winner: gameState.squadName }
                        );
                    }
                }
            } catch (historyError) {
                console.error('❌ Failed to save match history/stats (Manual Win):', historyError);
            }
        }
    }

    return { gameState, leaderboard };
};

// ============================================
// SQUAD GAME STATE ROUTES
// ============================================

/**
 * POST /api/squadGame/startMatch
 * Start a new match for a squad
 */
router.post('/startMatch', async (req, res) => {
    try {
        const { Squad, SquadGameState } = getModels(req);
        const { squadId, matchNumber } = req.body;

        // Get squad details
        const squad = await Squad.findById(squadId);
        if (!squad) {
            return res.status(404).json({
                success: false,
                message: 'Squad not found'
            });
        }

        // Create game state
        const gameState = new SquadGameState({
            squadId: squad._id,
            squadName: squad.squadName,
            matchNumber: matchNumber || 1,
            players: squad.players.map(player => ({
                playerId: player.ffId,
                playerName: player.playerName,
                ffName: player.ffName,
                ffId: player.ffId,
                kills: 0,
                assists: 0,
                damage: 0,
                survived: false,
                revives: 0
            }))
        });

        await gameState.save();

        // Emit socket for new match
        if (req.app.get('io') && req.tenant?.slug) {
            console.log(`📡 [Socket] Match started emission to tenant: ${req.tenant.slug}`);
            req.app.get('io').to(req.tenant.slug).emit('squadUpdate', {
                type: 'matchStarted',
                matchNumber: gameState.matchNumber,
                gameStateId: gameState._id
            });
        }
        res.status(201).json({
            success: true,
            message: 'Match started successfully',
            gameState
        });

    } catch (error) {
        console.error('Error starting match:', error);
        res.status(500).json({
            success: false,
            message: 'Error starting match',
            error: error.message
        });
    }
});


/**
 * POST /api/squadGame/startRoomMatch
 * Start a new match for all squads/players in a room
 */
router.post('/startRoomMatch', async (req, res) => {
    try {
        const { Squad, SquadGameState, Room, Player } = getModels(req);
        const { roomId, matchNumber } = req.body;

        if (!roomId) {
            return res.status(400).json({ success: false, message: 'Room ID is required' });
        }

        // 1. Get the Room
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }

        const createdGameStates = [];
        console.log(`🚀 startRoomMatch: Starting match ${matchNumber || 1} for Room ${roomId} (Mode: ${room.mode})`);

        if (room.mode === 'SOLO') {
            // --- SOLO MODE LOGIC ---
            // Fetch players from room.players (which contains IDs from Kills collection)
            const players = await Player.find({ _id: { $in: room.players } });

            // Cleanup missing players? Maybe later. For now, trust the list.
            if (players.length === 0 && room.players.length > 0) {
                console.warn(`⚠️ Room ${roomId} has IDs but no players found in DB.`);
            }

            for (const player of players) {
                // Check if game state already exists
                const existingState = await SquadGameState.findOne({
                    squadId: player._id, // Use Player ID as Squad ID for SOLO
                    matchNumber: matchNumber || 1,
                    roomId: roomId
                });

                if (existingState) {
                    createdGameStates.push(existingState);
                    continue;
                }

                const gameState = new SquadGameState({
                    squadId: player._id,
                    roomId: room._id,
                    tournamentId: room.tournamentId,
                    squadName: player.playerName || player.ffName || 'Unknown Player',
                    matchNumber: matchNumber || 1,
                    isActive: true, // Mark active
                    isCompleted: false,
                    players: [{
                        playerId: player.ffId, // Must be string
                        playerName: player.playerName,
                        ffName: player.ffName,
                        ffId: player.ffId,
                        kills: 0,
                        assists: 0,
                        damage: 0,
                        survived: false,
                        revives: 0
                    }]
                });

                await gameState.save();
                createdGameStates.push(gameState);
            }

        } else {
            // --- SQUAD MODE LOGIC (Existing) ---
            // 2. Fetch full squad details and CLEAN UP room.squads if any are missing
            const squads = await Squad.find({ _id: { $in: room.squads } });

            // Safety: If some squads in room.squads are missing from Squads collection, 
            // they cause persistent mismatch. Let's filter squads array to only existing ones.
            const validSquadIds = squads.map(s => s._id.toString());
            const originalCount = room.squads.length;
            room.squads = room.squads.filter(id => validSquadIds.includes(id.toString()));

            if (room.squads.length !== originalCount) {
                console.log(`🧹 cleaned up ${originalCount - room.squads.length} dead squads from room ${roomId}`);
                await room.save();
            }

            // 3. Create SquadGameState for each squad
            for (const squad of squads) {
                // Check if game state already exists for this match & squad
                const existingState = await SquadGameState.findOne({
                    squadId: squad._id,
                    matchNumber: matchNumber || 1,
                    roomId: roomId
                });

                if (existingState) {
                    console.log(`⚠️ startRoomMatch: Found EXISTING state for squad ${squad._id} in room ${roomId}`);
                    createdGameStates.push(existingState);
                    continue;
                }

                const gameState = new SquadGameState({
                    squadId: squad._id,
                    roomId: room._id,
                    tournamentId: room.tournamentId,
                    squadName: squad.squadName,
                    matchNumber: matchNumber || 1,
                    isActive: true, // Mark active
                    isCompleted: false,
                    players: squad.players.map(player => ({
                        playerId: player.ffId,
                        playerName: player.playerName,
                        ffName: player.ffName,
                        ffId: player.ffId,
                        kills: 0,
                        assists: 0,
                        damage: 0,
                        survived: false,
                        revives: 0
                    }))
                });

                await gameState.save();
                createdGameStates.push(gameState);
            }
        }

        // 4. Update Room Status to ONGOING
        room.status = 'ONGOING';
        await room.save();

        // Emit socket for room match start
        if (req.app.get('io') && req.tenant?.slug) {
            console.log(`📡 [Socket] Room match started emission to tenant: ${req.tenant.slug}`);
            req.app.get('io').to(req.tenant.slug).emit('squadUpdate', {
                type: 'roomMatchStarted',
                roomId: room._id,
                matchNumber: matchNumber || 1,
                count: createdGameStates.length
            });
        }

        res.status(201).json({
            success: true,
            message: `Match ${matchNumber || 1} initialized for ${createdGameStates.length} entities`,
            gameStates: createdGameStates,
            count: createdGameStates.length
        });

    } catch (error) {
        console.error('Error starting room match:', error);
        res.status(500).json({
            success: false,
            message: 'Error starting room match',
            error: error.message
        });
    }
});






/**
 * GET /api/squadGame/roomMatchState/:roomId
 * Get match state for all squads in a room
 */
router.get('/roomMatchState/:roomId', async (req, res) => {
    try {
        const { SquadGameState, Room, Tournament } = getModels(req);
        const { roomId } = req.params;
        const { matchNumber } = req.query;

        // Populate squads so we have access to squad details if needed (for cleanup check)
        // But for SOLO, 'squads' field is empty, 'players' is populated
        const room = await Room.findById(roomId).populate('squads').lean();
        if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

        let gameStates = [];

        if (room.mode === 'SOLO') {
            // SOLO MODE: Use room.players (which are IDs)
            if (!room.players || room.players.length === 0) {
                return res.json({ success: true, gameStates: [], room });
            }

            gameStates = await SquadGameState.find({
                squadId: { $in: room.players }, // Here squadId refers to Player ID
                matchNumber: matchNumber || 1
            }).lean();
            // Note: We do NOT populate 'squadId' here because it points to 'Squad' collection, 
            // but our IDs are from 'Kills' collection.

        } else {
            // SQUAD MODE: Existing logic
            // Filter out any squads that failed to populate (missing from collection)
            const originalSquads = room.squads || [];
            room.squads = originalSquads.filter(s => s !== null);

            if (!room.squads || room.squads.length === 0) {
                return res.json({ success: true, gameStates: [], room });
            }

            // Optimize: Use .lean() for faster read
            gameStates = await SquadGameState.find({
                squadId: { $in: room.squads.map(s => s._id) },
                matchNumber: matchNumber || 1
            }).populate('squadId').lean();
        }

        const tournament = await Tournament.findById(room.tournamentId).lean();

        res.json({
            success: true,
            gameStates,
            room,
            tournament
        });
    } catch (error) {
        console.error('Error fetching room match state:', error);
        res.status(500).json({ success: false, message: 'Error fetching room match state' });
    }
});


/**
 * PUT /api/squadGame/updateKills/:gameStateId
 * Update kills for a player in a match
 * Protected: Requires organizer or assigned moderator access
 */
router.put('/updateKills/:gameStateId',
    checkKillUpdateAuth,
    async (req, res) => {
        try {
            const { SquadGameState, GameState, Room, Tournament } = getModels(req);
            const { gameStateId } = req.params;
            const { ffId, kills } = req.body;

            // Robust validation for ObjectId to prevent CastError
            if (!mongoose.Types.ObjectId.isValid(gameStateId)) {
                return res.status(400).json({
                    success: false,
                    message: gameStateId.startsWith('pending-')
                        ? 'Match has not started yet. Deploy squads first!'
                        : 'Invalid Match ID'
                });
            }

            const gameState = await SquadGameState.findById(gameStateId);
            if (!gameState) {
                return res.status(404).json({
                    success: false,
                    message: 'Game state not found'
                });
            }

            // Check moderator squad access (Direct assignment OR Room assignment)
            if (req.isModerator) {
                const hasDirectAccess = req.assignedSquads.some(
                    id => id.toString() === gameState.squadId.toString()
                );

                let hasRoomAccess = false;
                if (!hasDirectAccess && req.assignedRooms && req.assignedRooms.length > 0) {
                    let room = await Room.findOne({
                        squads: gameState.squadId,
                        _id: { $in: req.assignedRooms }
                    });
                    if (!room) {
                        room = await Room.findOne({
                            players: gameState.squadId,
                            _id: { $in: req.assignedRooms }
                        });
                    }
                    if (room) hasRoomAccess = true;
                }

                if (!hasDirectAccess && !hasRoomAccess) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to update this squad'
                    });
                }
            }

            if (!gameState.isActive) {
                return res.status(400).json({
                    success: false,
                    message: 'Match is already completed'
                });
            }

            if (gameState.isDisqualified) {
                return res.status(403).json({
                    success: false,
                    message: 'This squad is disqualified and cannot receive updates'
                });
            }

            // Find player
            const player = gameState.players.find(p => p.ffId === ffId);
            if (!player) {
                return res.status(404).json({
                    success: false,
                    message: 'Player not found in this squad'
                });
            }

            // CHECK: Prevent updates if player is eliminated OR squad is completed/disqualified
            if (player.isEliminated) {
                return res.status(403).json({
                    success: false,
                    message: 'Player is eliminated and kills cannot be updated'
                });
            }

            player.kills = kills;
            gameState.calculateTotalKills();

            // Recalculate points (uses internal fallbacks if no config provided)
            const activeGame = await GameState.findOne({ active: true });
            const tournament = await Tournament.findById(gameState.tournamentId);
            gameState.calculateSquadPoints(tournament?.settings || (activeGame ? activeGame.scoringConfig : null));

            console.log(`📊 Recalculated Points for ${gameState.squadName}:`, {
                totalKills: gameState.totalKills,
                squadPoints: gameState.squadPoints,
                playerKills: player.kills,
                playerKillPoints: player.killPoints
            });

            await gameState.save();

            // Emit socket event scoped to tenant
            if (req.app.get('io')) {
                const tenantSlug = req.tenant.slug;
                console.log(`📢 Emitting killUpdate to tenant: ${tenantSlug}, squad: ${gameState.squadId}`);
                req.app.get('io').to(tenantSlug).emit('squadUpdate', {
                    type: 'killUpdate',
                    squadId: gameState.squadId,
                    gameStateId: gameState._id,
                    data: {
                        ffId,
                        kills: player.kills,
                        killPoints: player.killPoints,
                        placementPoints: player.placementPoints,
                        totalKills: gameState.totalKills,
                        squadPoints: gameState.squadPoints
                    }
                });
            }

            res.json({
                success: true,
                message: 'Kills updated successfully',
                gameState
            });

        } catch (error) {
            console.error('Error updating kills:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating kills'
            });
        }
    });


/**
 * PUT /api/squadGame/togglePlayerElimination/:gameStateId
 * Mark a player as eliminated or active
 */
router.put('/togglePlayerElimination/:gameStateId',
    checkKillUpdateAuth,
    async (req, res) => {
        try {
            const { SquadGameState, GameState, Room, Tournament } = getModels(req);
            const { gameStateId } = req.params;
            const { ffId, isEliminated } = req.body;

            // Robust validation for ObjectId to prevent CastError
            if (!mongoose.Types.ObjectId.isValid(gameStateId)) {
                return res.status(400).json({
                    success: false,
                    message: gameStateId.startsWith('pending-')
                        ? 'Match has not started yet. Deploy squads first!'
                        : 'Invalid Match ID'
                });
            }

            const gameState = await SquadGameState.findById(gameStateId);
            if (!gameState) {
                return res.status(404).json({ success: false, message: 'Game state not found' });
            }

            // Check moderator access (Direct assignment OR Room assignment)
            if (req.isModerator) {
                const hasDirectAccess = req.assignedSquads.some(id => id.toString() === gameState.squadId.toString());

                let hasRoomAccess = false;
                if (!hasDirectAccess && req.assignedRooms && req.assignedRooms.length > 0) {
                    let room = await Room.findOne({
                        squads: gameState.squadId,
                        _id: { $in: req.assignedRooms }
                    });
                    if (!room) {
                        room = await Room.findOne({
                            players: gameState.squadId,
                            _id: { $in: req.assignedRooms }
                        });
                    }
                    if (room) hasRoomAccess = true;
                }

                if (!hasDirectAccess && !hasRoomAccess) {
                    return res.status(403).json({ success: false, message: 'No permission to update this squad' });
                }
            }

            if (!gameState.isActive || gameState.isDisqualified) {
                return res.status(400).json({ success: false, message: 'Match status prevents updates' });
            }

            const player = gameState.players.find(p => p.ffId === ffId);
            if (!player) {
                return res.status(404).json({ success: false, message: 'Player not found' });
            }

            player.isEliminated = isEliminated;

            // Recalculate points to reflect individual breakdown
            const activeGame = await GameState.findOne({ active: true });
            const tournament = await Tournament.findById(gameState.tournamentId);
            gameState.calculateSquadPoints(tournament?.settings || (activeGame ? activeGame.scoringConfig : null));

            await gameState.save();

            // CHECK: Auto-eliminate squad if ALL players are eliminated
            let autoCompleted = false;
            let finalizedResult = null;
            if (isEliminated) {
                const hasPlayers = (gameState.players || []).length > 0;
                const allPlayersEliminated = hasPlayers && gameState.players.every(p => p.isEliminated);

                if (allPlayersEliminated) {
                    console.log(`🎯 Auto-finalizing squad ${gameState.squadName} - All players eliminated`);
                    finalizedResult = await finalizeSquadMatch(req, gameStateId);
                    autoCompleted = true;
                }
            }

            // Emit sync (only if not already emitted by auto-complete)
            if (!autoCompleted && req.app.get('io')) {
                req.app.get('io').to(req.tenant.slug).emit('squadUpdate', {
                    type: 'playerStatsUpdate',
                    squadId: gameState.squadId,
                    gameStateId: gameState._id,
                    data: { ffId, isEliminated: player.isEliminated, kills: player.kills }
                });
            }

            res.json({
                success: true,
                message: autoCompleted ? `Player eliminated and Squad Finalized` : `Player ${isEliminated ? 'eliminated' : 'restored'}`,
                gameState: autoCompleted ? finalizedResult.gameState : gameState,
                autoCompleted
            });

        } catch (error) {
            console.error('Error toggling player elimination:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });


router.put('/disqualify/:gameStateId',
    checkKillUpdateAuth,
    async (req, res) => {
        try {
            const { SquadGameState, SquadLeaderboard, Room, GameState } = getModels(req);
            const { gameStateId } = req.params;
            const { reason } = req.body;

            // Robust validation for ObjectId to prevent CastError
            if (!mongoose.Types.ObjectId.isValid(gameStateId)) {
                return res.status(400).json({
                    success: false,
                    message: gameStateId.startsWith('pending-')
                        ? 'Match has not started yet. Deploy squads first!'
                        : 'Invalid Match ID'
                });
            }

            const gameState = await SquadGameState.findById(gameStateId);
            if (!gameState) {
                return res.status(404).json({ success: false, message: 'Game state not found' });
            }

            // Check moderator squad access (Direct assignment OR Room assignment)
            if (req.isModerator) {
                const hasDirectAccess = req.assignedSquads.some(
                    id => id.toString() === gameState.squadId.toString()
                );

                let hasRoomAccess = false;
                if (!hasDirectAccess && req.assignedRooms && req.assignedRooms.length > 0) {
                    let room = await Room.findOne({
                        squads: gameState.squadId,
                        _id: { $in: req.assignedRooms }
                    });
                    if (!room) {
                        room = await Room.findOne({
                            players: gameState.squadId,
                            _id: { $in: req.assignedRooms }
                        });
                    }
                    if (room) hasRoomAccess = true;
                }

                if (!hasDirectAccess && !hasRoomAccess) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to disqualify this squad'
                    });
                }
            }

            if (!gameState.isActive) {
                return res.status(400).json({ success: false, message: 'Match is already completed' });
            }

            // 1. Finalize match state as Disqualified
            gameState.disqualifySquad(reason);
            await gameState.save();

            // 2. Update Leaderboard (will receive 0 points due to isDisqualified logic)
            let leaderboard = await SquadLeaderboard.findOne({ squadId: gameState.squadId });
            if (!leaderboard) {
                leaderboard = new SquadLeaderboard({
                    squadId: gameState.squadId,
                    tournamentId: gameState.tournamentId,
                    squadName: gameState.squadName,
                    playerStats: []
                });
            }
            leaderboard.updateFromMatch(gameState);
            await leaderboard.save();

            // 3. AUTO-CROWN check: If only ONE squad remains active, finalize them as Rank 1
            let room = await Room.findOne({ squads: gameState.squadId });
            if (!room) {
                room = await Room.findOne({ players: gameState.squadId });
            }

            if (room) {
                const participantsList = room.mode === 'SOLO' ? room.players : room.squads;
                const survivors = await SquadGameState.find({
                    squadId: { $in: participantsList },
                    matchNumber: gameState.matchNumber,
                    isActive: true,
                    isDisqualified: false
                });

                if (survivors.length === 1) {
                    const winner = survivors[0];
                    console.log(`🏆 [Auto-Crown from DQ] Last squad standing: ${winner.squadName}. Finalizing as Rank 1.`);

                    const activeGlobalState = await GameState.findOne({ active: true });
                    winner.squadPlacement = 1;
                    winner.completeMatch(activeGlobalState ? activeGlobalState.scoringConfig : null);
                    await winner.save();

                    // Update Winner Leaderboard
                    let winLeaderboard = await SquadLeaderboard.findOne({ squadId: winner.squadId });
                    if (!winLeaderboard) {
                        winLeaderboard = new SquadLeaderboard({
                            squadId: winner.squadId,
                            tournamentId: winner.tournamentId,
                            squadName: winner.squadName,
                            playerStats: []
                        });
                    }
                    winLeaderboard.updateFromMatch(winner);
                    await winLeaderboard.save();

                    // Emit winner event
                    if (req.app.get('io')) {
                        req.app.get('io').to(req.tenant.slug).emit('squadUpdate', {
                            type: 'matchComplete',
                            squadId: winner.squadId,
                            gameStateId: winner._id,
                            data: { rank: 1, points: winner.squadPoints, isWinner: true }
                        });
                    }
                }
            }

            // 4. Emit socket event for the DQ'd squad
            if (req.app.get('io')) {
                const tenantSlug = req.tenant.slug;
                req.app.get('io').to(tenantSlug).emit('squadUpdate', {
                    type: 'disqualified',
                    squadId: gameState.squadId,
                    gameStateId: gameState._id,
                    data: {
                        reason: gameState.disqualificationReason,
                        leaderboardId: leaderboard._id
                    }
                });
            }

            res.json({
                success: true,
                message: 'Squad disqualified and match finalized',
                gameState,
                leaderboard
            });
        } catch (error) {
            console.error('Error disqualifying squad:', error);
            res.status(500).json({ success: false, message: 'Error disqualifying squad' });
        }
    });

/**
 * PUT /api/squadGame/revoke-disqualify/:gameStateId
 * Revoke disqualification for a squad
 * Protected: Organizer only
 */
router.put('/revoke-disqualify/:gameStateId',
    checkKillUpdateAuth,
    async (req, res) => {
        try {
            const { SquadGameState, SquadLeaderboard } = getModels(req);
            const { gameStateId } = req.params;

            // Restrict to Organizer only as per requirement
            if (req.isModerator) {
                return res.status(403).json({
                    success: false,
                    message: 'Only organizers can revoke disqualifications'
                });
            }

            const gameState = await SquadGameState.findById(gameStateId);
            if (!gameState) {
                return res.status(404).json({ success: false, message: 'Game state not found' });
            }

            if (!gameState.isDisqualified) {
                return res.status(400).json({ success: false, message: 'Squad is not disqualified' });
            }

            // 1. Revert Leaderboard impact of the DQ
            let leaderboard = await SquadLeaderboard.findOne({ squadId: gameState.squadId });
            if (leaderboard) {
                // If it was already completed/DQ'd, it would have been added to leaderboard
                leaderboard.revertFromMatch(gameState);
                await leaderboard.save();
            }

            // 2. Revoke disqualification
            gameState.revokeDisqualification();
            await gameState.save();

            // 3. Identify and Revert any Auto-Crowned Winner
            // If this DQ led to an auto-crown, there will be exactly one squad in this room/match
            // that is Rank 1 and completed.
            const winners = await SquadGameState.find({
                roomId: gameState.roomId,
                matchNumber: gameState.matchNumber,
                squadPlacement: 1,
                isActive: false,
                isCompleted: true,
                isDisqualified: false // Winner is not DQ'd
            });

            let revertedWinner = null;
            if (winners.length > 0) {
                const winner = winners[0];

                // a. Revert Winner Leaderboard
                const { SquadLeaderboard: LeaderboardModel, Room } = getModels(req);
                const winnerLeaderboard = await LeaderboardModel.findOne({
                    squadId: winner.squadId,
                    tournamentId: winner.tournamentId
                });
                if (winnerLeaderboard) {
                    winnerLeaderboard.revertFromMatch(winner);
                    await winnerLeaderboard.save();
                }

                // b. Revert Winner GameState
                winner.revertMatch();
                await winner.save();
                revertedWinner = winner;

                // c. Delete Match History (since the match is no longer finished)
                const historyService = new HistoryService(req.tenantConnection);
                await historyService.deleteMatchHistory(gameState.roomId, gameState.matchNumber);

                // d. Revert Room Status
                await Room.findByIdAndUpdate(gameState.roomId, { status: 'ONGOING' });
            }

            // 4. Emit socket event
            if (req.app.get('io')) {
                const tenantSlug = req.tenant.slug;
                req.app.get('io').to(tenantSlug).emit('squadUpdate', {
                    type: 'dqRevoked',
                    squadId: gameState.squadId,
                    gameStateId: gameState._id,
                    data: {
                        isDisqualified: false,
                        revertedWinnerId: revertedWinner?._id
                    }
                });
                // Also trigger a general refresh to update the UI
                req.app.get('io').to(tenantSlug).emit('squadUpdate', { type: 'matchReopened' });
            }

            res.json({
                success: true,
                message: 'Disqualification revoked. Match re-opened.',
                gameState,
                revertedWinner
            });
        } catch (error) {
            console.error('Error revoking disqualification:', error);
            res.status(500).json({ success: false, message: 'Error revoking disqualification' });
        }
    });


/**
 * PUT /api/squadGame/updatePlayerStats/:gameStateId
 * Update all stats for a player
 */
router.put('/updatePlayerStats/:gameStateId', async (req, res) => {
    try {
        const { SquadGameState } = getModels(req);
        const { gameStateId } = req.params;
        const { ffId, kills, assists, damage, survived, revives } = req.body;

        const gameState = await SquadGameState.findById(gameStateId);
        if (!gameState) {
            return res.status(404).json({
                success: false,
                message: 'Game state not found'
            });
        }

        if (!gameState.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Match is already completed'
            });
        }

        if (gameState.isDisqualified) {
            return res.status(403).json({
                success: false,
                message: 'This squad is disqualified and cannot receive updates'
            });
        }

        const player = gameState.players.find(p => p.ffId === ffId);
        if (!player) {
            return res.status(404).json({
                success: false,
                message: 'Player not found in this squad'
            });
        }

        // Update player stats
        if (kills !== undefined) player.kills = kills;
        if (assists !== undefined) player.assists = assists;
        if (damage !== undefined) player.damage = damage;
        if (survived !== undefined) player.survived = survived;
        if (revives !== undefined) player.revives = revives;

        gameState.calculateTotalKills();
        await gameState.save();

        // Emit socket event scoped to tenant
        if (req.app.get('io')) {
            const tenantSlug = req.tenant.slug;
            console.log(`📢 Emitting statsUpdate to tenant: ${tenantSlug}`);
            req.app.get('io').to(tenantSlug).emit('squadUpdate', {
                type: 'statsUpdate',
                squadId: gameState.squadId,
                gameStateId: gameState._id
            });
        }

        res.json({
            success: true,
            message: 'Player stats updated successfully',
            gameState
        });

    } catch (error) {
        console.error('Error updating player stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating player stats'
        });
    }
});


/**
 * PUT /api/squadGame/completeMatch/:gameStateId
 * Complete a match and update leaderboard
 */
router.put('/completeMatch/:gameStateId', async (req, res) => {
    try {
        const { gameStateId } = req.params;
        const { squadPlacement, placement } = req.body || {};
        const finalPlacement = squadPlacement || placement;

        // Robust validation for ObjectId to prevent CastError
        if (!mongoose.Types.ObjectId.isValid(gameStateId)) {
            return res.status(400).json({
                success: false,
                message: gameStateId.startsWith('pending-')
                    ? 'Match has not started yet. Deploy squads first!'
                    : 'Invalid Match ID'
            });
        }

        const result = await finalizeSquadMatch(req, gameStateId, finalPlacement);

        if (!result) {
            return res.status(404).json({ success: false, message: 'Game state not found or already completed' });
        }

        res.json({
            success: true,
            message: `Squad eliminated. Assigned Rank: ${result.gameState.squadPlacement}`,
            gameState: result.gameState,
            leaderboard: result.leaderboard
        });

    } catch (error) {
        console.error('Error completing match:', error);
        res.status(500).json({
            success: false,
            message: 'Error completing match',
            error: error.message
        });
    }
});


/**
 * GET /api/squadGame/activeMatches
 * Get all active matches
 */
router.get('/activeMatches', async (req, res) => {
    try {
        const { SquadGameState } = getModels(req);
        const activeMatches = await SquadGameState.find({ isActive: true })
            .populate('squadId')
            .sort({ startTime: -1 });

        res.json({
            success: true,
            count: activeMatches.length,
            matches: activeMatches
        });

    } catch (error) {
        console.error('Error fetching active matches:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching active matches'
        });
    }
});


/**
 * GET /api/squadGame/matchHistory/:squadId
 * Get match history for a squad
 */
router.get('/matchHistory/:squadId', async (req, res) => {
    try {
        const { SquadGameState } = getModels(req);
        const { squadId } = req.params;

        const matches = await SquadGameState.find({
            squadId,
            isCompleted: true
        }).sort({ endTime: -1 });

        res.json({
            success: true,
            count: matches.length,
            matches
        });

    } catch (error) {
        console.error('Error fetching match history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching match history'
        });
    }
});


/**
 * GET /api/squadGame/leaderboard
 * Get squad leaderboard (sorted by total points)
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const { SquadLeaderboard } = getModels(req);
        const leaderboard = await SquadLeaderboard.find()
            .sort({ totalPoints: -1 })
            .populate('squadId');

        res.json({
            success: true,
            count: leaderboard.length,
            leaderboard
        });

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leaderboard'
        });
    }
});


/**
 * GET /api/squadGame/squadStats/:squadId
 * Get detailed stats for a squad
 */
router.get('/squadStats/:squadId', async (req, res) => {
    try {
        const { SquadLeaderboard } = getModels(req);
        const { squadId } = req.params;

        const leaderboard = await SquadLeaderboard.findOne({ squadId })
            .populate('squadId');

        if (!leaderboard) {
            return res.status(404).json({
                success: false,
                message: 'No stats found for this squad'
            });
        }

        res.json({
            success: true,
            stats: leaderboard
        });

    } catch (error) {
        console.error('Error fetching squad stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching squad stats'
        });
    }
});


/**
 * DELETE /api/squadGame/deleteMatch/:gameStateId
 * Delete a match (ADMIN only - optional)
 */
router.delete('/deleteMatch/:gameStateId', async (req, res) => {
    try {
        const { SquadGameState } = getModels(req);
        const gameState = await SquadGameState.findByIdAndDelete(req.params.gameStateId);

        if (!gameState) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }

        res.json({
            success: true,
            message: 'Match deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting match:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting match'
        });
    }
});

/**
 * GET /api/squadGame/tournamentHistory/:tournamentId
 * Get comprehensive match history for a tournament
 */
router.get('/tournamentHistory/:tournamentId', async (req, res) => {
    try {
        const { SquadGameState } = getModels(req);
        const { tournamentId } = req.params;

        // Fetch all completed games for this tournament
        // Optimize: Select only necessary fields for the list view
        console.log(`📜 Fetching history for tournament: ${tournamentId}`);
        const history = await SquadGameState.find({
            tournamentId,
            isCompleted: true
        })
            .sort({ createdAt: -1 }) // Newest first
            .limit(100) // Limit to last 100 entries for performance
            .lean();

        console.log(`📜 Found ${history.length} history records.`);

        res.json({
            success: true,
            history
        });
    } catch (error) {
        console.error('Error fetching tournament history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tournament history'
        });
    }
});

/**
 * GET /api/squadGame/fix-history/:tournamentId
 * Temporary helper to backfill tournamentId on old orphaned game states
 */
router.get('/fix-history/:tournamentId', async (req, res) => {
    try {
        const { SquadGameState } = getModels(req);
        const { tournamentId } = req.params;

        // Find game states with missing tournamentId
        const result = await SquadGameState.updateMany(
            { tournamentId: { $exists: false } },
            { $set: { tournamentId: tournamentId, isCompleted: true } } // Assume old ones are completed
        );

        res.json({
            success: true,
            message: `Fixed ${result.modifiedCount} old match records.`,
            result
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
