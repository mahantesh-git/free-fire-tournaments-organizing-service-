import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Tenant from '../models/global/Tenant.js';
import { getTenantConnection } from '../config/dbManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function setupOrganizer() {
    const args = process.argv.slice(2);
    const email = 'demo1@gmail.com';
    const password = 'Password@123';
    const orgName = 'demoorg';
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const dbName = `verify_auto_room_tenant`;   

    console.log('🔌 Connecting to MongoDB Global Database...');
    await mongoose.connect(MONGO_URI, {
        dbName: 'verify_auto_room_tenant'
    });
    console.log('✅ Connected to verify_auto_room_tenant');

    // Check if an organizer with this email or slug already exists
    let tenant = await Tenant.findOne({ $or: [{ ownerEmail: email }, { slug }] });

    if (tenant) {
        console.log(`\n⚠️  Organizer already exists: ${tenant.name} (${tenant.ownerEmail})`);
        console.log('🔄 Updating password...');
        tenant.name = orgName;
        tenant.ownerEmail = email;
        tenant.password = password; // Trigger pre-save bcrypt hash
        tenant.status = 'active';
        await tenant.save();
        console.log('✅ Password and details updated successfully!');
    } else {
        console.log(`\n🆕 Creating new organizer: ${orgName}...`);
        tenant = await Tenant.create({
            name: orgName,
            slug: slug,
            databaseName: dbName,
            ownerEmail: email,
            password: password,
            status: 'active'
        });
        console.log('✅ Organizer created successfully!');
    }

    // Provision/warmup tenant database
    try {
        await getTenantConnection(tenant.slug, tenant.databaseName);
        console.log(`✅ Tenant database verified: ${tenant.databaseName}`);
    } catch (e) {
        console.warn('Tenant DB warmup notice:', e.message);
    }

    console.log('\n=========================================');
    console.log('🎉 ORGANIZER CREDENTIALS READY FOR LOGIN:');
    console.log('=========================================');
    console.log(`Organization Name : ${tenant.name}`);
    console.log(`Subdomain / Slug  : ${tenant.slug}`);
    console.log(`Email / Username  : ${tenant.ownerEmail}`);
    console.log(`Password          : ${password}`);
    console.log(`Database Name     : ${tenant.databaseName}`);
    console.log('=========================================\n');

    await mongoose.disconnect();
    process.exit(0);
}

setupOrganizer().catch(err => {
    console.error('❌ Failed to setup organizer:', err);
    process.exit(1);
});
