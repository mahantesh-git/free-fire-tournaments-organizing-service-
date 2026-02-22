import { getTenantModel } from '../utils/tenantModel.js';
import duoSchema from '../models/tenant/Duo.js';

// Register a duo team with 2 players
export const registerDuo = async (req, res) => {
    try {
        const { teamName, players, tournamentId } = req.body;

        if (!teamName || !players || players.length !== 2) {
            return res.status(400).json({
                error: 'Team name and exactly 2 players are required'
            });
        }

        // Validate Tournament Mode
        const Tournament = getTenantModel(req.tenantConnection, 'Tournament', (await import('../models/tenant/Tournament.js')).default);
        const tournament = await Tournament.findById(tournamentId);

        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }

        if (tournament.mode !== 'DUO') {
            return res.status(400).json({ error: `This tournament is in ${tournament.mode} mode. Cannot register a duo.` });
        }

        const Duo = getTenantModel(req.tenantConnection, 'Duo', duoSchema);

        // Create the duo with embedded player data
        const duo = new Duo({
            teamName,
            tournamentId,
            players: players.map(p => ({
                playerName: p.playerName,
                ffName: p.ffName,
                ffId: p.ffId,
                map1: 0,
                map2: 0,
                map3: 0,
                total: 0
            })),
            registeredAt: new Date()
        });

        await duo.save();

        // Log duo registration to tournament history
        if (req.historyService && tournamentId) {
            try {
                await req.historyService.addTournamentEvent(
                    tournamentId,
                    'DUO_REGISTERED',
                    {
                        userId: req.tenant?._id,
                        role: 'SYSTEM'
                    },
                    {
                        teamName: teamName,
                        playerCount: players.length
                    }
                );
            } catch (historyError) {
                console.error('Failed to log duo registration:', historyError);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Duo team registered successfully',
            duo
        });
    } catch (error) {
        console.error('Duo registration error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'A duo team with this name already exists in this tournament' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Get all duos (optionally filtered by tournamentId)
export const getDuos = async (req, res) => {
    try {
        const { tournamentId } = req.query;
        const Duo = getTenantModel(req.tenantConnection, 'Duo', duoSchema);

        const query = {};
        if (tournamentId) {
            query.tournamentId = tournamentId;
        }

        const duos = await Duo.find(query).sort({ registeredAt: -1 });
        res.json({ success: true, duos });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a duo team
export const deleteDuo = async (req, res) => {
    try {
        const Duo = getTenantModel(req.tenantConnection, 'Duo', duoSchema);
        const duo = await Duo.findByIdAndDelete(req.params.id);
        if (!duo) {
            return res.status(404).json({ error: 'Duo team not found' });
        }
        res.json({ success: true, message: 'Duo team deleted', duo });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Bulk import duos from parsed XLSX data
export const bulkImportDuos = async (req, res) => {
    try {
        const { duos: duoData, tournamentId } = req.body;

        if (!duoData || !Array.isArray(duoData) || duoData.length === 0) {
            return res.status(400).json({ error: 'No duo data provided' });
        }

        // Validate Tournament Mode
        const Tournament = getTenantModel(req.tenantConnection, 'Tournament', (await import('../models/tenant/Tournament.js')).default);
        const tournament = await Tournament.findById(tournamentId);

        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        if (tournament.mode !== 'DUO') {
            return res.status(400).json({ error: `This tournament is in ${tournament.mode} mode. Cannot import duos.` });
        }

        const Duo = getTenantModel(req.tenantConnection, 'Duo', duoSchema);
        const imported = [];
        const errors = [];

        for (let i = 0; i < duoData.length; i++) {
            const d = duoData[i];
            try {
                if (!d.teamName || !d.players || d.players.length !== 2) {
                    errors.push({ index: i, teamName: d.teamName, error: 'Must have exactly 2 players' });
                    continue;
                }

                const duo = new Duo({
                    teamName: d.teamName,
                    tournamentId,
                    players: d.players.map(p => ({
                        playerName: p.playerName,
                        ffName: p.ffName,
                        ffId: p.ffId,
                        map1: 0, map2: 0, map3: 0, total: 0
                    })),
                    registeredAt: new Date()
                });

                await duo.save();
                imported.push(duo);
            } catch (err) {
                errors.push({ index: i, teamName: d.teamName, error: err.message });
            }
        }

        res.status(201).json({
            success: true,
            message: `Imported ${imported.length} duo teams. ${errors.length} errors.`,
            imported: imported.length,
            errors
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
