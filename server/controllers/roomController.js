import { generateRooms, clearRooms } from '../services/RoomAllocationService.js';
import { getTenantModel } from '../utils/tenantModel.js';
import roomSchema from '../models/tenant/Room.js';
import tournamentSchema from '../models/tenant/Tournament.js';
import squadSchema from '../models/tenant/Squad.js';
import killsSchema from '../models/tenant/Kills.js'; // Use Kills schema for Players

const getModels = (req) => ({
    Room: getTenantModel(req.tenantConnection, 'Room', roomSchema),
    Tournament: getTenantModel(req.tenantConnection, 'Tournament', tournamentSchema),
    Squad: getTenantModel(req.tenantConnection, 'Squad', squadSchema),
    Player: getTenantModel(req.tenantConnection, 'Kills', killsSchema) // Use Kills model as Player source
});

// Generate Rooms
export const autoAssignRooms = async (req, res) => {
    console.log('\n🏠 ===== ROOM GENERATION REQUEST =====');
    console.log('Headers:', {
        'x-tenant-id': req.headers['x-tenant-id'],
        'host': req.headers.host
    });
    console.log('Body:', req.body);
    console.log('Tenant:', req.tenant ? {
        name: req.tenant.name,
        slug: req.tenant.slug,
        databaseName: req.tenant.databaseName
    } : 'NOT FOUND');
    console.log('Has tenantConnection:', !!req.tenantConnection);

    try {
        const { tournamentId } = req.body;
        if (!tournamentId) {
            console.error('❌ Tournament ID missing');
            return res.status(400).json({ error: 'Tournament ID is required' });
        }

        if (!req.tenantConnection) {
            console.error('❌ Tenant connection not found');
            return res.status(500).json({ error: 'Tenant connection not established' });
        }

        console.log('✅ Creating models...');
        const models = getModels(req);

        // CHECK: Prevent re-generation if rooms exist
        const existingCount = await models.Room.countDocuments({ tournamentId });
        if (existingCount > 0) {
            return res.status(400).json({
                error: 'Rooms already exist. Please "Finalize & Archive" current rooms before generating new ones.'
            });
        }

        console.log('✅ Calling generateRooms...');
        const rooms = await generateRooms(models, tournamentId);

        // Log room generation to tournament history
        if (req.historyService) {
            try {
                await req.historyService.addTournamentEvent(
                    tournamentId,
                    'ROOMS_GENERATED',
                    {
                        userId: req.tenant._id,
                        role: 'ORGANIZER',
                        email: req.tenant.ownerEmail
                    },
                    {
                        roomCount: rooms.length,
                        mode: rooms[0]?.mode
                    }
                );
            } catch (historyError) {
                console.error('Failed to log room generation:', historyError);
            }
        }

        console.log(`✅ Successfully generated ${rooms.length} rooms`);
        res.json({
            success: true,
            message: `Successfully generated ${rooms.length} rooms`,
            rooms
        });
    } catch (error) {
        console.error('❌ Room Assignment Error:', error.message);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'One or more rooms already exist for this tournament' });
        }
        res.status(500).json({
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Get Rooms for a tournament
export const getRooms = async (req, res) => {
    console.log('\n📋 ===== GET ROOMS REQUEST =====');
    console.log('Tournament ID:', req.params.tournamentId);
    console.log('Has tenantConnection:', !!req.tenantConnection);

    try {
        const { tournamentId } = req.params;

        if (!req.tenantConnection) {
            console.error('❌ Tenant connection not found');
            return res.status(500).json({ error: 'Tenant connection not established' });
        }

        const { Room, Player, Squad } = getModels(req);

        console.log('🔍 Fetching rooms for tournament:', tournamentId);
        const rooms = await Room.find({ tournamentId }).sort({ roomNumber: 1 }).lean();

        console.log(`✅ Found ${rooms.length} rooms`);

        // Populate data based on room mode
        for (const room of rooms) {
            if (room.mode === 'SQUAD' && room.squads && room.squads.length > 0) {
                // Populate squad details for SQUAD mode
                const squadDetails = await Squad.find({ _id: { $in: room.squads } });
                room.squads = squadDetails;
                console.log(`📦 Populated ${squadDetails.length} squads for room ${room.roomNumber}`);
            } else if (room.mode === 'SOLO' && room.players && room.players.length > 0) {
                // Populate player details for SOLO mode
                const playerDetails = await Player.find({ _id: { $in: room.players } });
                room.players = playerDetails;
                console.log(`👤 Populated ${playerDetails.length} players for room ${room.roomNumber}`);
            }
        }

        if (rooms.length > 0) {
            console.log('📝 Sample room:', {
                name: rooms[0].name,
                mode: rooms[0].mode,
                roomNumber: rooms[0].roomNumber,
                squadsCount: rooms[0].squads?.length || 0,
                playersCount: rooms[0].players?.length || 0
            });
        }

        res.json({ success: true, rooms });
    } catch (error) {
        console.error('❌ Get Rooms Error:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: error.message });
    }
};

// Clear Rooms (Reset)
export const resetRooms = async (req, res) => {
    try {
        const { tournamentId } = req.body;
        const models = getModels(req);

        await clearRooms(models, tournamentId);

        res.json({ success: true, message: 'Rooms cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Room Credentials (Moderator/Admin)
export const updateCredentials = async (req, res) => {
    try {
        const { roomId, roomPassword, customRoomId } = req.body; // DB roomId, Game roomId, Game pass
        const { Room } = getModels(req);

        // This is updating the "Game Room ID" and "Game Password"
        const room = await Room.findByIdAndUpdate(req.params.id, {
            'credentials.roomId': customRoomId,
            'credentials.password': roomPassword,
            status: 'READY' // Assume ready if creds are set
        }, { new: true });

        if (!room) return res.status(404).json({ error: 'Room not found' });

        // Notify via Socket
        if (req.app.get('io')) {
            req.app.get('io').to(req.headers['x-tenant-id']).emit('roomUpdate', { type: 'credentials', room });
        }

        res.json({ success: true, room });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Assign Moderator to Room
export const assignModerator = async (req, res) => {
    try {
        const { moderatorId } = req.body;
        const { id: roomId } = req.params;
        const { Room } = getModels(req);
        const moderatorSchema = (await import('../models/tenant/Moderator.js')).moderatorSchema;
        const Moderator = getTenantModel(req.tenantConnection, 'Moderator', moderatorSchema);

        // 1. Update Room
        const room = await Room.findByIdAndUpdate(roomId, {
            moderatorId: moderatorId || null
        }, { new: true });

        if (!room) return res.status(404).json({ error: 'Room not found' });

        // 2. If assigning (not unassigning), update Moderator
        if (moderatorId) {
            await Moderator.findByIdAndUpdate(moderatorId, {
                $addToSet: { assignedRooms: roomId }
            });
        } else {
            // Optional: If unassigning, should we remove room from all moderators?
            // Usually a room has only one moderator, but a moderator can have many rooms.
            // For now, let's keep it simple. Only handle additions via addToSet.
        }

        res.json({ success: true, message: 'Moderator assigned successfully', room });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

