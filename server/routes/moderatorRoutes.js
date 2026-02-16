import express from 'express';
import { moderatorSchema } from '../models/tenant/Moderator.js';
import squadSchema from '../models/tenant/Squad.js';
import roomSchema from '../models/tenant/Room.js';
import { getTenantModel } from '../utils/tenantModel.js';
import { checkKillUpdateAuth } from '../middlewares/authMiddleware.js';
import bcrypt from 'bcryptjs';
import { sendModeratorCredentials } from '../utils/emailService.js';
import crypto from 'crypto';

const router = express.Router();

// Helper to get tenant-specific models
const getModels = (req) => {
    return {
        Moderator: getTenantModel(req.tenantConnection, 'Moderator', moderatorSchema),
        Squad: getTenantModel(req.tenantConnection, 'Squad', squadSchema),
        Room: getTenantModel(req.tenantConnection, 'Room', roomSchema)
    };
};

/**
 * POST /api/moderators/create
 * Create a new moderator (checks limit first)
 */
router.post('/create', checkKillUpdateAuth, async (req, res) => {
    try {
        if (!req.isOrganizer) {
            return res.status(403).json({ success: false, message: 'Organizer access required' });
        }
        const { Moderator } = getModels(req);
        const { name, email, phoneNumber } = req.body;
        const tenant = req.tenant;

        if (!name || !email || !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'All fields (name, email, phone) are required'
            });
        }

        // Check current moderator count against limit
        const activeModeratorsCount = await Moderator.countDocuments({ isActive: true });

        if (activeModeratorsCount >= tenant.maxModerators) {
            return res.status(400).json({
                success: false,
                message: `Moderator limit reached (${activeModeratorsCount}/${tenant.maxModerators}). Delete inactive moderators or increase limit in settings.`
            });
        }

        // Generate unique access code
        let accessCode;
        let isUnique = false;

        while (!isUnique) {
            accessCode = Moderator.generateAccessCode();
            const existing = await Moderator.findOne({ accessCode });
            if (!existing) isUnique = true;
        }

        // Generate a secure temporary password
        const rawPassword = crypto.randomBytes(6).toString('hex').toUpperCase(); // 12 chars hex
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const moderator = new Moderator({
            name,
            email: email.toLowerCase(),
            phoneNumber,
            password: hashedPassword,
            accessCode,
            createdBy: tenant._id,
            assignedSquads: [],
            assignedRooms: []
        });

        await moderator.save();

        console.log('Moderator Created:', {
            email: moderator.email,
            rawPassword: rawPassword,
            hashedPassword: moderator.password
        });

        // Send credentials via email (Async)
        sendModeratorCredentials(
            { ...moderator.toObject(), tenantSlug: tenant.slug },
            rawPassword,
            tenant.name,
            req.get('origin')
        );

        res.status(201).json({
            success: true,
            message: 'Moderator created and credentials mailed.',
            moderator: {
                _id: moderator._id,
                name: moderator.name,
                email: moderator.email,
                phoneNumber: moderator.phoneNumber,
                accessCode: moderator.accessCode,
                isActive: moderator.isActive,
                createdAt: moderator.createdAt
            }
        });

    } catch (error) {
        console.error('Error creating moderator:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating moderator',
            error: error.message
        });
    }
});

/**
 * GET /api/moderators/list
 * List all moderators with limit status
 */
router.get('/list', checkKillUpdateAuth, async (req, res) => {
    try {
        if (!req.isOrganizer) {
            return res.status(403).json({ success: false, message: 'Organizer access required' });
        }
        const { Moderator } = getModels(req);
        const tenant = req.tenant;

        const moderators = await Moderator.find()
            .populate('assignedSquads', 'squadName')
            .populate('assignedRooms', 'roomNumber')
            .sort({ createdAt: -1 });

        const activeModeratorsCount = moderators.filter(m => m.isActive).length;

        res.json({
            success: true,
            moderators,
            limit: {
                current: activeModeratorsCount,
                max: tenant.maxModerators,
                available: tenant.maxModerators - activeModeratorsCount
            }
        });

    } catch (error) {
        console.error('Error listing moderators:', error);
        res.status(500).json({
            success: false,
            message: 'Error listing moderators'
        });
    }
});

