import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

async function clearData() {
    try {
        console.log('🔌 Connecting to Global MongoDB...');
        // 1. Connect to Global DB to find Tenant DB Name
        const globalConn = await mongoose.createConnection(MONGO_URI, {
            dbName: 'esports_platform_global'
        });

        const tenant = await globalConn.collection('tenants').findOne({});
        if (!tenant) {
            console.error('❌ No tenant found in global database.');
            process.exit(1);
        }

        const TENANT_DB = tenant.databaseName;
        console.log(`✅ Found Tenant DB: ${TENANT_DB}`);
        await globalConn.close();

        // 2. Connect to Tenant DB
        console.log('🔌 Connecting to Tenant MongoDB...');
        const tenantConn = await mongoose.createConnection(MONGO_URI, {
            dbName: TENANT_DB
        });

        console.log(`✅ Connected to tenant database: ${TENANT_DB}`);

        // Collections to delete (everything except organizers)
        const collectionsToDelete = [
            'tournaments',
            'rooms',
            'squads',
            'squadgamestates',
            'kills',
            'matchhistories',
            'tournamenthistories',
            'auditlogs',
            // 'players' // Assuming players should be kept? The user said "remove all data". 
            // If they want "fresh", usually players are kept as users, but tournament data is wiped.
            // But the prompt says "start from fresh". Let's wipe players too if they are "registrations".
            // In this system, 'Kills' seems to be the player registration for tournaments? 
            // No, 'Player' model exists. d:\free fire\server\models\tenant\Player.js
            'players'
        ];

        console.log('\n🗑️  Starting cleanup...\n');

        for (const collectionName of collectionsToDelete) {
            const collection = tenantConn.collection(collectionName);
            try {
                const count = await collection.countDocuments();
                if (count > 0) {
                    await collection.deleteMany({});
                    console.log(`✅ Deleted ${count} documents from ${collectionName}`);
                } else {
                    console.log(`   ${collectionName} is already empty`);
                }
            } catch (err) {
                console.log(`⚠️  Collection ${collectionName} error: ${err.message}`);
            }
        }

        console.log('\n✨ Cleanup complete!');

        await tenantConn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

clearData();
