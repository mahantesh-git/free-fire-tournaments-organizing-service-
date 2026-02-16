import express from 'express';
import { tenantResolver } from '../middlewares/tenantResolver.js';

const router = express.Router();

// Test endpoint to check tenant resolution
router.get('/test', tenantResolver, (req, res) => {
    res.json({
        success: true,
        message: 'Tenant resolution successful',
        tenant: {
            name: req.tenant?.name,
            slug: req.tenant?.slug,
            databaseName: req.tenant?.databaseName
        },
        hasConnection: !!req.tenantConnection
    });
});

export default router;