/**
 * PUT /api/moderators/:id/assign
 * Assign squads/rooms to moderator
 */
router.put('/:id/assign', checkKillUpdateAuth, async (req, res) => {
    try {
        if (!req.isOrganizer) {
            return res.status(403).json({ success: false, message: 'Organizer access required' });
        }
        const { Moderator } = getModels(req);
        const { id } = req.params;
        const { squadIds, roomIds } = req.body;

        const moderator = await Moderator.findById(id);
        if (!moderator) {
            return res.status(404).json({
                success: false,
                message: 'Moderator not found'
            });
        }

        if (squadIds) moderator.assignedSquads = squadIds;
        if (roomIds) moderator.assignedRooms = roomIds;

        await moderator.save();

        res.json({
            success: true,
            message: 'Moderator assignments updated',
            moderator
        });

    } catch (error) {
        console.error('Error assigning moderator:', error);
        res.status(500).json({
            success: false,
            message: 'Error assigning moderator'
        });
    }
});

/**
 * DELETE /api/moderators/:id
 * Revoke moderator access (soft delete)
 */
router.delete('/:id', checkKillUpdateAuth, async (req, res) => {
    try {
        if (!req.isOrganizer) {
            return res.status(403).json({ success: false, message: 'Organizer access required' });
        }
        const { Moderator } = getModels(req);
        const { id } = req.params;

        const moderator = await Moderator.findById(id);
        if (!moderator) {
            return res.status(404).json({
                success: false,
                message: 'Moderator not found'
            });
        }

        moderator.isActive = false;
        await moderator.save();

        res.json({
            success: true,
            message: 'Moderator access revoked'
        });

    } catch (error) {
        console.error('Error deleting moderator:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting moderator'
        });
    }
});

/**
 * PUT /api/moderators/:id/regenerate
 * Regenerate access code if compromised
 */
router.put('/:id/regenerate', checkKillUpdateAuth, async (req, res) => {
    try {
        if (!req.isOrganizer) {
            return res.status(403).json({ success: false, message: 'Organizer access required' });
        }
        const { Moderator } = getModels(req);
        const { id } = req.params;

        const moderator = await Moderator.findById(id);
        if (!moderator) {
            return res.status(404).json({
                success: false,
                message: 'Moderator not found'
            });
        }

        // Generate new unique access code
        let accessCode;
        let isUnique = false;

        while (!isUnique) {
            accessCode = Moderator.generateAccessCode();
            const existing = await Moderator.findOne({ accessCode });
            if (!existing || existing._id.toString() === id) isUnique = true;
        }

        moderator.accessCode = accessCode;
        await moderator.save();

        res.json({
            success: true,
            message: 'Access code regenerated',
            accessCode: moderator.accessCode
        });

    } catch (error) {
        console.error('Error regenerating access code:', error);
        res.status(500).json({
            success: false,
            message: 'Error regenerating access code'
        });
    }
});

import jwt from 'jsonwebtoken';

// Helper to generate token
const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '24h'
    });
};

/**
 * POST /api/moderators/auth
 * Authenticate moderator with access code
 */
