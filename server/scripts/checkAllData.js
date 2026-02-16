import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

async function checkAllData() {
    try {
        console.log('🔌 Connecting to MongoDB...\n');
        const conn = await mongoose.connect(MONGO_URI);
        const admin = conn.connection.db.admin();

        // List all databases
        const { databases } = await admin.listDatabases();

        console.log('📊 ALL DATABASES:\n');
        for (const db of databases) {
            console.log(`\n━━━ ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB) ━━━`);

            // Skip system databases for detailed inspection
            if (['admin', 'local', 'config'].includes(db.name)) {
                console.log('   (System database - skipped)');
                continue;
            }

            // Connect to this database
            const dbConn = conn.connection.useDb(db.name);
            const collections = await dbConn.db.listCollections().toArray();

            if (collections.length === 0) {
                console.log('   No collections found');
                continue;
            }

            // Check each collection
            for (const coll of collections) {
                const count = await dbConn.collection(coll.name).countDocuments();
                console.log(`   📁 ${coll.name}: ${count} documents`);
            }
        }

        await conn.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAllData();
