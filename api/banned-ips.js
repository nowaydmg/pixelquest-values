import { sql, sqlRun } from '../../lib/turso.js';
import { getUserFromRequest, cors, json, validateInput } from '../../lib/auth.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        try {
            const rows = await sql('SELECT ip FROM banned_ips ORDER BY created_at DESC');
            return json(res, 200, rows.map(r => r.ip));
        } catch (err) {
            console.error('getBannedIps:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    if (req.method === 'POST') {
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

    if (req.method === 'DELETE') {
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

    return res.status(405).json({ error: 'Method not allowed' });
}
