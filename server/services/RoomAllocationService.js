

// NOTE: This file is a service but imports models dynamically to support multi-tenancy
// We will pass the tenant models into the functions

/**
 * Generate Rooms for a Tournament
 * @param {Object} models - { Room, Tournament, Squad, Player }
 * @param {String} tournamentId 
 * @param {Object} options - { strategy: 'RANDOM' | 'SKILL', seed: Number }
 */
export const generateRooms = async (models, tournamentId, options = {}) => {
    const { Room, Tournament, Squad, Player } = models;

    // 1. Fetch Tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const maxPerRoom = tournament.maxPlayersPerRoom || 48;
    const mode = tournament.mode || 'SQUAD';

    console.log(`📋 Tournament: ${tournament.name}, Mode: ${mode}, Max per room: ${maxPerRoom}`);

    // 2. Fetch Participants (in registration order)
    let participants = [];
    if (mode === 'SQUAD') {
        const squads = await Squad.find({ tournamentId }).sort({ registeredAt: 1 }); // Sorted by registration time
        participants = squads;
        console.log(`📊 Found ${squads.length} squads`);
    } else {
        // Solo Mode - Fetch Players for this Tournament
        const players = await Player.find({ tournamentId }).sort({ timestamp: 1 }); // Sorted by registration time (Kills model uses 'timestamp')
        participants = players;
        console.log(`📊 Found ${players.length} players for tournament ${tournamentId}`);

        if (players.length > 0) {
            console.log(`📝 Sample players:`, players.slice(0, 3).map(p => ({
                name: p.playerName,
                ffId: p.ffId,
                timestamp: p.timestamp
            })));
        }
    }

    if (participants.length === 0) {
        console.error('❌ No participants found');
        throw new Error('No participants found to allocate. Please ensure players have registered.');
    }

    console.log(`✅ Total participants to allocate: ${participants.length}`);

    // 3. Calculate Room Distribution
    // Squad Mode: 4 players per squad. Max participants = 48 -> Max squads = 12.
    const unitSize = mode === 'SQUAD' ? 4 : 1;
    const maxUnitsPerRoom = Math.floor(maxPerRoom / unitSize); // 12 Squads or 48 Players

    // Chunking Logic - Sequential allocation in registration order
    const roomsData = [];

    for (let i = 0; i < participants.length; i += maxUnitsPerRoom) {
        const chunk = participants.slice(i, i + maxUnitsPerRoom);
        roomsData.push(chunk);
    }

    // 5. Create Rooms in DB
    // Clear existing rooms for this tournament first?
    await Room.deleteMany({ tournamentId });

    const createdRooms = [];

    for (let i = 0; i < roomsData.length; i++) {
        const participantsChunk = roomsData[i];

        const room = new Room({
            tournamentId: tournament._id,
            roomNumber: i + 1,
            name: `Room ${i + 1}`,
            mode: mode,
            status: 'PENDING',
            currentCapacity: participantsChunk.length * unitSize,
            maxCapacity: maxPerRoom
        });

        if (mode === 'SQUAD') {
            room.squads = participantsChunk.map(s => s._id);
        } else {
            room.players = participantsChunk.map(p => p._id);
        }

        // Generate credentials (simple)
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();
        const password = Math.floor(1000 + Math.random() * 9000).toString();
        room.credentials = { roomId, password };

        await room.save();
        createdRooms.push(room);
    }

    // Update Tournament Status
    tournament.totalRooms = createdRooms.length;
    tournament.status = 'ONGOING'; // Or READY
    await tournament.save();

    // 6. SYNC: Update the 'room' field on participants for public view filtering
    console.log(`🔄 [Sync] Updating participants with their assigned room names...`);
    for (const room of createdRooms) {
        if (mode === 'SQUAD') {
            await Squad.updateMany(
                { _id: { $in: room.squads } },
                { $set: { room: room.name } }
            );
        } else {
            await Player.updateMany(
                { _id: { $in: room.players } },
                { $set: { room: room.name } }
            );
        }
    }

    return createdRooms;
};

export const clearRooms = async (models, tournamentId) => {
    const { Room, Tournament, Squad, Player } = models;
    await Room.deleteMany({ tournamentId });
    await Tournament.findByIdAndUpdate(tournamentId, {
        status: 'OPEN',
        totalRooms: 0
    });

    // Reset room field on all participants
    await Promise.all([
        Squad.updateMany({ tournamentId }, { $set: { room: 'Unassigned' } }),
        Player.updateMany({ tournamentId }, { $set: { room: 'Unassigned' } })
    ]);
};
