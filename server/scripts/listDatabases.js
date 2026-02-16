import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

async function listDatabases() {
    try {
        const conn = await mongoose.connect(MONGO_URI);
        const admin = conn.connection.db.admin();
        const { databases } = await admin.listDatabases();

        console.log('📊 Available databases:\n');
        for (const db of databases) {
            console.log(`- ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
        }

        await conn.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listDatabases();
