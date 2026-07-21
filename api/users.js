import { sql, sqlRun } from '../lib/turso.js';
import { getUserFromRequest, cors, json, SAFE_USER_FIELDS, validateInput } from '../lib/auth.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace('/api/users', '');

    // GET /api/users (list all users)
    if (path === '' && req.method === 'GET') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });
        const isAdmin = ['admin', 'owner'].includes(user.role);
        try {
            const rows = await sql('SELECT id, username, role, ip, warnings, banned, created_at FROM user_profiles ORDER BY username');
            return json(res, 200, rows.map(r => ({
                id: r.id, username: r.username, role: r.role,
                ip: isAdmin ? r.ip : undefined,
                warnings: r.warnings, banned: !!r.banned, createdAt: r.created_at
            })));
        } catch (err) {
            console.error('getUsers:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    // PUT /api/users (update user field)
    if (path === '' && req.method === 'PUT') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { username, field, value } = req.body || {};
        if (!username || !field) return json(res, 400, { error: 'username and field required' });

        const dbField = SAFE_USER_FIELDS[field];
        if (!dbField) return json(res, 400, { error: 'Invalid field' });

        if (field === 'role' && value === 'owner' && user.role !== 'owner') {
            return json(res, 403, { error: 'Only owner can assign owner role' });
        }
        if (!['admin', 'owner'].includes(user.role) && field !== 'role') {
            return json(res, 403, { error: 'Forbidden' });
        }

        try {
            await sqlRun(`UPDATE user_profiles SET ${dbField} = ? WHERE username = ?`, value, username);
            return json(res, 200, { success: true });
        } catch (err) {
            console.error('updateUser:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    // GET /api/users/banned-ips (list banned IPs)
    if (path === '/banned-ips' && req.method === 'GET') {
        try {
            const rows = await sql('SELECT ip FROM banned_ips ORDER BY created_at DESC');
            return json(res, 200, rows.map(r => r.ip));
        } catch (err) {
            console.error('getBannedIps:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    // POST /api/users/banned-ips (add banned IP)
    if (path === '/banned-ips' && req.method === 'POST') {
        const user = await getUserFromRequest(req);
        if (!user || !['admin', 'owner'].includes(user.role)) return json(res, 403, { error: 'Forbidden' });

        const { ip } = req.body || {};
        if (!ip) return json(res, 400, { error: 'IP required' });

        try {
            await sqlRun('INSERT OR IGNORE INTO banned_ips (id, ip) VALUES (?, ?)', randomUUID(), ip);
            return json(res, 201, { success: true });
        } catch (err) {
            console.error('addBannedIp:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    // DELETE /api/users/banned-ips (remove banned IP)
    if (path === '/banned-ips' && req.method === 'DELETE') {
        const user = await getUserFromRequest(req);
        if (!user || !['admin', 'owner'].includes(user.role)) return json(res, 403, { error: 'Forbidden' });

        const { ip } = req.body || {};
        if (!ip) return json(res, 400, { error: 'IP required' });

        try {
            await sqlRun('DELETE FROM banned_ips WHERE ip = ?', ip);
            return json(res, 200, { success: true });
        } catch (err) {
            console.error('removeBannedIp:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    return json(res, 404, { error: 'Not found' });
}
