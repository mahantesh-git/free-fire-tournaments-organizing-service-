import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const GLOBAL_DB = 'esports_platform_global';

async function clearOrganizers() {
    try {
        console.log('🔌 Connecting to MongoDB...');

        // Connect to global database
        const globalConn = await mongoose.createConnection(MONGO_URI, {
            dbName: GLOBAL_DB
        });

        console.log(`✅ Connected to global database: ${GLOBAL_DB}`);

        // Delete all organizers
        const organizersCollection = globalConn.collection('organizers');
        const result = await organizersCollection.deleteMany({});

        console.log(`\n✅ Deleted ${result.deletedCount} organizer accounts`);
        console.log('\n✨ All organizer accounts have been removed!');
        console.log('\n📝 You can now register fresh organizer accounts.');

        await globalConn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

clearOrganizers();
