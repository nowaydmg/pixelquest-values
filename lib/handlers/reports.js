import { sql, sqlRun } from '../turso.js';
import { getUserFromRequest, cors, json, validateInput } from '../auth.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });
        try {
            const rows = await sql('SELECT * FROM reports ORDER BY created_at DESC');
            const filtered = rows.filter(r => r.reporter === user.username || ['moderator', 'admin', 'owner'].includes(user.role));
            return json(res, 200, filtered.map(r => ({
                id: r.id, target: r.target, reason: r.reason,
                reporter: r.reporter, status: r.status, createdAt: r.created_at
            })));
        } catch (err) {
            console.error('getReports:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    if (req.method === 'POST') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { target, reason } = req.body || {};
        if (!target || !reason) return json(res, 400, { error: 'Target and reason required' });

        const inputError = validateInput({ name: target, reason });
        if (inputError) return json(res, 400, { error: inputError });

        try {
            const id = randomUUID();
            await sqlRun('INSERT INTO reports (id, target, reason, reporter) VALUES (?, ?, ?, ?)',
                id, target, reason, user.username);
            return json(res, 201, { id, target, reason, reporter: user.username, status: 'pending' });
        } catch (err) {
            console.error('addReport:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    if (req.method === 'PUT') {
        const user = await getUserFromRequest(req);
        if (!user || !['moderator', 'admin', 'owner'].includes(user.role)) return json(res, 403, { error: 'Forbidden' });

        const { id, status } = req.body || {};
        if (!id || !status) return json(res, 400, { error: 'ID and status required' });

        try {
            await sqlRun('UPDATE reports SET status = ? WHERE id = ?', status, id);
            return json(res, 200, { success: true });
        } catch (err) {
            console.error('updateReport:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
