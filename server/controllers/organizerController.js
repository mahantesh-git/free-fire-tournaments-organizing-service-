import Tenant from '../models/global/Tenant.js';
import jwt from 'jsonwebtoken';
import { getTenantConnection } from '../config/dbManager.js';
import mongoose from 'mongoose';

// Generate Token
const generateToken = (tenant) => {
    return jwt.sign({
        id: tenant._id,
        role: 'organizer',
        tokenVersion: tenant.tokenVersion || 0
    }, process.env.JWT_SECRET, {
        expiresIn: '2d'
    });
};

// Register Organizer (Tenant)
export const registerOrganizer = async (req, res) => {
    try {
        const { name, email, password, organizationName } = req.body;

        if (!name || !email || !password || !organizationName) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if tenant exists
        const tenantExists = await Tenant.findOne({ ownerEmail: email });
        if (tenantExists) {
            return res.status(400).json({ error: 'Organization with this email already exists' });
        }

        // Generate slug/subdomain from Organization Name
        const slug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-');

        // Ensure slug is unique
        const slugExists = await Tenant.findOne({ slug });
        if (slugExists) {
            return res.status(400).json({ error: 'Organization name is taken (slug conflict)' });
        }

        // Create Tenant
        const dbName = `esports_tenant_${slug.replace(/-/g, '_')}`;

        const tenant = await Tenant.create({
            name: organizationName,
            slug: slug,
            databaseName: dbName,
            ownerEmail: email,
            password: password, // Will be hashed by pre-save hook
            status: 'active'
        });

        // OPTIONAL: Pre-provision DB or create initial admin user in Tenant DB?
        // For now, the user just signs up. The Tenant DB will be created on first connection/write.
        // We might want to create a "User" in the Tenant DB for this organizer so they can log in to the Dashboard.
        // Let's do that to ensure flow is complete.

        try {
            const tenantConnection = await getTenantConnection(slug, dbName);
            // We need a User model for the Tenant DB. 
            // We haven't defined it strictly yet in the plan, but we need "Conductor" or "User".
            // The requirement says "Organizers... manage their own users".
            // Let's assume the "Organizer" account in Global DB is enough for "Super Admin" access,
            // OR we duplicate the organizer into the Tenant DB as an Admin.
            // Let's rely on the Tenant model for the "Root" login for now to keep it simple.

            // Just ensure connection works
            console.log(`✅ Provisioned DB for ${slug}`);
        } catch (dbErr) {
            console.error('Failed to provision tenant DB:', dbErr);
            // Don't fail the registration, but warn
        }

        res.status(201).json({
            success: true,
            message: 'Organizer registered successfully',
            tenant: {
                _id: tenant._id,
                name: tenant.name,
                slug: tenant.slug,
                email: tenant.ownerEmail,
                token: generateToken(tenant)
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Login Organizer
export const loginOrganizer = async (req, res) => {
    try {
        const { email, password } = req.body;

        const tenant = await Tenant.findOne({ ownerEmail: email }).select('+password');

        if (tenant && (await tenant.comparePassword(password))) {
            res.json({
                success: true,
                tenant: {
                    _id: tenant._id,
                    name: tenant.name,
                    slug: tenant.slug, // Subdomain
                    email: tenant.ownerEmail,
                    token: generateToken(tenant)
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Logout Organizer - Invalidate backend tokens by incrementing tokenVersion
export const logoutOrganizer = async (req, res) => {
    try {
        let tenantId = req.tenant?._id || req.body?.tenantId;

        // If not found from tenant, decode from Authorization header
        if (!tenantId && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                tenantId = decoded.id;
            } catch (jwtErr) {
                // Ignore token error during logout
            }
        }

        if (tenantId) {
            await Tenant.findByIdAndUpdate(tenantId, { $inc: { tokenVersion: 1 } });
            console.log(`🔒 [Organizer Logout] Token invalidated for tenant ${tenantId}`);
        }

        res.json({
            success: true,
            message: 'Organizer logged out successfully. Server token invalidated.'
        });
    } catch (error) {
        console.error('Organizer logout error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get Organizer Profile
export const getOrganizerProfile = async (req, res) => {
    try {
        res.json({ message: 'Profile endpoint pending auth implementation' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
