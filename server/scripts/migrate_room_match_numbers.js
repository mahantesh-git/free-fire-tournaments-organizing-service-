/**
 * Migration Script: Backfill currentMatchNumber on existing Room documents
 *
 * Run ONCE for existing organizations that already have match data.
 * For NEW organizations (fresh rooms), this is NOT needed — the schema
 * defaults handle it automatically.
 *
 * Usage:
 *   node server/scripts/migrate_room_match_numbers.js
 *
 * This script is IDEMPOTENT — safe to run multiple times.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const GLOBAL_MONGO_URI = process.env.MONGO_URI;
if (!GLOBAL_MONGO_URI) {
    console.error('MONGO_URI not set in .env');
    process.exit(1);
}

async function migrateTenantDB(tenantDbUri, tenantDbName) {
    const conn = await mongoose.createConnection(tenantDbUri, {
        dbName: tenantDbName,
        serverSelectionTimeoutMS: 5000
    }).asPromise();

    console.log(`Connected to tenant: ${tenantDbName}`);

    const Room = conn.model('Room', new mongoose.Schema({
        currentMatchNumber: { type: Number, default: 1 },
        matchesPlayed: { type: Number, default: 0 }
    }, { strict: false }));

    const SquadGameState = conn.model('SquadGameState', new mongoose.Schema({
        roomId: mongoose.Schema.Types.ObjectId,
        matchNumber: Number
    }, { strict: false }));

    const rooms = await Room.find({}).lean();
    console.log(`  Found ${rooms.length} rooms`);

    for (const room of rooms) {
        const maxResult = await SquadGameState.aggregate([
            { $match: { roomId: room._id } },
            { $group: { _id: null, maxMatch: { $max: '$matchNumber' } } }
        ]);

        const maxMatchPlayed = maxResult[0]?.maxMatch || 0;

        if (maxMatchPlayed === 0) {
            await Room.updateOne(
                { _id: room._id, currentMatchNumber: { $exists: false } },
                { $set: { currentMatchNumber: 1, matchesPlayed: 0 } }
            );
            console.log(`    Room "${room.name || room._id}": No matches played — defaults set`);
        } else {
            const nextMatchNumber = maxMatchPlayed + 1;
            await Room.updateOne(
                { _id: room._id },
                { $set: { currentMatchNumber: nextMatchNumber, matchesPlayed: maxMatchPlayed } }
            );
            console.log(`    Room "${room.name || room._id}": ${maxMatchPlayed} match(es) played, nextMatch=#${nextMatchNumber}`);
        }
    }

    await conn.close();
}

async function main() {
    try {
        const globalConn = await mongoose.createConnection(GLOBAL_MONGO_URI, {
            dbName: 'esports_platform_global',
            serverSelectionTimeoutMS: 5000
        }).asPromise();

        console.log('Connected to global DB');

        const Tenant = globalConn.model('Tenant', new mongoose.Schema({
            name: String,
            databaseName: String
        }, { strict: false }));

        const tenants = await Tenant.find({}).lean();
        console.log(`Found ${tenants.length} tenants`);
        await globalConn.close();

        // Build per-tenant URI: replace DB name in MONGO_URI
        const baseUri = GLOBAL_MONGO_URI.replace(/\/[^/?]+(\?|$)/, '/');

        for (const tenant of tenants) {
            if (!tenant.databaseName) {
                console.warn(`Tenant ${tenant.name} has no databaseName, skipping`);
                continue;
            }
            await migrateTenantDB(baseUri + tenant.databaseName, tenant.databaseName);
        }

        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

main();
