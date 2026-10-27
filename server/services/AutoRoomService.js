import { getTenantModel } from '../utils/tenantModel.js';
import roomSchema from '../models/tenant/Room.js';
import tournamentSchema from '../models/tenant/Tournament.js';
import squadSchema from '../models/tenant/Squad.js';
import duoSchema from '../models/tenant/Duo.js';
import killsSchema from '../models/tenant/Kills.js';

export class AutoRoomService {
    /**
     * Determine unit size in players for given mode
     */
    static getUnitSize(mode, teamSize = 4) {
        switch (mode) {
            case 'SOLO': return 1;
            case 'DUO': return 2;
            case 'SQUAD': return 4;
            case 'CLASH_SQUAD': return 4;
            case 'CUSTOM': return teamSize || 4;
            default: return 1;
        }
    }

    /**
     * Calculate maximum participants (units) per room
     */
    static getMaxUnits(mode, maxPlayersPerRoom = 48, teamSize = 4) {
        if (mode === 'CLASH_SQUAD') return 2; // Fixed 2 squads for 4v4
        const unitSize = this.getUnitSize(mode, teamSize);
        return Math.floor(maxPlayersPerRoom / unitSize);
    }

    /**
     * Auto-assign a newly registered participant to the next available room
     */
    static async assignParticipant({
        tenantConnection,
        tournamentId,
        participantType, // 'PLAYER' | 'DUO' | 'SQUAD'
        participantId,
        io = null,
        tenantId = null
    }) {
        const Room = getTenantModel(tenantConnection, 'Room', roomSchema);
        const Tournament = getTenantModel(tenantConnection, 'Tournament', tournamentSchema);
        const Squad = getTenantModel(tenantConnection, 'Squad', squadSchema);
        const Duo = getTenantModel(tenantConnection, 'Duo', duoSchema);
        const Player = getTenantModel(tenantConnection, 'Kills', killsSchema);

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) throw new Error('Tournament not found');

        if (tournament.roomsLocked) {
            return {
                assigned: false,
                reason: 'LOCKED',
                message: 'Tournament rooms are locked. Participant registered on standby.'
            };
        }

        const mode = tournament.mode || 'SQUAD';
        const maxPlayers = tournament.maxPlayersPerRoom || 48;
        const unitSize = this.getUnitSize(mode, tournament.teamSize);
        const maxUnits = this.getMaxUnits(mode, maxPlayers, tournament.teamSize);

        // Fetch all active/pending rooms for this tournament sorted by roomNumber ascending
        const rooms = await Room.find({ tournamentId, status: { $ne: 'COMPLETED' } }).sort({ roomNumber: 1 });

        let targetRoom = null;

        for (const room of rooms) {
            if (room.isLocked) continue;

            const currentUnits = mode === 'SQUAD' || mode === 'CLASH_SQUAD'
                ? (room.squads?.length || 0)
                : mode === 'DUO'
                    ? (room.duos?.length || 0)
                    : (room.players?.length || 0);

            if (currentUnits < maxUnits) {
                targetRoom = room;
                break;
            }
        }

        // If no available room with space, create a new room
        let isNewRoom = false;
        if (!targetRoom) {
            const nextRoomNumber = rooms.length + 1;
            const roomId = Math.floor(100000 + Math.random() * 900000).toString();
            const password = Math.floor(1000 + Math.random() * 9000).toString();

            targetRoom = new Room({
                tournamentId: tournament._id,
                roomNumber: nextRoomNumber,
                name: `Room ${nextRoomNumber}`,
                mode: mode,
                status: 'PENDING',
                credentials: { roomId, password },
                currentCapacity: 0,
                maxCapacity: mode === 'CLASH_SQUAD' ? 2 * unitSize : maxPlayers,
                squads: [],
                duos: [],
                players: []
            });
            isNewRoom = true;
            tournament.totalRooms = nextRoomNumber;
            await tournament.save();
        }

        // Add participant ID to room array & update participant's room field
        if (participantType === 'SQUAD' || participantType === 'CLASH_SQUAD') {
            targetRoom.squads.push(participantId);
            await Squad.findByIdAndUpdate(participantId, { room: targetRoom.name });
        } else if (participantType === 'DUO') {
            targetRoom.duos.push(participantId);
            await Duo.findByIdAndUpdate(participantId, { room: targetRoom.name });
        } else {
            targetRoom.players.push(participantId);
            await Player.findByIdAndUpdate(participantId, { room: targetRoom.name });
        }

