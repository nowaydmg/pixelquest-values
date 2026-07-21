import { sql, sqlRun } from '../../lib/turso.js';
import { getUserFromRequest, cors, json, validateInput } from '../../lib/auth.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });
        try {
            const rows = await sql('SELECT * FROM notifications ORDER BY created_at DESC');
            const filtered = rows.filter(r => r.recipient === user.username || r.recipient === 'all' || ['moderator', 'admin', 'owner'].includes(user.role));
            return json(res, 200, filtered.map(r => ({
                id: r.id, to: r.recipient, text: r.text, seen: !!r.seen, createdAt: r.created_at
            })));
        } catch (err) {
            console.error('getNotifications:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    if (req.method === 'POST') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { recipient, text } = req.body || {};
        if (!text) return json(res, 400, { error: 'Text required' });

        const inputError = validateInput({ text });
        if (inputError) return json(res, 400, { error: inputError });

        try {
            const id = randomUUID();
            await sqlRun('INSERT INTO notifications (id, recipient, text) VALUES (?, ?, ?)',
                id, recipient || 'all', text);
            return json(res, 201, { id, to: recipient || 'all', text, seen: false });
        } catch (err) {
            console.error('addNotification:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    if (req.method === 'PUT') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { id } = req.body || {};
        if (!id) return json(res, 400, { error: 'ID required' });

        try {
            await sqlRun('UPDATE notifications SET seen = 1 WHERE id = ?', id);
            return json(res, 200, { success: true });
        } catch (err) {
            console.error('clearNotification:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
