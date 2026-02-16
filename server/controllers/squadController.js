import { getTenantModel } from '../utils/tenantModel.js';
import squadSchema from '../models/tenant/Squad.js';
import killsSchema from '../models/tenant/Kills.js';

// Register a squad with 4 players
export const registerSquad = async (req, res) => {
    try {
        const { squadName, players, tournamentId } = req.body;

        if (!squadName || !players || players.length !== 4) {
            return res.status(400).json({
                error: 'Squad name and exactly 4 players are required'
            });
        }

        // Validate Tournament Mode
        const Tournament = getTenantModel(req.tenantConnection, 'Tournament', (await import('../models/tenant/Tournament.js')).default);
        const tournament = await Tournament.findById(tournamentId);

        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }

        if (tournament.mode !== 'SQUAD') {
            return res.status(400).json({ error: `This tournament is in ${tournament.mode} mode. Cannot register a squad.` });
        }

        const Squad = getTenantModel(req.tenantConnection, 'Squad', squadSchema);

        // Create the squad with embedded player data
        const squad = new Squad({
            squadName,
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

        await squad.save();

        // Log squad registration to tournament history
        if (req.historyService && tournamentId) {
            try {
                await req.historyService.addTournamentEvent(
                    tournamentId,
                    'SQUAD_REGISTERED',
                    {
                        userId: req.tenant?._id,
                        role: 'SYSTEM'
                    },
                    {
                        squadName: squadName,
                        playerCount: players.length
                    }
                );
            } catch (historyError) {
                console.error('Failed to log squad registration:', historyError);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Squad registered successfully',
            squad
        });
    } catch (error) {
        console.error('Squad registration error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get all squads
export const getSquads = async (req, res) => {
    try {
        const Squad = getTenantModel(req.tenantConnection, 'Squad', squadSchema);
        const squads = await Squad.find().populate('players').sort({ registeredAt: -1 });
        res.json({ success: true, squads });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
