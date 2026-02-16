import express from 'express';
import mongoose from 'mongoose';
import killsSchema from '../models/tenant/Kills.js';
import squadSchema from '../models/tenant/Squad.js';
import squadGameStateSchema from '../models/tenant/SquadGameState.js';
import squadLeaderboardSchema from '../models/tenant/SquadLeaderboard.js';
import gameStateSchema from '../models/tenant/GameState.js';
import { getTenantModel } from '../utils/tenantModel.js';
import multer from 'multer';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

import tournamentSchema from '../models/tenant/Tournament.js';

const router = express.Router();

// Use absolute path for uploads to avoid relative path issues
const upload = multer({ dest: path.join(process.cwd(), 'uploads/') });

const getModels = (req) => ({
    Kills: getTenantModel(req.tenantConnection, 'Kills', killsSchema),
    Squad: getTenantModel(req.tenantConnection, 'Squad', squadSchema),
    SquadGameState: getTenantModel(req.tenantConnection, 'SquadGameState', squadGameStateSchema),
    SquadLeaderboard: getTenantModel(req.tenantConnection, 'SquadLeaderboard', squadLeaderboardSchema),
    GameState: getTenantModel(req.tenantConnection, 'GameState', gameStateSchema),
    Tournament: getTenantModel(req.tenantConnection, 'Tournament', tournamentSchema)
});