router.post('/auth', async (req, res) => {
    try {
        const { Moderator } = getModels(req);
        const { accessCode, email, password } = req.body;

        console.log('Moderator Auth Attempt:', { accessCode, email });

        let moderator;

        if (email && password) {
            // Login via Email, Password, AND Access Code
            // Gracefully handle duplicates by picking the latest one
            const moderators = await Moderator.find({
                email: email.toLowerCase(),
                accessCode: accessCode, // Must match accessCode too
                isActive: true
            })
                .populate('assignedSquads', 'squadName')
                .populate('assignedRooms', 'roomNumber')
                .sort({ createdAt: -1 })
                .limit(1);

            moderator = moderators[0];

            if (moderator) {
                const isMatch = await bcrypt.compare(password, moderator.password);
                console.log('Password Comparison:', {
                    email: email.toLowerCase(),
                    providedPassword: password,
                    providedAccessCode: accessCode,
                    storedHash: moderator.password,
                    isMatch
                });

                if (!isMatch) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials'
                    });
                }
            } else {
                console.log('Moderator not found for Email/AccessCode combo:', {
                    email: email.toLowerCase(),
                    accessCode: accessCode
                });
            }
        }

        if (!moderator) {
            console.log('Authentication Failed: Invalid credentials or inactive', { email: email?.toLowerCase() });
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials or moderator is inactive'
            });
        }

        // Generate JWT token
        const token = generateToken({
            id: moderator._id,
            role: 'moderator',
            tenantSlug: req.tenant.slug,
            assignedSquads: moderator.assignedSquads.map(s => s._id),
            assignedRooms: moderator.assignedRooms.map(r => r._id)
        });

        res.json({
            success: true,
            message: 'Authentication successful',
            moderator: {
                id: moderator._id,
                name: moderator.name,
                assignedSquads: moderator.assignedSquads,
                assignedRooms: moderator.assignedRooms
            },
            token: token
        });

    } catch (error) {
        console.error('Error authenticating moderator:', error);
        res.status(500).json({
            success: false,
            message: 'Error authenticating moderator'
        });
    }
});

/**
 * GET /api/moderators/my-squads
 * Get assigned squads for logged-in moderator
 */
router.get('/my-squads', checkKillUpdateAuth, async (req, res) => {
    try {
        const { Moderator } = getModels(req);

        // Use ID from token (set in checkKillUpdateAuth)
        const moderatorId = req.isModerator ? req.moderatorId : req.query.moderatorId;

        if (!moderatorId) {
            return res.status(400).json({
                success: false,
                message: 'Moderator ID is required'
            });
        }

        const moderator = await Moderator.findById(moderatorId)
            .populate('assignedSquads')
            .populate('assignedRooms');

        if (!moderator) {
            return res.status(404).json({
                success: false,
                message: 'Moderator not found'
            });
        }

        // Filter out nulls (missing documents that were deleted)
        moderator.assignedSquads = (moderator.assignedSquads || []).filter(s => s !== null);
        moderator.assignedRooms = (moderator.assignedRooms || []).filter(r => r !== null);

        // 1. Get explicitly assigned rooms (store original list for badge logic)
        const explicitRooms = [...moderator.assignedRooms];
        let allRooms = [...explicitRooms];

        // 2. Derive rooms from assigned squads
        if (moderator.assignedSquads && moderator.assignedSquads.length > 0) {
            const { Room } = getModels(req);
            const squadIds = moderator.assignedSquads.map(s => s._id);

            // Find rooms that contain any of these squads
            const extraRooms = await Room.find({
                squads: { $in: squadIds }
            }).lean();

            // Merge and remove duplicates
            const existingRoomIds = new Set(allRooms.map(r => r._id.toString()));
            extraRooms.forEach(room => {
                if (!existingRoomIds.has(room._id.toString())) {
                    allRooms.push(room);
                }
            });
        }

        // Sort rooms by room number for consistent UI
        allRooms.sort((a, b) => (a.roomNumber || 0) - (b.roomNumber || 0));

        res.json({
            success: true,
            squads: moderator.assignedSquads,
            assignedRooms: explicitRooms, // Explicitly assigned
            rooms: allRooms // Total available rooms (explicit + derived)
        });

    } catch (error) {
        console.error('Error fetching moderator squads:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching assigned squads'
        });
    }
});

/**
 * POST /api/moderators/logout
 * Logout moderator
 */
router.post('/logout', async (req, res) => {
    try {
        // Stateless JWT logout is handled on the client side by clearing the token.
        // We can just return success here.
        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Error logging out:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging out'
        });
    }
});

export default router;
