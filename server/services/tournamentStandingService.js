import { getTenantModel } from '../utils/tenantModel.js';
import tournamentSchema from '../models/tenant/Tournament.js';
import roomSchema from '../models/tenant/Room.js';
import squadGameStateSchema from '../models/tenant/SquadGameState.js';
import tournamentStandingSchema from '../models/tenant/TournamentStanding.js';
import tournamentHistorySchema from '../models/tenant/TournamentHistory.js';

/**
 * Service to compute and persist Tournament Standings across all rooms.
 * Aggregates multi-room, multi-match results according to tournament scoring rules.
 */
export const calculateTournamentStanding = async ({
    tenantConnection,
    tournamentId,
    forceSave = false,
    historyService = null,
    io = null,
    tenantSlug = null,
    performedBy = null
}) => {
    if (!tenantConnection) {
        throw new Error('Tenant database connection is required');
    }
    if (!tournamentId) {
        throw new Error('Tournament ID is required');
    }

    const Tournament = getTenantModel(tenantConnection, 'Tournament', tournamentSchema);
    const Room = getTenantModel(tenantConnection, 'Room', roomSchema);
    const SquadGameState = getTenantModel(tenantConnection, 'SquadGameState', squadGameStateSchema);
    const TournamentStanding = getTenantModel(tenantConnection, 'TournamentStanding', tournamentStandingSchema);
    const TournamentHistory = getTenantModel(tenantConnection, 'TournamentHistory', tournamentHistorySchema);

    // 1. Fetch tournament details
    const tournament = await Tournament.findById(tournamentId).lean();
    if (!tournament) {
        throw new Error(`Tournament not found for ID: ${tournamentId}`);
    }

    // 2. Fetch all rooms for this tournament
    const rooms = await Room.find({ tournamentId }).sort({ roomNumber: 1 }).lean();
    const roomMap = new Map(rooms.map(r => [r._id.toString(), r]));
    const roomIds = rooms.map(r => r._id);

    // 3. Check for any active (in-progress) matches across rooms
    const activeIncompleteCount = await SquadGameState.countDocuments({
        $or: [
            { tournamentId },
            { roomId: { $in: roomIds } }
        ],
        isActive: true,
        isCompleted: false,
        isDisqualified: false
    });

    // 4. Fetch all game states for this tournament across all rooms and rounds
    const gameStates = await SquadGameState.find({
        $or: [
            { tournamentId },
            { roomId: { $in: roomIds } }
        ]
    }).sort({ matchNumber: 1, createdAt: 1 }).lean();

    // 5. Determine if all matches in all rooms are completed
    // Conditions for all matches over:
    // a. There is at least 1 room and each room has status === 'COMPLETED'
    // b. Each room has played at least one match (matchesPlayed > 0 or has gameStates)
    // c. There are NO active / incomplete game states
    const hasRooms = rooms.length > 0;
    const hasGameStates = gameStates.length > 0;
    const hasAllGameStatesCompleted = hasGameStates && activeIncompleteCount === 0;

    const allRoomsCompleted = hasRooms &&
        rooms.every(r => r.status === 'COMPLETED' && (r.matchesPlayed > 0 || gameStates.some(gs => gs.roomId?.toString() === r._id.toString()))) &&
        activeIncompleteCount === 0;

    const isAllMatchesOver = allRoomsCompleted || (hasAllGameStatesCompleted && (rooms.length === 0 || rooms.every(r => r.status === 'COMPLETED')));

    // 6. Resolve tournament scoring settings
    const rankingMetric = tournament.settings?.rankingSort || 'POINTS';
    const killPointsMultiplier = tournament.settings?.killPoints !== undefined ? tournament.settings.killPoints : 1;

    let placementPointsMap = {};
    if (tournament.settings?.placementPoints) {
        placementPointsMap = tournament.settings.placementPoints instanceof Map
            ? Object.fromEntries(tournament.settings.placementPoints)
            : tournament.settings.placementPoints;
    } else {
        placementPointsMap = { 1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0 };
    }

    const distinctMatches = Array.from(new Set(gameStates.map(gs => gs.matchNumber).filter(Boolean))).sort((a, b) => a - b);

    // 7. Rooms summary
    const roomsSummary = rooms.map(r => {
        const roomGameStates = gameStates.filter(gs => gs.roomId?.toString() === r._id.toString());
        const rMatches = Array.from(new Set(roomGameStates.map(gs => gs.matchNumber).filter(Boolean)));
        return {
            roomId: r._id,
            roomNumber: r.roomNumber,
            roomName: r.name || `Room ${r.roomNumber}`,
            matchesPlayed: rMatches.length || r.matchesPlayed || 0,
            status: r.status
        };
    });

    // 8. Aggregate Player Standings (All modes including SOLO)
    const playerMap = new Map();

    gameStates.forEach(gs => {
        const mNum = gs.matchNumber || 1;
        const isMatchWin = gs.squadPlacement === 1;
        const r = gs.roomId ? roomMap.get(gs.roomId.toString()) : null;
        const roomName = r ? (r.name || `Room ${r.roomNumber}`) : 'Room';

        (gs.players || []).forEach(p => {
            const key = p.ffId ? String(p.ffId) : (p.playerId ? String(p.playerId) : String(p._id));
            if (!key) return;

            if (!playerMap.has(key)) {
                playerMap.set(key, {
                    ffId: p.ffId || '',
                    playerId: p.playerId || '',
                    playerName: p.playerName || p.ffName || 'Unknown Player',
                    ffName: p.ffName || p.playerName || '',
                    teamName: gs.squadName || '',
                    squadId: gs.squadId,
                    roomId: gs.roomId || null,
                    roomName: roomName,
                    matchesPlayedSet: new Set(),
                    matchBreakdown: {}, // { [matchNumber]: kills }
                    matchPointsBreakdown: {}, // { [matchNumber]: points }
                    totalKills: 0,
                    totalDamage: 0,
                    killPoints: 0,
                    placementPoints: 0,
                    totalPoints: 0,
                    booyahs: 0,
                    bestPlacement: 999,
                    isDisqualified: gs.isDisqualified || false
                });
            }

            const playerEntry = playerMap.get(key);
            playerEntry.matchesPlayedSet.add(mNum);

            const kills = Number(p.kills) || 0;
            playerEntry.totalKills += kills;
            playerEntry.totalDamage += (Number(p.damage) || 0);
            playerEntry.matchBreakdown[mNum] = (playerEntry.matchBreakdown[mNum] || 0) + kills;

            if (isMatchWin) {
                playerEntry.booyahs += 1;
            }

            if (gs.squadPlacement && gs.squadPlacement < playerEntry.bestPlacement) {
                playerEntry.bestPlacement = gs.squadPlacement;
            }

            if (gs.isDisqualified) {
                playerEntry.isDisqualified = true;
            }

            let pKillPoints = p.killPoints !== undefined ? Number(p.killPoints) : kills * killPointsMultiplier;
            let pPlacePoints = p.placementPoints !== undefined ? Number(p.placementPoints) : 0;

            // Fallback for placement points if not directly stored on player subdoc
            if (pPlacePoints === 0 && gs.squadPlacement && placementPointsMap[gs.squadPlacement]) {
                const squadPlayerCount = gs.players?.length || 1;
                pPlacePoints = Number((placementPointsMap[gs.squadPlacement] / squadPlayerCount).toFixed(2));
            }

            playerEntry.killPoints += pKillPoints;
            playerEntry.placementPoints += pPlacePoints;
            const roundPoints = pKillPoints + pPlacePoints;
            playerEntry.matchPointsBreakdown[mNum] = (playerEntry.matchPointsBreakdown[mNum] || 0) + roundPoints;
            playerEntry.totalPoints += roundPoints;
        });
    });

    const playerRankings = Array.from(playerMap.values()).map(p => ({
        ...p,
        matchesPlayed: p.matchesPlayedSet.size,
        matchesPlayedSet: undefined,
        killPoints: parseFloat(p.killPoints.toFixed(2)),
        placementPoints: parseFloat(p.placementPoints.toFixed(2)),
        totalPoints: parseFloat(p.totalPoints.toFixed(2)),
        bestPlacement: p.bestPlacement === 999 ? null : p.bestPlacement
    }));

    // 9. Aggregate Team Standings (SQUAD, DUO, CLASH_SQUAD, CUSTOM only — empty for SOLO)
    let teamRankings = [];

    if (tournament.mode !== 'SOLO') {
        const teamMap = new Map();

        gameStates.forEach(gs => {
            const sId = gs.squadId ? String(gs.squadId) : null;
            if (!sId) return;

            const mNum = gs.matchNumber || 1;
            const isMatchWin = gs.squadPlacement === 1;
            const r = gs.roomId ? roomMap.get(gs.roomId.toString()) : null;
            const roomName = r ? (r.name || `Room ${r.roomNumber}`) : 'Room';

            if (!teamMap.has(sId)) {
                teamMap.set(sId, {
                    squadId: gs.squadId,
                    squadName: gs.squadName || 'Unknown Team',
                    roomId: gs.roomId || null,
                    roomName: roomName,
                    matchesPlayedSet: new Set(),
                    matchBreakdown: {}, // { [matchNumber]: { kills, placementPoints, points, placement, roomName } }
                    booyahs: 0,
                    totalKills: 0,
                    placementPoints: 0,
                    totalPoints: 0,
                    bestPlacement: 999,
                    isDisqualified: gs.isDisqualified || false,
                    disqualificationReason: gs.disqualificationReason || null,
                    playerMap: new Map()
                });
            }

            const teamEntry = teamMap.get(sId);
            teamEntry.matchesPlayedSet.add(mNum);

            const kills = Number(gs.totalKills) || 0;
            teamEntry.totalKills += kills;

            if (isMatchWin) {
                teamEntry.booyahs += 1;
            }

            if (gs.squadPlacement && gs.squadPlacement < teamEntry.bestPlacement) {
                teamEntry.bestPlacement = gs.squadPlacement;
            }

            if (gs.isDisqualified) {
                teamEntry.isDisqualified = true;
                teamEntry.disqualificationReason = gs.disqualificationReason || 'Rule violation';
            }

            const placePts = gs.squadPlacement && placementPointsMap[gs.squadPlacement]
                ? Number(placementPointsMap[gs.squadPlacement])
                : 0;
            teamEntry.placementPoints += placePts;

            const matchPts = gs.squadPoints !== undefined && gs.squadPoints !== 0
                ? Number(gs.squadPoints)
                : (kills * killPointsMultiplier) + placePts;
            teamEntry.totalPoints += matchPts;

            teamEntry.matchBreakdown[mNum] = {
                kills,
                placementPoints: placePts,
                points: matchPts,
                placement: gs.squadPlacement || null,
                roomName: roomName
            };

            (gs.players || []).forEach(p => {
                const pKey = p.ffId ? String(p.ffId) : (p.playerName || 'p');
                if (!teamEntry.playerMap.has(pKey)) {
                    teamEntry.playerMap.set(pKey, {
                        playerId: p.playerId || '',
                        playerName: p.playerName || p.ffName || 'Player',
                        ffName: p.ffName || p.playerName || '',
                        ffId: p.ffId || '',
                        totalKills: 0,
                        totalDamage: 0,
                        totalPoints: 0
                    });
                }
                const playerSub = teamEntry.playerMap.get(pKey);
                playerSub.totalKills += (Number(p.kills) || 0);
                playerSub.totalDamage += (Number(p.damage) || 0);
                const pRoundPts = (p.killPoints !== undefined ? Number(p.killPoints) : (Number(p.kills) || 0) * killPointsMultiplier) +
                    (p.placementPoints !== undefined ? Number(p.placementPoints) : 0);
                playerSub.totalPoints += pRoundPts;
            });
        });

        teamRankings = Array.from(teamMap.values()).map(t => ({
            ...t,
            matchesPlayed: t.matchesPlayedSet.size,
            matchesPlayedSet: undefined,
            placementPoints: parseFloat(t.placementPoints.toFixed(2)),
            totalPoints: parseFloat(t.totalPoints.toFixed(2)),
            bestPlacement: t.bestPlacement === 999 ? null : t.bestPlacement,
            players: Array.from(t.playerMap.values()).map(p => ({
                ...p,
                totalPoints: parseFloat(p.totalPoints.toFixed(2))
            })),
            playerMap: undefined
        }));
    }

    // 10. Robust Sorting & Tie-breaking
    const sortStandings = (a, b) => {
        // Disqualified always rank at the bottom
        if (a.isDisqualified && !b.isDisqualified) return 1;
        if (!a.isDisqualified && b.isDisqualified) return -1;

        if (rankingMetric === 'KILLS') {
            // Primary: totalKills desc
            if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
            // Tiebreaker 1: totalPoints desc
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            // Tiebreaker 2: booyahs desc
            if (b.booyahs !== a.booyahs) return b.booyahs - a.booyahs;
            // Tiebreaker 3: bestPlacement asc (1 is better than 2)
            const placeA = a.bestPlacement || 999;
            const placeB = b.bestPlacement || 999;
            if (placeA !== placeB) return placeA - placeB;
            // Final fallback: alphabetical by name
            const nameA = a.squadName || a.playerName || '';
            const nameB = b.squadName || b.playerName || '';
            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        } else {
            // Primary: totalPoints desc
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            // Tiebreaker 1: totalKills desc
            if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
            // Tiebreaker 2: booyahs desc
            if (b.booyahs !== a.booyahs) return b.booyahs - a.booyahs;
            // Tiebreaker 3: bestPlacement asc (1 is better than 2)
            const placeA = a.bestPlacement || 999;
            const placeB = b.bestPlacement || 999;
            if (placeA !== placeB) return placeA - placeB;
            // Final fallback: alphabetical by name
            const nameA = a.squadName || a.playerName || '';
            const nameB = b.squadName || b.playerName || '';
            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        }
    };

    playerRankings.sort(sortStandings);
    teamRankings.sort(sortStandings);

    // 11. Assign Ranks (handling ties and 'DQ')
    const assignRanks = (list) => {
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (item.isDisqualified) {
                item.rank = 'DQ';
                continue;
            }

            if (i > 0 && !list[i - 1].isDisqualified) {
                const prev = list[i - 1];
                const isTie = rankingMetric === 'KILLS'
                    ? (prev.totalKills === item.totalKills &&
                        prev.totalPoints === item.totalPoints &&
                        prev.booyahs === item.booyahs &&
                        prev.bestPlacement === item.bestPlacement)
                    : (prev.totalPoints === item.totalPoints &&
                        prev.totalKills === item.totalKills &&
                        prev.booyahs === item.booyahs &&
                        prev.bestPlacement === item.bestPlacement);

                item.rank = isTie ? prev.rank : (i + 1);
            } else {
                item.rank = 1;
            }
        }
    };

    assignRanks(playerRankings);
    assignRanks(teamRankings);

    // 12. Build Standing Record
    const standingData = {
        tournamentId: tournament._id,
        tournamentName: tournament.name,
        mode: tournament.mode,
        rankingMetric,
        killPointsMultiplier,
        placementPointsMap,
        totalRooms: rooms.length,
        totalMatchesPlayed: distinctMatches.length,
        playedMatchNumbers: distinctMatches,
        roomsSummary,
        teamRankings,
        playerRankings,
        isComplete: isAllMatchesOver,
        generatedAt: new Date()
    };

    let standingDoc = null;

    // 13. Persist to DB when tournament is completed OR forceSave is requested
    if (isAllMatchesOver || forceSave) {
        standingDoc = await TournamentStanding.findOneAndUpdate(
            { tournamentId: tournament._id },
            { $set: standingData },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // 14. If all matches are over, ensure Tournament status is set to COMPLETED
        if (isAllMatchesOver) {
            if (tournament.status !== 'COMPLETED') {
                await Tournament.findByIdAndUpdate(tournament._id, { status: 'COMPLETED' });
                console.log(`🏆 Tournament "${tournament.name}" status updated to COMPLETED!`);
            }

            // 15. Record in Tournament History timeline if not already recorded
            try {
                const tournyHistory = await TournamentHistory.findOne({ tournamentId: tournament._id });
                if (tournyHistory) {
                    const alreadyLogged = tournyHistory.timeline?.some(e => e.event === 'COMPLETED');
                    if (!alreadyLogged) {
                        const topWinnerName = tournament.mode === 'SOLO'
                            ? (playerRankings[0]?.playerName || 'Unknown')
                            : (teamRankings[0]?.squadName || 'Unknown');

                        tournyHistory.timeline.push({
                            timestamp: new Date(),
                            event: 'COMPLETED',
                            performedBy: performedBy || { role: 'SYSTEM' },
                            details: new Map([
                                ['totalRooms', rooms.length],
                                ['totalMatches', distinctMatches.length],
                                ['winner', topWinnerName],
                                ['rankingMetric', rankingMetric]
                            ])
                        });
                        tournyHistory.status = 'COMPLETED';
                        await tournyHistory.save();
                        console.log(`📚 Timeline event "COMPLETED" added to tournament history for: ${tournament.name}`);
                    }
                }
            } catch (histErr) {
                console.error('Failed to log tournament completion in history:', histErr);
            }
        }
    }

    // 16. Real-time Socket Notification
    if (io && tenantSlug) {
        io.to(tenantSlug).emit('tournamentStandingsUpdated', {
            tournamentId: tournament._id,
            isComplete: isAllMatchesOver,
            standing: standingData
        });

        if (isAllMatchesOver) {
            io.to(tenantSlug).emit('tournamentCompleted', {
                tournamentId: tournament._id,
                winner: tournament.mode === 'SOLO' ? playerRankings[0] : teamRankings[0],
                standing: standingData
            });
        }
    }

    return {
        success: true,
        isComplete: isAllMatchesOver,
        activeIncompleteCount,
        standing: standingDoc ? standingDoc.toObject() : standingData
    };
};

