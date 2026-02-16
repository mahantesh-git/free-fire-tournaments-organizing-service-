import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const clearDatabase = async () => {
    try {
        const dbName = process.argv[2];

        if (!dbName) {
            console.error('❌ Please provide database name (e.g., esports_tenant_bca_esports)');
            process.exit(1);
        }

        console.log(`🔌 Connecting to database: ${dbName}`);

        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) {
            console.error('❌ MONGO_URI not found in environment');
            process.exit(1);
        }

        const connection = await mongoose.createConnection(uri, { dbName }).asPromise();
        console.log('✅ Connected');

        // Get all collections
        const collections = await connection.db.listCollections().toArray();
        console.log(`📊 Found ${collections.length} collections`);

        // Drop each collection
        for (const collection of collections) {
            if (collection.name.startsWith('system.')) continue;

            try {
                await connection.db.collection(collection.name).deleteMany({});
                console.log(`✅ Cleared: ${collection.name}`);
            } catch (error) {
                console.error(`❌ Error clearing ${collection.name}:`, error.message);
            }
        }

        console.log('✅ Database cleared successfully!');
        await connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

clearDatabase();
