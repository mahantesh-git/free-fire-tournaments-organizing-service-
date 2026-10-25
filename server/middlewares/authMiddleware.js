import jwt from 'jsonwebtoken';
import Tenant from '../models/global/Tenant.js';
import { getTenantConnection } from '../config/dbManager.js';

/**
 * Middleware to check if user is authorized to update kills
 * Allows both organizers (via tenant) and assigned moderators
 * Uses JWT tokens from Authorization header
 */
const checkKillUpdateAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Authorization header missing.'
            });
        }

        const token = authHeader.split(' ')[1];
        let decoded;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.error('--- JWT VERIFY FAIL ---', err.message);
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        const resolvedTenantSlug = req.tenant?.slug;
        const resolvedTenantId = req.tenant?._id?.toString();

        console.log('--- AUTH MIDDLEWARE ---', {
            path: req.path,
            decodedId: decoded.id,
            decodedRole: decoded.role,
            resolvedTenantId: req.tenant?._id,
            resolvedTenantSlug: resolvedTenantSlug
        });

        // Case 1: Moderator
        if (decoded.role === 'moderator') {
            req.isModerator = true;
            req.moderatorId = decoded.id;

            // FETCH FRESH DATA FROM DB TO PREVENT STALE PERMISSIONS
            const { moderatorSchema } = await import('../models/tenant/Moderator.js');
            const { getTenantModel } = await import('../utils/tenantModel.js');
            const Moderator = getTenantModel(req.tenantConnection, 'Moderator', moderatorSchema);
            const moderator = await Moderator.findById(decoded.id).lean();

            if (!moderator || !moderator.isActive) {
                console.warn('Moderator auth failed: Inactive or not found', { id: decoded.id });
                return res.status(403).json({ success: false, message: 'Moderator account inactive or revoked. Please login again.' });
            }

            // Validate tokenVersion — if organizer regenerated access code or revoked,
            // the DB tokenVersion is bumped and the old JWT becomes invalid instantly.
            const dbTokenVersion = moderator.tokenVersion || 0;
            const jwtTokenVersion = decoded.tokenVersion ?? -1; // old tokens without version fail
            if (jwtTokenVersion !== dbTokenVersion) {
                console.warn('Moderator auth failed: Token version mismatch (revoked/regenerated)', {
                    id: decoded.id,
                    jwtVersion: jwtTokenVersion,
                    dbVersion: dbTokenVersion
                });
                return res.status(401).json({
                    success: false,
                    message: 'Your session has been invalidated. The organizer has revoked or regenerated your access. Please login again.'
                });
            }

            req.assignedSquads = moderator.assignedSquads || [];
            req.assignedRooms = moderator.assignedRooms || [];
            return next();
        }

        // Case 2: Organizer
        if (decoded.role === 'organizer' || (decoded.id && !decoded.role)) {
            const tokenTenantId = decoded.id.toString();

            if (req.tenant && tokenTenantId === resolvedTenantId) {
                // Check if account is active
                if (req.tenant.status && req.tenant.status !== 'active') {
                    return res.status(403).json({
                        success: false,
                        message: 'Organization account is inactive or suspended'
                    });
                }

                // Check tokenVersion (invalidated on logout)
                const dbTokenVersion = req.tenant.tokenVersion || 0;
                const jwtTokenVersion = decoded.tokenVersion ?? 0;
                if (jwtTokenVersion !== dbTokenVersion) {
                    console.warn('Organizer auth failed: Token version mismatch (logged out)', {
                        id: decoded.id,
                        jwtVersion: jwtTokenVersion,
                        dbVersion: dbTokenVersion
                    });
                    return res.status(401).json({
                        success: false,
                        message: 'Your session has ended or you have logged out. Please log in again.'
                    });
                }

                req.isOrganizer = true;
                return next();
            } else {
                console.warn('❌ [Auth Middleware] ID Mismatch:', {
                    tokenTenantId,
                    resolvedTenantId,
                    tokenRole: decoded.role || 'NONE'
                });
                return res.status(403).json({
                    success: false,
                    message: `Organization mismatch. Your session is for a different organization. Please logout and login again for the current organization (${resolvedTenantSlug || 'unknown'}).`
                });
            }
        }

        return res.status(403).json({
            success: false,
            message: 'Unauthorized access'
        });

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

/**
 * Middleware to validate moderator has access to specific squad
 * Use this AFTER checkKillUpdateAuth
 */
const validateSquadAccess = (getSquadIdFromReq) => {
    return async (req, res, next) => {
        try {
            // Organizers have access to all squads
            if (req.isOrganizer) {
                return next();
            }

            // For moderators, check squad assignment
            if (req.isModerator) {
                const squadId = getSquadIdFromReq(req);

                if (!squadId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Squad ID is required'
                    });
                }

                // 1. Check direct squad assignment
                const hasDirectAccess = req.assignedSquads.some(
                    id => id.toString() === squadId.toString()
                );

                if (hasDirectAccess) return next();

                // 2. Check room assignment (if moderator is assigned to a room, they access all squads in it)
                if (req.assignedRooms && req.assignedRooms.length > 0) {
                    const roomSchema = (await import('../models/tenant/Room.js')).default;
                    const { getTenantModel } = await import('../utils/tenantModel.js');
                    const Room = getTenantModel(req.tenantConnection, 'Room', roomSchema);

                    const room = await Room.findOne({
                        squads: squadId,
                        _id: { $in: req.assignedRooms }
                    });

                    if (room) return next();
                }

                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to update this squad'
                });
            }

            // Should not reach here
            res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });

        } catch (error) {
            console.error('Squad access validation error:', error);
            res.status(500).json({
                success: false,
                message: 'Authorization error'
            });
        }
    };
};

export {
    checkKillUpdateAuth,
    validateSquadAccess
};
