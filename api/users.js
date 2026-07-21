import { sql, sqlRun } from '../../lib/turso.js';
import { getUserFromRequest, cors, json, SAFE_USER_FIELDS } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
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

    if (req.method === 'PUT') {
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

    return res.status(405).json({ error: 'Method not allowed' });
}
