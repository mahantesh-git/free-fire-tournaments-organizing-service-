import express from 'express';
import * as roomController from '../controllers/roomController.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';

const router = express.Router();

// Import clearRooms from service to reuse logic if needed, but we need specific Expired logic
import { clearRooms } from '../services/RoomAllocationService.js';
import { getTenantModel } from '../utils/tenantModel.js';
import roomSchema from '../models/tenant/Room.js';
import tournamentSchema from '../models/tenant/Tournament.js';
import squadSchema from '../models/tenant/Squad.js';
import killsSchema from '../models/tenant/Kills.js';
import duoSchema from '../models/tenant/Duo.js';

const getModels = (req) => ({
    Room: getTenantModel(req.tenantConnection, 'Room', roomSchema),
    SquadGameState: getTenantModel(req.tenantConnection, 'SquadGameState', squadGameStateSchema),
    Tournament: getTenantModel(req.tenantConnection, 'Tournament', tournamentSchema),
    Squad: getTenantModel(req.tenantConnection, 'Squad', squadSchema),
    Player: getTenantModel(req.tenantConnection, 'Kills', killsSchema),
    Duo: getTenantModel(req.tenantConnection, 'Duo', duoSchema)
});

router.post('/generate', auditMiddleware('GENERATE_ROOMS', 'ROOM'), roomController.autoAssignRooms);
router.post('/reset', auditMiddleware('RESET_ROOMS', 'ROOM'), roomController.resetRooms);
router.post('/swap', auditMiddleware('SWAP_PARTICIPANT', 'ROOM'), roomController.swapParticipant);
router.post('/lock', auditMiddleware('LOCK_ROOMS', 'ROOM'), roomController.toggleLockRooms);
router.get('/tournament/:tournamentId', roomController.getRooms);
router.put('/:id/credentials', auditMiddleware('UPDATE_CREDENTIALS', 'ROOM'), roomController.updateCredentials);
router.put('/:id/moderator', auditMiddleware('ASSIGN_MODERATOR', 'ROOM'), roomController.assignModerator);

/**
 * POST /api/rooms/archive
 * Validate completion and clear rooms (moving effective state to history)
 */
router.post('/archive', auditMiddleware('ARCHIVE_ROOMS', 'ROOM'), async (req, res) => {
    try {
        const models = getModels(req);
        const { Room, SquadGameState, Tournament } = models;
        const { tournamentId } = req.body;

        if (!tournamentId) {
            return res.status(400).json({ success: false, message: 'Tournament ID is required' });
        }

        // 1. Find all rooms for this tournament
        const rooms = await Room.find({ tournamentId });
        if (rooms.length === 0) {
            return res.status(400).json({ success: false, message: 'No rooms to archive' });
        }

        const roomIds = rooms.map(r => r._id);

        // 2. Check for ACTIVE matches (isCompleted: false)
        const activeMatches = await SquadGameState.countDocuments({
            roomId: { $in: roomIds },
            isCompleted: false
        });

        if (activeMatches > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot archive: There are ${activeMatches} active (incomplete) matches. Please finish them first.`,
                activeMatches
            });
        }

        // 3. Clear rooms and reset participants' assigned room field
        await clearRooms(models, tournamentId);

        // 4. Ensure tournament status and lock are reset
        await Tournament.findByIdAndUpdate(tournamentId, {
            status: 'OPEN',
            totalRooms: 0,
            roomsLocked: false
        });

        // 5. Emit socket event
        if (req.app.get('io') && req.headers['x-tenant-id']) {
            req.app.get('io').to(req.headers['x-tenant-id']).emit('roomUpdated', {
                tournamentId,
                archived: true
            });
        }

        res.json({
            success: true,
            message: `Successfully archived! Cleared ${rooms.length} rooms. Match history is preserved.`
        });

    } catch (error) {
        console.error('Error archiving rooms:', error);
        res.status(500).json({ success: false, message: 'Archive failed', error: error.message });
    }
});

export default router;
