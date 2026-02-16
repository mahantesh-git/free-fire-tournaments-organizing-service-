import mongoose from 'mongoose';
import dotenv from 'dotenv';
import tournamentSchema from '../models/tenant/Tournament.js';
import squadSchema from '../models/tenant/Squad.js';
import killsSchema from '../models/tenant/Kills.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

async function removeTestTournaments() {
    try {
        console.log('🔌 Connecting to Global MongoDB...');
        const globalConn = await mongoose.createConnection(MONGO_URI, {
            dbName: 'esports_platform_global'
        });

        const tenant = await globalConn.collection('tenants').findOne({ slug: 'bca-esports' }); // Default to our main test tenant
        await globalConn.close();

        if (!tenant) {
            console.log('❌ Tenant "bca-esports" not found');
            return;
        }

        const TENANT_DB = tenant.databaseName;
        console.log(`✅ Using Tenant DB: ${TENANT_DB}`);

        const tenantConn = await mongoose.createConnection(MONGO_URI, {
            dbName: TENANT_DB
        });

        // Get Models
        const Tournament = tenantConn.model('Tournament', tournamentSchema);
        const Squad = tenantConn.model('Squad', squadSchema);
        const Kills = tenantConn.model('Kills', killsSchema);

        // Find Test Tournaments
        const regex = /TEST/i; // Case insensitive "TEST"
        const tournaments = await Tournament.find({ name: { $regex: regex } });

        console.log(`\n🔍 Found ${tournaments.length} tournaments matching "TEST":`);

        for (const t of tournaments) {
            console.log(`\n🗑️  Deleting Tournament: "${t.name}" (${t._id})`);

            // 1. Delete Squads
            const sRes = await Squad.deleteMany({ tournamentId: t._id });
            console.log(`   - Deleted ${sRes.deletedCount} squads`);

            // 2. Delete Players (Kills)
            const pRes = await Kills.deleteMany({ tournamentId: t._id });
            console.log(`   - Deleted ${pRes.deletedCount} players`);

            // 3. Delete Tournament
            await Tournament.findByIdAndDelete(t._id);
            console.log(`   ✅ Tournament deleted`);
        }

        console.log('\n✨ Cleanup Complete!');
        await tenantConn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

removeTestTournaments();
