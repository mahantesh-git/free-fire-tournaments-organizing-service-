import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

async function removeAllTenants() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        const conn = await mongoose.connect(MONGO_URI);
        const admin = conn.connection.db.admin();

        // Get list of all databases
        const { databases } = await admin.listDatabases();

        console.log('\n📊 Found databases:\n');
        databases.forEach(db => {
            console.log(`- ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
        });

        // Databases to preserve
        const preserveDatabases = ['admin', 'local', 'config', 'esports_platform_global'];

        console.log('\n🗑️  Removing tenant databases...\n');

        for (const db of databases) {
            if (!preserveDatabases.includes(db.name)) {
                try {
                    console.log(`🗑️  Dropping database: ${db.name}`);
                    await conn.connection.db.admin().command({ dropDatabase: 1 }, { dbName: db.name });

                    // Alternative method
                    const dbConn = conn.connection.useDb(db.name);
                    await dbConn.dropDatabase();

                    console.log(`✅ Dropped: ${db.name}`);
                } catch (error) {
                    console.log(`⚠️  Error dropping ${db.name}: ${error.message}`);
                }
            } else {
                console.log(`⏭️  Skipping system/global database: ${db.name}`);
            }
        }

        // Clear Global 'tenants' and 'organizers' collections
        console.log('\n🧹 Clearing Global Metadata...');
        const globalDb = conn.connection.useDb('esports_platform_global');

        try {
            await globalDb.collection('tenants').deleteMany({});
            console.log('✅ Cleared "tenants" collection');

            await globalDb.collection('organizers').deleteMany({});
            console.log('✅ Cleared "organizers" collection');
        } catch (err) {
            console.error('⚠️  Error clearing global collections:', err.message);
        }

        console.log('\n✨ Cleanup complete!');
        console.log('\n📊 Preserved databases:');
        console.log('   - admin (MongoDB system)');
        console.log('   - local (MongoDB system)');
        console.log('   - config (MongoDB system)');
        console.log('   - esports_platform_global (Metadata cleared)');

        await conn.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

removeAllTenants();
