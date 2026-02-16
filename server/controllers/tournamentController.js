import tournamentSchema from '../models/tenant/Tournament.js';
import { getTenantModel } from '../utils/tenantModel.js';

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

// Get Tournament by ID
export const getTournamentById = async (req, res) => {
    try {
        const Tournament = getTenantModel(req.tenantConnection, 'Tournament', tournamentSchema);
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
        res.json({ success: true, tournament });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Tournament
export const updateTournament = async (req, res) => {
    try {
        const Tournament = getTenantModel(req.tenantConnection, 'Tournament', tournamentSchema);
        const tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, tournament });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'A tournament with this name already exists' });
        }
        res.status(500).json({ error: error.message });
    }
};

export const deleteTournament = async (req, res) => {
    try {
        const Tournament = getTenantModel(req.tenantConnection, 'Tournament', tournamentSchema);
        await Tournament.findByIdAndDelete(req.params.id);
        // TODO: Cleanup rooms?
        res.json({ success: true, message: 'Tournament deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
