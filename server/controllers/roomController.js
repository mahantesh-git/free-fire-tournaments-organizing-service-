import { generateRooms, clearRooms } from '../services/RoomAllocationService.js';
import { AutoRoomService } from '../services/AutoRoomService.js';
import { getTenantModel } from '../utils/tenantModel.js';
import roomSchema from '../models/tenant/Room.js';
import tournamentSchema from '../models/tenant/Tournament.js';
import squadSchema from '../models/tenant/Squad.js';
import killsSchema from '../models/tenant/Kills.js'; // Use Kills schema for Players
import duoSchema from '../models/tenant/Duo.js';

const getModels = (req) => ({
    Room: getTenantModel(req.tenantConnection, 'Room', roomSchema),
    Tournament: getTenantModel(req.tenantConnection, 'Tournament', tournamentSchema),
    Squad: getTenantModel(req.tenantConnection, 'Squad', squadSchema),
    Player: getTenantModel(req.tenantConnection, 'Kills', killsSchema), // Use Kills model as Player source
    Duo: getTenantModel(req.tenantConnection, 'Duo', duoSchema)
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

        // Populate data based on room mode & auto-heal any inconsistencies
        for (const room of rooms) {
            if (room.mode === 'SQUAD' || room.mode === 'CLASH_SQUAD') {
                // Auto-heal: If any squad IDs were accidentally pushed into room.players
                if (room.players && room.players.length > 0) {
                    const misplacedSquads = await Squad.find({ _id: { $in: room.players } });
                    if (misplacedSquads.length > 0) {
                        const misplacedIds = misplacedSquads.map(s => s._id.toString());
                        const existingSquadIds = (room.squads || []).map(s => s._id ? s._id.toString() : s.toString());
                        const newSquadIds = misplacedSquads
                            .filter(s => !existingSquadIds.includes(s._id.toString()))
                            .map(s => s._id);

                        await Room.findByIdAndUpdate(room._id, {
                            $addToSet: { squads: { $each: misplacedSquads.map(s => s._id) } },
                            $pull: { players: { $in: misplacedSquads.map(s => s._id) } }
                        });
                        room.squads = [...(room.squads || []), ...newSquadIds];
                        room.players = room.players.filter(p => !misplacedIds.includes(p.toString()));

                        await Squad.updateMany(
                            { _id: { $in: misplacedSquads.map(s => s._id) } },
                            { $set: { room: room.name } }
                        );
                        console.log(`🩹 Auto-healed ${misplacedSquads.length} squads from players array to squads array in room ${room.roomNumber}`);
                    }
                }

                // Auto-heal phantom started match (started with 0 players)
                const SquadGameState = getTenantModel(req.tenantConnection, 'SquadGameState', (await import('../models/tenant/SquadGameState.js')).default);
                const hasGameStates = await SquadGameState.exists({ roomId: room._id });
                if (!hasGameStates && (room.status === 'ONGOING' || room.currentMatchNumber > 1 || room.matchesPlayed > 0)) {
                    await Room.findByIdAndUpdate(room._id, {
                        status: 'PENDING',
                        currentMatchNumber: 1,
                        matchesPlayed: 0
                    });
                    room.status = 'PENDING';
                    room.currentMatchNumber = 1;
                    room.matchesPlayed = 0;
                    console.log(`🩹 Reset phantom ongoing state for room ${room.roomNumber}`);
                }

                // Populate squad details
                if (room.squads && room.squads.length > 0) {
                    const squadDetails = await Squad.find({ _id: { $in: room.squads } });
                    room.squads = squadDetails;
                    console.log(`📦 Populated ${squadDetails.length} squads for room ${room.roomNumber}`);
                }
            } else if (room.mode === 'DUO' && room.duos && room.duos.length > 0) {
                // Populate duo details for DUO mode
                const Duo = getTenantModel(req.tenantConnection, 'Duo', (await import('../models/tenant/Duo.js')).default);
                const duoDetails = await Duo.find({ _id: { $in: room.duos } });
                room.duos = duoDetails;
                console.log(`👥 Populated ${duoDetails.length} duos for room ${room.roomNumber}`);
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

// Swap or move a participant between rooms
export const swapParticipant = async (req, res) => {
    try {
        const { tournamentId, sourceRoomId, targetRoomId, participantId, participantType } = req.body;

        if (!tournamentId || !sourceRoomId || !targetRoomId || !participantId) {
            return res.status(400).json({ error: 'Missing required parameters for room swap' });
        }

        const result = await AutoRoomService.swapParticipant({
            tenantConnection: req.tenantConnection,
            tournamentId,
            sourceRoomId,
            targetRoomId,
            participantId,
            participantType: participantType || 'SQUAD',
            io: req.app.get('io'),
            tenantId: req.headers['x-tenant-id']
        });

        res.json(result);
    } catch (error) {
        console.error('Swap participant error:', error);
        res.status(400).json({ error: error.message });
    }
};

// Lock or unlock rooms for a tournament
export const toggleLockRooms = async (req, res) => {
    try {
        const { tournamentId, lock } = req.body;

        if (!tournamentId) {
            return res.status(400).json({ error: 'Tournament ID is required' });
        }

        const tournament = await AutoRoomService.toggleRoomLock({
            tenantConnection: req.tenantConnection,
            tournamentId,
            lock: lock !== false,
            io: req.app.get('io'),
            tenantId: req.headers['x-tenant-id']
        });

        res.json({
            success: true,
            roomsLocked: tournament.roomsLocked,
            message: tournament.roomsLocked ? 'Rooms locked successfully' : 'Rooms unlocked successfully'
        });
    } catch (error) {
        console.error('Toggle lock rooms error:', error);
        res.status(500).json({ error: error.message });
    }
};