        targetRoom.currentCapacity = (targetRoom.currentCapacity || 0) + unitSize;
        await targetRoom.save();

        // Broadcast real-time room update if socket IO is available
        if (io && tenantId) {
            io.to(tenantId).emit('roomUpdated', {
                tournamentId,
                roomId: targetRoom._id,
                roomNumber: targetRoom.roomNumber,
                name: targetRoom.name,
                currentCapacity: targetRoom.currentCapacity,
                maxCapacity: targetRoom.maxCapacity,
                isNewRoom
            });
        }

        return {
            assigned: true,
            roomNumber: targetRoom.roomNumber,
            roomName: targetRoom.name,
            roomId: targetRoom._id,
            slotNumber: targetRoom.currentCapacity / unitSize,
            isNewRoom
        };
    }

    /**
     * Swap or move a participant between rooms (Organizer override)
     */
    static async swapParticipant({
        tenantConnection,
        tournamentId,
        sourceRoomId,
        targetRoomId,
        participantId,
        participantType,
        io = null,
        tenantId = null
    }) {
        const Room = getTenantModel(tenantConnection, 'Room', roomSchema);
        const Tournament = getTenantModel(tenantConnection, 'Tournament', tournamentSchema);
        const Squad = getTenantModel(tenantConnection, 'Squad', squadSchema);
        const Duo = getTenantModel(tenantConnection, 'Duo', duoSchema);
        const Player = getTenantModel(tenantConnection, 'Kills', killsSchema);

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) throw new Error('Tournament not found');

        if (tournament.roomsLocked) {
            throw new Error('Rooms are locked. Unlock tournament to reorganize participants.');
        }

        const sourceRoom = await Room.findById(sourceRoomId);
        const targetRoom = await Room.findById(targetRoomId);
        if (!sourceRoom || !targetRoom) throw new Error('Source or Target Room not found');

        const unitSize = this.getUnitSize(tournament.mode, tournament.teamSize);
        const maxUnits = this.getMaxUnits(tournament.mode, tournament.maxPlayersPerRoom, tournament.teamSize);

        // Remove from source room
        const arrayKey = (participantType === 'SQUAD' || participantType === 'CLASH_SQUAD') ? 'squads' : participantType === 'DUO' ? 'duos' : 'players';
        sourceRoom[arrayKey] = sourceRoom[arrayKey].filter(id => id.toString() !== participantId.toString());
        sourceRoom.currentCapacity = Math.max(0, (sourceRoom.currentCapacity || unitSize) - unitSize);
        await sourceRoom.save();

        // Check target capacity
        if ((targetRoom[arrayKey]?.length || 0) >= maxUnits) {
            throw new Error(`${targetRoom.name} is already at full capacity (${maxUnits} units)`);
        }

        // Add to target room
        targetRoom[arrayKey].push(participantId);
        targetRoom.currentCapacity = (targetRoom.currentCapacity || 0) + unitSize;
        await targetRoom.save();

        // Update participant's room field
        if (participantType === 'SQUAD' || participantType === 'CLASH_SQUAD') {
            await Squad.findByIdAndUpdate(participantId, { room: targetRoom.name });
        } else if (participantType === 'DUO') {
            await Duo.findByIdAndUpdate(participantId, { room: targetRoom.name });
        } else {
            await Player.findByIdAndUpdate(participantId, { room: targetRoom.name });
        }

        if (io && tenantId) {
            io.to(tenantId).emit('roomsReorganized', { tournamentId });
        }

        return { success: true, message: `Moved participant to ${targetRoom.name}` };
    }

    /**
     * Lock/Unlock rooms for a tournament
     */
    static async toggleRoomLock({ tenantConnection, tournamentId, lock = true, io = null, tenantId = null }) {
        const Tournament = getTenantModel(tenantConnection, 'Tournament', tournamentSchema);
        const Room = getTenantModel(tenantConnection, 'Room', roomSchema);

        const tournament = await Tournament.findByIdAndUpdate(
            tournamentId,
            { roomsLocked: lock },
            { new: true }
        );

        if (!tournament) throw new Error('Tournament not found');

        await Room.updateMany(
            { tournamentId },
            { $set: { isLocked: lock, status: lock ? 'READY' : 'PENDING' } }
        );

        if (io && tenantId) {
            io.to(tenantId).emit('roomsLockChanged', { tournamentId, roomsLocked: lock });
        }

        return tournament;
    }
}