/**
 * Check if all rooms in a tournament have completed their matches.
 * If yes, triggers calculation and persistence of the official Tournament Standings.
 */
export const checkAndTriggerTournamentStanding = async ({
    tenantConnection,
    tournamentId,
    historyService,
    io,
    tenantSlug,
    performedBy
}) => {
    try {
        if (!tenantConnection || !tournamentId) return null;

        const Room = getTenantModel(tenantConnection, 'Room', roomSchema);
        const SquadGameState = getTenantModel(tenantConnection, 'SquadGameState', squadGameStateSchema);

        const rooms = await Room.find({ tournamentId }).lean();
        if (rooms.length === 0) return null;

        const activeMatches = await SquadGameState.countDocuments({
            $or: [
                { tournamentId },
                { roomId: { $in: rooms.map(r => r._id) } }
            ],
            isActive: true,
            isCompleted: false,
            isDisqualified: false
        });

        if (activeMatches > 0) {
            console.log(`⏳ Tournament ${tournamentId}: Still has ${activeMatches} active matches in progress.`);
            return { completed: false, activeMatches };
        }

        const allRoomsCompleted = rooms.every(r => r.status === 'COMPLETED' && (r.matchesPlayed > 0 || r.currentMatchNumber > 1));

        if (allRoomsCompleted) {
            console.log(`🏆 [Auto-Standings] All ${rooms.length} rooms completed in tournament ${tournamentId}! Generating official Tournament Standings...`);
            const result = await calculateTournamentStanding({
                tenantConnection,
                tournamentId,
                forceSave: true,
                historyService,
                io,
                tenantSlug,
                performedBy
            });
            return { completed: true, result };
        }

        return { completed: false, roomsPending: rooms.filter(r => r.status !== 'COMPLETED').map(r => r.name) };
    } catch (error) {
        console.error('Error in checkAndTriggerTournamentStanding:', error);
        return { completed: false, error: error.message };
    }
};