// Register a new player
router.post('/playerRegister', async (req, res) => {
    try {
        const { Kills } = getModels(req);
        const { playerName, ffName, ffId, tournamentId } = req.body;

        if (!playerName || !ffName || !ffId || !tournamentId) {
            return res.status(400).json({ message: 'Missing player data or tournament ID' });
        }

        // Validate Tournament Mode
        const Tournament = getTenantModel(req.tenantConnection, 'Tournament', (await import('../models/tenant/Tournament.js')).default);
        const tournament = await Tournament.findById(tournamentId);

        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }

        if (tournament.mode !== 'SOLO') {
            return res.status(400).json({ error: `This tournament is in ${tournament.mode} mode. Individual registration not allowed.` });
        }

        const player = new Kills({ playerName, ffName, ffId, tournamentId });
        await player.save();
        res.status(201).json({ message: 'Player registered successfully', player });
    } catch (err) {
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            const message = field === 'playerName'
                ? 'Player Name already registered in this tournament'
                : 'Free Fire ID already registered in this tournament';
            return res.status(400).json({ message });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get all players for a tournament
router.get('/getPlayers', async (req, res) => {
    try {
        const { Kills } = getModels(req);
        const { tournamentId, matchNumber } = req.query;

        const query = tournamentId ? { tournamentId } : {};
        // If tournamentId is missing, it might return all (legacy) or nothing. 
        // For now, let's keep it optional but in frontend we will enforce it.

        const players = await Kills.find(query).sort({ timestamp: -1 }).lean();

        // 2. Fetch Leaderboards to get historical tournament stats
        const { SquadLeaderboard, SquadGameState } = getModels(req);

        // If specific match requested, we might skip historical totals or return them as baseline
        const leaderboards = await SquadLeaderboard.find(tournamentId ? { tournamentId } : {}).lean();

        // 3. FETCH: Include match kills/status from SquadGameState
        const matchFilter = {
            tournamentId: tournamentId ? new mongoose.Types.ObjectId(tournamentId) : { $exists: true }
        };

        // Find max match number for this tournament to help UI dynamic listing
        const allMatchesForTournament = await SquadGameState.find({
            tournamentId: tournamentId ? new mongoose.Types.ObjectId(tournamentId) : { $exists: true }
        }).select('matchNumber').lean();
        const maxMatch = allMatchesForTournament.reduce((max, m) => Math.max(max, m.matchNumber || 0), 0);

        if (matchNumber) {
            matchFilter.matchNumber = parseInt(matchNumber);
        } else {
            // Overall view: include active, recently DQ'd, OR COMPLETED (for current match)
            // This ensures "Eliminated" status shows up for the ongoing/latest match
            matchFilter.$or = [
                { isActive: true },
                { isDisqualified: true },
                { isCompleted: true, matchNumber: maxMatch }
            ];
        }

        const activeMatches = await SquadGameState.find(matchFilter).sort({ updatedAt: -1 }).lean();

        // 4. MERGE DATA
        players.forEach(player => {
            // BASELINE: Overall tournament stats (only for "Overall" view)
            let baselineKills = 0;
            let baselinePoints = 0;
            if (!matchNumber) {
                leaderboards.forEach(lb => {
                    const lbPlayer = lb.playerStats?.find(ps => ps.ffId === player.ffId);
                    if (lbPlayer) {
                        baselineKills += (lbPlayer.totalKills || 0);
                        baselinePoints += (lbPlayer.totalIndividualPoints || 0);
                    }
                });
            }

            player.total = baselineKills;
            player.totalPoints = baselinePoints;

            // 5. Find match data
            // If matchNumber is provided, we use the specific match found
            // If matchNumber is NOT provided (Overall), we find current active match first, fall back to recently disqualified ones
            let targetMatch;
            if (matchNumber) {
                targetMatch = activeMatches.find(m =>
                    m.players && m.players.some(p => p.ffId === player.ffId)
                );
            } else {
                targetMatch = activeMatches.find(m =>
                    m.isActive && m.players && m.players.some(p => p.ffId === player.ffId)
                );
                if (!targetMatch) {
                    targetMatch = activeMatches.find(m =>
                        m.players && m.players.some(p => p.ffId === player.ffId)
                    );
                }
            }

            if (targetMatch) {
                const matchPlayer = targetMatch.players.find(p => p.ffId === player.ffId);
                if (matchPlayer) {
                    // For "Overall" view, ONLY add kills if the match is specifically ACTIVE (not finalized/DQ'd)
                    // because finalized ones are already in leaderboard.
                    if (!matchNumber) {
                        if (targetMatch.isActive && matchPlayer.kills > 0) {
                            player.total += matchPlayer.kills;
                            player.totalPoints += (matchPlayer.killPoints || 0) + (matchPlayer.placementPoints || 0);
                        }
                    } else {
                        // For "Match X" view, we show ONLY that match's kills
                        player.total = matchPlayer.kills || 0;
                        player.totalPoints = (matchPlayer.killPoints || 0) + (matchPlayer.placementPoints || 0);
                    }

                    player.isEliminated = matchPlayer.isEliminated;
                    player.isDisqualified = targetMatch.isDisqualified;
                    // Pass placement for UI winner styling
                    player.matchPlacement = targetMatch.squadPlacement || 99;
                }
            }
        });

        res.status(200).json({
            success: true,
            players,
            maxMatch
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update individual AND squad player kills/data (Synced)
router.put('/updateKillsSync', async (req, res) => {
    try {
        const { Kills, Squad } = getModels(req);
        const { ffId, playerName, ffName, map1, map2, map3 } = req.body;

        if (!ffId) return res.status(400).json({ message: 'Free Fire ID (ffId) is required' });

        const updateData = {};
        if (playerName) updateData.playerName = playerName;
        if (ffName) updateData.ffName = ffName;
        if (map1 !== undefined) updateData.map1 = map1;
        if (map2 !== undefined) updateData.map2 = map2;
        if (map3 !== undefined) updateData.map3 = map3;

        if (updateData.map1 !== undefined || updateData.map2 !== undefined || updateData.map3 !== undefined) {
            updateData.total = (updateData.map1 || 0) + (updateData.map2 || 0) + (updateData.map3 || 0);
        }

        // 1. Update Kills model (Upsert if doesn't exist)
        const playerKill = await Kills.findOneAndUpdate(
            { ffId },
            { $set: updateData },
            { new: true, upsert: true }
        );

        // 2. Update all Squads containing this player
        const squadUpdateData = {};
        if (playerName) squadUpdateData["players.$.playerName"] = playerName;
        if (ffName) squadUpdateData["players.$.ffName"] = ffName;
        if (map1 !== undefined) squadUpdateData["players.$.map1"] = map1;
        if (map2 !== undefined) squadUpdateData["players.$.map2"] = map2;
        if (map3 !== undefined) squadUpdateData["players.$.map3"] = map3;
        if (updateData.total !== undefined) squadUpdateData["players.$.total"] = updateData.total;

        await Squad.updateMany(
            { "players.ffId": ffId },
            { $set: squadUpdateData }
        );

        // 3. Recalculate aggregate totalKills for affected squads
        const affectedSquads = await Squad.find({ "players.ffId": ffId });
        for (const squad of affectedSquads) {
            squad.totalKills = squad.players.reduce((sum, p) => sum + (p.total || 0), 0);
            await squad.save();
        }

        // Emit socket update for real-time syncing
        if (req.app.get('io') && req.tenant?.slug) {
            const tenantRoom = req.tenant.slug;
            console.log(`📡 [Socket] Sync update emission to tenant: ${tenantRoom}`);
            req.app.get('io').to(tenantRoom).emit('playerUpdate', { type: 'killsSynced', ffId });
            req.app.get('io').to(tenantRoom).emit('squadUpdate', { type: 'squadKillsUpdated' });
        }

        res.json({ message: 'Kills synced successfully', player: playerKill });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Delete all tournament data (Comprehensive)
router.delete('/deleteAll', async (req, res) => {
    try {
        const { Kills, Squad, SquadGameState, SquadLeaderboard, GameState } = getModels(req);
        await Promise.all([
            Kills.deleteMany({}),
            Squad.deleteMany({}),
            SquadGameState.deleteMany({}),
            SquadLeaderboard.deleteMany({}),
            GameState.deleteMany({}) // Also clear game state (scoring config etc)
        ]);

        // Emit socket update to notify all clients (Scoped to tenant)
        if (req.app.get('io') && req.tenant?.slug) {
            const tenantRoom = req.tenant.slug;
            req.app.get('io').to(tenantRoom).emit('playerUpdate', { type: 'allData cleared' });
            req.app.get('io').to(tenantRoom).emit('squadUpdate', { type: 'allData cleared' });
        }

        res.json({ message: 'All tournament data deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update player (Generic)
router.put('/:id', async (req, res) => {
    try {
        const { Kills, Squad } = getModels(req);
        const { playerName, ffName, ffId } = req.body;
        const player = await Kills.findById(req.params.id);
        if (!player) return res.status(404).json({ message: 'Player not found' });

        const oldFFId = player.ffId;
        if (playerName) player.playerName = playerName;
        if (ffName) player.ffName = ffName;
        if (ffId) player.ffId = ffId;

        await player.save();

        // Sync with squads if FFID changed or names changed
        const squadUpdateData = {};
        if (playerName) squadUpdateData["players.$.playerName"] = playerName;
        if (ffName) squadUpdateData["players.$.ffName"] = ffName;
        if (ffId) squadUpdateData["players.$.ffId"] = ffId;

        await Squad.updateMany(
            { "players.ffId": oldFFId },
            { $set: squadUpdateData }
        );

        // Emit socket update
        if (req.app.get('io')) {
            req.app.get('io').emit('playerUpdate', { type: 'playerUpdated', id: player._id });
        }

        res.json(player);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Free Fire ID already exists' });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Delete player (Already exists at 125, but ensuring it's comprehensive)
router.delete('/:id', async (req, res) => {
    try {
        const { Kills, Squad } = getModels(req);
        const player = await Kills.findByIdAndDelete(req.params.id);
        if (!player) return res.status(404).json({ message: 'Player not found' });

        // Remove player from all squads
        await Squad.updateMany(
            { "players.ffId": player.ffId },
            { $pull: { players: { ffId: player.ffId } } }
        );

        // Emit socket update
        if (req.app.get('io')) {
            req.app.get('io').emit('playerUpdate', { type: 'playerDeleted', id: player._id });
            req.app.get('io').emit('squadUpdate', { type: 'squadMemberRemoved' });
        }

        res.json({ message: 'Player deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Import players/squads from Excel
router.post('/import', upload.single('file'), async (req, res) => {
    try {
        const { Kills, Squad } = getModels(req);
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { tournamentId } = req.body;
        if (!tournamentId) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Tournament ID is required for import' });
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        const Tournament = getTenantModel(req.tenantConnection, 'Tournament', (await import('../models/tenant/Tournament.js')).default);
        const tournament = await Tournament.findById(tournamentId);

        if (!tournament) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'Tournament not found' });
        }

        if (tournament.mode === 'SQUAD') {
            // Group by Squad Name
            const squadsMap = {};
            data.forEach(row => {
                const sName = row.squadName || row['Squad Name'] || row.squadname;
                if (!sName) return;

                if (!squadsMap[sName]) squadsMap[sName] = [];
                squadsMap[sName].push({
                    playerName: row.playerName || row.Username || row.name,
                    ffName: row.ffName || row['FF Name'] || row.ffname,
                    ffId: String(row.ffId || row['FF ID'] || row.ffid || row.ffud)
                });
            });

            const squadsToInsert = [];
            const errors = [];

            for (const [name, players] of Object.entries(squadsMap)) {
                if (players.length !== 4) {
                    errors.push(`Squad "${name}" has ${players.length} players (Required: 4)`);
                    continue;
                }
                squadsToInsert.push({
                    squadName: name,
                    tournamentId,
                    players
                });
            }

            if (errors.length > 0 && squadsToInsert.length === 0) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: 'Validation failed', errors });
            }

            const inserted = await Squad.insertMany(squadsToInsert, { ordered: false }).catch(err => err.insertedDocs || []);

            if (req.file) fs.unlinkSync(req.file.path);
            return res.json({
                message: errors.length > 0 ? "Imported with some errors" : "Squads imported successfully",
                count: inserted.length,
                errors: errors.length > 0 ? errors : undefined
            });

        } else {
            // SOLO MODE
            const formattedData = data.map(row => ({
                playerName: row.playerName || row.Username || row.name,
                ffName: row.ffName || row['FF Name'] || row.ffname,
                ffId: String(row.ffId || row['FF ID'] || row.ffid || row.ffud),
                tournamentId: tournamentId
            })).filter(p => p.playerName && p.ffId);

            const players = await Kills.insertMany(formattedData, { ordered: false }).catch(err => err.insertedDocs || []);

            if (req.file) fs.unlinkSync(req.file.path);
            res.json({
                message: "Players imported successfully",
                count: Array.isArray(players) ? players.length : 0
            });
        }
    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: err.message });
    }
});

// Export players to Excel
router.get('/export', async (req, res) => {
    try {
        const { Kills, Squad, Tournament } = getModels(req);
        const { tournamentId } = req.query;

        if (!tournamentId) {
            return res.status(400).json({ success: false, message: 'Tournament ID is required for export' });
        }

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        let exportData = [];
        const isSquadMode = tournament.mode === 'SQUAD';

        if (isSquadMode) {
            const squads = await Squad.find({ tournamentId }).lean();

            // Build Array of Arrays (AOA) with classification columns and visual gaps
            // We use empty arrays [] for horizontal spacers (rows)
            const rows = [
                ['CATEGORY', 'FIELD NAME'],
                ['SQUAD INFO', 'S.No'],
                ['SQUAD INFO', 'Squad Name'],
                [], // Spacer Row
                ['PLAYER 1', 'Name'], ['PLAYER 1', 'IGN'], ['PLAYER 1', 'UID'],
                [], // Spacer Row
                ['PLAYER 2', 'Name'], ['PLAYER 2', 'IGN'], ['PLAYER 2', 'UID'],
                [], // Spacer Row
                ['PLAYER 3', 'Name'], ['PLAYER 3', 'IGN'], ['PLAYER 3', 'UID'],
                [], // Spacer Row
                ['PLAYER 4', 'Name'], ['PLAYER 4', 'IGN'], ['PLAYER 4', 'UID'],
                [], // Spacer Row
                ['METADATA', 'Registration Date']
            ];

            squads.forEach((s, index) => {
                const colIdx = 2 + (index * 2); // Leave 1 empty column between squads

                rows[0][colIdx] = `SQUAD ${index + 1}`; // Highlight squad in top row
                rows[1][colIdx] = index + 1;
                rows[2][colIdx] = s.squadName;

                for (let i = 0; i < 4; i++) {
                    const p = s.players[i] || {};
                    const startRow = 4 + (i * 4); // Accounts for spacer rows
                    rows[startRow][colIdx] = p.playerName || '';
                    rows[startRow + 1][colIdx] = p.ffName || '';
                    rows[startRow + 2][colIdx] = p.ffId || '';
                }

                rows[20][colIdx] = s.registeredAt ? new Date(s.registeredAt).toLocaleString() : '';
            });

            if (squads.length === 0) {
                // If no data, add a placeholder column
                rows.forEach(r => r.push('No data'));
            }

            const ws = XLSX.utils.aoa_to_sheet(rows);

            // Set Column Widths for professional layout
            ws['!cols'] = [
                { wch: 15 }, // Category
                { wch: 20 }, // Field Name
            ];
            // Add widths for squad columns and spacers
            for (let i = 0; i < squads.length; i++) {
                ws['!cols'].push({ wch: 25 }); // Squad Data column
                ws['!cols'].push({ wch: 2 });  // Spacer column
            }

            return finalizeExport(ws);
        } else {
            const players = await Kills.find({ tournamentId }).lean();
            const exportData = players.map((p, index) => ({
                'S.No': index + 1,
                'Player Name': p.playerName,
                'In-Game Name': p.ffName,
                'Free Fire ID': p.ffId,
                'Registration Date': p.timestamp ? new Date(p.timestamp).toLocaleString() : ''
            }));

            if (exportData.length === 0) {
                exportData.push({
                    'S.No': 1,
                    'Player Name': 'No data',
                    'In-Game Name': '',
                    'Free Fire ID': '',
                    'Registration Date': ''
                });
            }
            const ws = XLSX.utils.json_to_sheet(exportData);
            return finalizeExport(ws);
        }

        async function finalizeExport(ws) {
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, isSquadMode ? "Registered Squads" : "Registered Players");

            const fileName = `${tournament.name.replace(/\s+/g, '_')}_Export_${Date.now()}.xlsx`;
            const filePath = path.join(process.cwd(), 'uploads', fileName);

            if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
            XLSX.writeFile(wb, filePath);

            res.download(filePath, fileName, (err) => {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                if (err) console.error('Download error:', err);
            });
        }
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Squad Registration
router.post('/squadRegister', async (req, res) => {
    try {
        const { Squad } = getModels(req);
        const { squadName, players, tournamentId } = req.body;

        if (!squadName || !squadName.trim()) {
            return res.status(400).json({ success: false, message: 'Squad name is required' });
        }

        if (!players || players.length !== 4) {
            return res.status(400).json({ success: false, message: 'Squad must have exactly 4 players' });
        }

        if (!tournamentId) {
            return res.status(400).json({ success: false, message: 'Tournament ID is required' });
        }

        // Create squad
        const squad = new Squad({
            squadName: squadName.trim(),
            tournamentId,
            players: players.map(p => ({
                playerName: p.playerName.trim(),
                ffName: p.ffName.trim(),
                ffId: p.ffId.trim()
            }))
        });

        await squad.save();

        if (req.app.get('io')) {
            req.app.get('io').emit('squadUpdate', { type: 'squadRegistered', squad });
        }

        res.status(201).json({ success: true, message: 'Squad registered successfully', squad });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all squads
// Get all squads (with tournament filter and Leaderboard data merge)
router.get('/getSquads', async (req, res) => {
    try {
        const { Squad, SquadLeaderboard } = getModels(req);
        const { tournamentId, matchNumber } = req.query;
        const query = tournamentId ? { tournamentId: new mongoose.Types.ObjectId(tournamentId) } : {};

        // 1. Fetch Squads
        const squads = await Squad.find(query).sort({ registeredAt: -1 }).lean();

        if (squads.length === 0) {
            return res.status(200).json([]);
        }

        // 2. Fetch Leaderboards for these squads
        const squadIds = squads.map(s => s._id);
        const leaderboards = await SquadLeaderboard.find({ squadId: { $in: squadIds } }).lean();

        // 3. Merge data (Baseline Leaderboard)
        const mergedSquads = squads.map(squad => {
            // Find leaderboard for this squad (if any)
            const lb = leaderboards.find(l => l.squadId && l.squadId.toString() === squad._id.toString());

            // BASELINE: Only use leaderboard if we are in "Overall" view
            if (lb && !matchNumber) {
                // Map player stats from leaderboard back to squad players
                const updatedPlayers = (squad.players || []).map(p => {
                    const lbPlayer = lb.playerStats?.find(ps => ps.ffId === p.ffId);
                    return {
                        ...p,
                        total: lbPlayer ? (lbPlayer.kills || 0) : (p.total || 0),
                    };
                });

                return {
                    ...squad,
                    totalKills: lb.totalKills || 0,
                    squadPoints: lb.totalPoints || 0,
                    players: updatedPlayers,
                };
            }

            // If match-specific view or no leaderboard data, ensure players array is clean
            // For match-specific, baseline kills is 0
            return {
                ...squad,
                totalKills: 0,
                squadPoints: 0,
                players: (squad.players || []).map(p => ({ ...p, total: 0 }))
            };
        });

        // 4. FETCH: Include match kills from SquadGameState
        const { SquadGameState } = getModels(req);
        const matchFilter = {
            tournamentId: tournamentId ? new mongoose.Types.ObjectId(tournamentId) : { $exists: true }
        };

        // Find max match number for this tournament to help UI dynamic listing
        const allMatchesForTournament = await SquadGameState.find({
            tournamentId: tournamentId ? new mongoose.Types.ObjectId(tournamentId) : { $exists: true }
        }).select('matchNumber').lean();
        const maxMatch = allMatchesForTournament.reduce((max, m) => Math.max(max, m.matchNumber || 0), 0);

        if (matchNumber) {
            matchFilter.matchNumber = parseInt(matchNumber);
        } else {
            // Overall view: include active, recently DQ'd, OR COMPLETED (for current match)
            matchFilter.$or = [
                { isActive: true },
                { isDisqualified: true },
                { isCompleted: true, matchNumber: maxMatch }
            ];
        }

        const activeMatches = await SquadGameState.find(matchFilter).sort({ updatedAt: -1 }).lean();

        const fullyMergedSquads = mergedSquads.map(squad => {
            // Find target match (Match X vs Active/DQ)
            let targetMatch;
            if (matchNumber) {
                targetMatch = activeMatches.find(m => m.squadId && m.squadId.toString() === squad._id.toString());
            } else {
                targetMatch = activeMatches.find(m =>
                    m.isActive && m.squadId && m.squadId.toString() === squad._id.toString()
                );
                if (!targetMatch) {
                    targetMatch = activeMatches.find(m =>
                        m.squadId && m.squadId.toString() === squad._id.toString()
                    );
                }
            }

            if (targetMatch) {
                // ONLY add kills if the match is specifically ACTIVE (not finalized/DQ'd)
                // in the "Overall" view.
                if (!matchNumber) {
                    if (targetMatch.isActive) {
                        // Update squad-level total
                        squad.totalKills = (squad.totalKills || 0) + (targetMatch.totalKills || 0);
                        squad.squadPoints = (squad.squadPoints || 0) + (targetMatch.squadPoints || 0);

                        // Update player-level kills
                        squad.players = squad.players.map(p => {
                            const activePlayer = targetMatch.players?.find(ap => ap.ffId === p.ffId);
                            return {
                                ...p,
                                total: (p.total || 0) + (activePlayer ? activePlayer.kills : 0),
                                isEliminated: activePlayer ? activePlayer.isEliminated : false
                            };
                        });
                    } else {
                        // If match is NOT active (e.g. DQ'd), it's already in the leaderboard.
                        // We just need to merge the real-time STATUS flags
                        squad.players = squad.players.map(p => {
                            const activePlayer = targetMatch.players?.find(ap => ap.ffId === p.ffId);
                            return {
                                ...p,
                                isEliminated: activePlayer ? activePlayer.isEliminated : false
                            };
                        });
                    }
                } else {
                    // For "Match X" view, we show ONLY that match's kills
                    squad.totalKills = targetMatch.totalKills || 0;
                    squad.squadPoints = targetMatch.squadPoints || 0;
                    squad.players = squad.players.map(p => {
                        const activePlayer = targetMatch.players?.find(ap => ap.ffId === p.ffId);
                        return {
                            ...p,
                            total: activePlayer ? activePlayer.kills : 0,
                            isEliminated: activePlayer ? activePlayer.isEliminated : false
                        };
                    });
                }

                return {
                    ...squad,
                    isActiveMatch: true,
                    isCompleted: targetMatch.isCompleted,
                    isDisqualified: targetMatch.isDisqualified,
                    disqualificationReason: targetMatch.disqualificationReason,
                    squadPlacement: targetMatch.squadPlacement
                };
            }
            return squad;
        });

        res.status(200).json({
            success: true,
            squads: fullyMergedSquads,
            maxMatch
        });
    } catch (error) {
        console.error('Error fetching squads:', error);
        res.status(500).json({ success: false, message: 'Error fetching squads' });
    }
});

// Update squad player kills
router.put('/updateSquadPlayerKills', async (req, res) => {
    try {
        const { Squad } = getModels(req);
        const { squadId, ffId, map1, map2, map3 } = req.body;
        const squad = await Squad.findById(squadId);
        if (!squad) return res.status(404).json({ success: false, message: 'Squad not found' });

        const playerIndex = squad.players.findIndex(p => p.ffId === ffId);
        if (playerIndex === -1) return res.status(404).json({ success: false, message: 'Player not found in squad' });

        squad.players[playerIndex].map1 = map1;
        squad.players[playerIndex].map2 = map2;
        squad.players[playerIndex].map3 = map3;
        squad.players[playerIndex].total = map1 + map2 + map3;

        await squad.save();

        if (req.app.get('io')) {
            req.app.get('io').emit('squadUpdate', { type: 'squadPlayerKillsUpdated', squadId: squad._id });
        }

        res.json({ success: true, message: 'Squad player kills updated successfully', squad });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete squad
router.delete('/deleteSquad/:squadId', async (req, res) => {
    try {
        const { Squad } = getModels(req);
        const squad = await Squad.findByIdAndDelete(req.params.squadId);
        if (!squad) return res.status(404).json({ success: false, message: 'Squad not found' });

        if (req.app.get('io')) {
            req.app.get('io').emit('squadUpdate', { type: 'squadDeleted', squadId: req.params.squadId });
        }

        res.json({ success: true, message: 'Squad deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
