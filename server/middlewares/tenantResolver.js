import Tenant from '../models/global/Tenant.js';
import { getTenantConnection } from '../config/dbManager.js';

export const tenantResolver = async (req, res, next) => {
    try {
        // 1. Identify Tenant
        // Priority: Header 'x-tenant-id' > Subdomain
        let tenantSlug = req.headers['x-tenant-id'];

        if (!tenantSlug) {
            // Check subdomain (simplified logic for localhost/production)
            const host = req.get('host'); // e.g., tenant1.localhost:3000 or tenant1.platform.com
            const subdomain = host.split('.')[0];

            // Ignore 'localhost' or 'www' or main domain if likely not a tenant
            if (subdomain && subdomain !== 'localhost' && subdomain !== 'www' && subdomain !== 'api') {
                tenantSlug = subdomain;
            }
        }

        if (!tenantSlug) {
            return res.status(400).json({ error: 'Tenant identification missing (Header or Subdomain)' });
        }

        // 2. Fetch Tenant Metadata from Global DB
        const tenant = await Tenant.findOne({ slug: tenantSlug });

        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        if (tenant.status !== 'active') {
            return res.status(403).json({ error: 'Tenant account is inactive' });
        }

        // 3. Get Database Connection
        const tenantConnection = await getTenantConnection(tenant.slug, tenant.databaseName);

        // 4. Attach to Request
        req.tenant = tenant;
        req.tenantConnection = tenantConnection;

        console.log('✅ [TenantResolver] Resolved:', {
            slug: tenant.slug,
            id: tenant._id.toString()
        });

        next();
    } catch (error) {
        console.error('Tenant Resolution Error:', error);
        res.status(500).json({ error: 'Internal Server Error during tenant resolution' });
    }
};
