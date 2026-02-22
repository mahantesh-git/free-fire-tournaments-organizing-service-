

// NOTE: This file is a service but imports models dynamically to support multi-tenancy
// We will pass the tenant models into the functions

/**
 * Generate Rooms for a Tournament
 * @param {Object} models - { Room, Tournament, Squad, Player, Duo }
 * @param {String} tournamentId 
 * @param {Object} options - { strategy: 'RANDOM' | 'SKILL', seed: Number }
 */
export const generateRooms = async (models, tournamentId, options = {}) => {
    const { Room, Tournament, Squad, Player, Duo } = models;

    // 1. Fetch Tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const maxPerRoom = tournament.maxPlayersPerRoom || 48;
    const mode = tournament.mode || 'SQUAD';

    console.log(`📋 Tournament: ${tournament.name}, Mode: ${mode}, Max per room: ${maxPerRoom}`);

    // 2. Fetch Participants (in registration order)
    let participants = [];
    if (mode === 'SQUAD' || mode === 'CLASH_SQUAD') {
        const squads = await Squad.find({ tournamentId }).sort({ registeredAt: 1 });
        participants = squads;
        console.log(`📊 Found ${squads.length} squads`);
    } else if (mode === 'DUO') {
        if (!Duo) throw new Error('Duo model not available — ensure it is registered for this tenant');
        const duos = await Duo.find({ tournamentId }).sort({ registeredAt: 1 });
        participants = duos;
        console.log(`📊 Found ${duos.length} duo teams`);
    } else {
        // Solo Mode (or CUSTOM treated as solo if teamSize=1)
        const players = await Player.find({ tournamentId }).sort({ timestamp: 1 });
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
    // unitSize = players per team (1=solo, 2=duo, 4=squad)
    const unitSizeMap = { 'SOLO': 1, 'DUO': 2, 'SQUAD': 4, 'CLASH_SQUAD': 4, 'CUSTOM': tournament.teamSize || 4 };
    const unitSize = unitSizeMap[mode] || 1;

    // CLASH_SQUAD special: only 2 squads per room (4v4)
    let maxUnitsPerRoom;
    if (mode === 'CLASH_SQUAD') {
        maxUnitsPerRoom = 2; // 2 squads per room for 4v4
    } else {
        maxUnitsPerRoom = Math.floor(maxPerRoom / unitSize);
    }

    console.log(`📐 Unit size: ${unitSize}, Max units per room: ${maxUnitsPerRoom}`);

    // Chunking Logic - Sequential allocation in registration order
    const roomsData = [];
    for (let i = 0; i < participants.length; i += maxUnitsPerRoom) {
        const chunk = participants.slice(i, i + maxUnitsPerRoom);
        roomsData.push(chunk);
    }

    // 5. Create Rooms in DB
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
            maxCapacity: mode === 'CLASH_SQUAD' ? 2 * unitSize : maxPerRoom
        });

        // Assign participants based on mode
        if (mode === 'SQUAD' || mode === 'CLASH_SQUAD') {
            room.squads = participantsChunk.map(s => s._id);
        } else if (mode === 'DUO') {
            room.duos = participantsChunk.map(d => d._id);
        } else {
            room.players = participantsChunk.map(p => p._id);
        }

        // Generate credentials
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();
        const password = Math.floor(1000 + Math.random() * 9000).toString();
        room.credentials = { roomId, password };

        await room.save();
        createdRooms.push(room);
    }

    // Update Tournament Status
    tournament.totalRooms = createdRooms.length;
    tournament.status = 'ONGOING';
    await tournament.save();

    // 6. SYNC: Update the 'room' field on participants for public view filtering
    console.log(`🔄 [Sync] Updating participants with their assigned room names...`);
    for (const room of createdRooms) {
        if (mode === 'SQUAD' || mode === 'CLASH_SQUAD') {
            await Squad.updateMany(
                { _id: { $in: room.squads } },
                { $set: { room: room.name } }
            );
        } else if (mode === 'DUO') {
            await Duo.updateMany(
                { _id: { $in: room.duos } },
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
    const { Room, Tournament, Squad, Player, Duo } = models;
    await Room.deleteMany({ tournamentId });
    await Tournament.findByIdAndUpdate(tournamentId, {
        status: 'OPEN',
        totalRooms: 0
    });

    // Reset room field on all participants
    const promises = [
        Squad.updateMany({ tournamentId }, { $set: { room: 'Unassigned' } }),
        Player.updateMany({ tournamentId }, { $set: { room: 'Unassigned' } })
    ];
    if (Duo) {
        promises.push(Duo.updateMany({ tournamentId }, { $set: { room: 'Unassigned' } }));
    }
    await Promise.all(promises);
};
