/**
 * Audit Middleware - Automatically logs administrative actions
 * Usage: Add to routes that need audit tracking
 */

const auditMiddleware = (action, targetType) => {
    return async (req, res, next) => {
        // Store original send function
        const originalSend = res.send;

        // Override send to capture response
        res.send = function (data) {
            // Restore original send
            res.send = originalSend;

            // Log the action after successful response
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Don't await - fire and forget
                logAuditAction(req, action, targetType, data).catch(err => {
                    console.error('Audit logging failed:', err);
                });
            }

            // Send the response
            return originalSend.call(this, data);
        };

        next();
    };
};

/**
 * Helper function to create audit log
 */
async function logAuditAction(req, action, targetType, responseData) {
    try {
        // Skip if no history service available
        if (!req.historyService) return;

        const logData = {
            tournamentId: req.body.tournamentId || req.params.tournamentId || req.query.tournamentId,
            action,
            performedBy: {
                userId: req.user?._id || req.moderator?._id || req.tenant?._id,
                role: req.user ? 'ORGANIZER' : req.moderator ? 'MODERATOR' : 'ADMIN',
                email: req.user?.ownerEmail || req.moderator?.email || req.tenant?.ownerEmail,
                name: req.user?.name || req.moderator?.name || req.tenant?.name
            },
            target: {
                type: targetType,
                id: req.params.id || req.body._id || responseData?._id,
                name: req.body.name || req.body.squadName || req.body.playerName
            },
            changes: {
                before: new Map(),
                after: new Map(Object.entries(req.body || {}))
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            success: true
        };

        await req.historyService.logAction(logData);
    } catch (error) {
        console.error('Failed to log audit action:', error);
    }
}

/**
 * Middleware to attach history service to request
 */
const attachHistoryService = async (req, res, next) => {
    if (req.tenantConnection) {
        try {
            const { default: HistoryService } = await import('../services/historyService.js');
            req.historyService = new HistoryService(req.tenantConnection);
        } catch (error) {
            console.error('Failed to load HistoryService:', error);
        }
    }
    next();
};

export { auditMiddleware, attachHistoryService };
