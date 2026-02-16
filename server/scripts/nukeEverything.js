import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

async function nukeEverything() {
    try {
        console.log('🔌 Connecting to MongoDB...\n');
        const conn = await mongoose.connect(MONGO_URI);
        const admin = conn.connection.db.admin();

        // Get all databases
        const { databases } = await admin.listDatabases();

        // System databases to preserve
        const systemDatabases = ['admin', 'local', 'config'];

        console.log('🗑️  DROPPING ALL NON-SYSTEM DATABASES:\n');

        for (const db of databases) {
            if (systemDatabases.includes(db.name)) {
                console.log(`⏭️  Skipping system database: ${db.name}`);
                continue;
            }

            try {
                console.log(`🗑️  Dropping database: ${db.name}`);
                const dbConn = conn.connection.useDb(db.name);
                await dbConn.dropDatabase();
                console.log(`✅ Successfully dropped: ${db.name}`);
            } catch (error) {
                console.log(`❌ Error dropping ${db.name}: ${error.message}`);
            }
        }

        console.log('\n✨ COMPLETE DATABASE RESET FINISHED!');
        console.log('\n📊 Remaining databases:');
        console.log('   - admin (MongoDB system)');
        console.log('   - local (MongoDB system)');
        console.log('   - config (MongoDB system)');
        console.log('\n🎉 All application data has been removed!');

        await conn.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

nukeEverything();
