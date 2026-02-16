import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const TENANT_DB = 'bca_esports';

async function verifyCleanup() {
    try {
        const tenantConn = await mongoose.createConnection(MONGO_URI, {
            dbName: TENANT_DB
        });

        console.log('📊 Checking collection counts...\n');

        const collections = [
            'tournaments',
            'rooms',
            'squads',
            'squadgamestates',
            'kills',
            'matchhistories',
            'tournamenthistories',
            'auditlogs',
            'players'
        ];

        for (const name of collections) {
            try {
                const count = await tenantConn.collection(name).countDocuments();
                console.log(`${name}: ${count} documents`);
            } catch (error) {
                console.log(`${name}: collection not found`);
            }
        }

        await tenantConn.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verifyCleanup();
