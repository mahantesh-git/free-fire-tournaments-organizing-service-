import express from 'express';
import * as roomController from '../controllers/roomController.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';

const router = express.Router();

// Import clearRooms from service to reuse logic if needed, but we need specific Expired logic
import { clearRooms } from '../services/RoomAllocationService.js';
import { getTenantModel } from '../utils/tenantModel.js';
import roomSchema from '../models/tenant/Room.js';
import squadGameStateSchema from '../models/tenant/SquadGameState.js';

const getModels = (req) => ({
    Room: getTenantModel(req.tenantConnection, 'Room', roomSchema),
    SquadGameState: getTenantModel(req.tenantConnection, 'SquadGameState', squadGameStateSchema)
});

router.post('/generate', auditMiddleware('GENERATE_ROOMS', 'ROOM'), roomController.autoAssignRooms);
router.post('/reset', auditMiddleware('RESET_ROOMS', 'ROOM'), roomController.resetRooms);
router.get('/tournament/:tournamentId', roomController.getRooms);
router.put('/:id/credentials', auditMiddleware('UPDATE_CREDENTIALS', 'ROOM'), roomController.updateCredentials);
router.put('/:id/moderator', auditMiddleware('ASSIGN_MODERATOR', 'ROOM'), roomController.assignModerator);

/**
 * POST /api/rooms/archive
 * Validate completion and clear rooms (moving effective state to history)
 */
router.post('/archive', async (req, res) => {
    try {
        const { Room, SquadGameState } = getModels(req);
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
        // We only care about matches associated with these specific room instances
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

        // 3. Safe to Archive (Delete Rooms)
        // Match history is preserved in SquadGameState (which now has tournamentId)
        const result = await Room.deleteMany({ tournamentId });

        res.json({
            success: true,
            message: `Successfully archived! Cleared ${result.deletedCount} rooms. Match history is preserved.`
        });

    } catch (error) {
        console.error('Error archiving rooms:', error);
        res.status(500).json({ success: false, message: 'Archive failed', error: error.message });
    }
});

export default router;
