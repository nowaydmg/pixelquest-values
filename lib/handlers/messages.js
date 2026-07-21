import { sql, sqlRun } from '../turso.js';
import { getUserFromRequest, cors, json, validateInput } from '../auth.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace('/api/messages', '');

    // GET /api/messages (list direct messages)
    if (path === '' && req.method === 'GET') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });
        try {
            const rows = await sql('SELECT * FROM messages ORDER BY created_at ASC');
            const filtered = rows.filter(r => r.from_user === user.username || r.to_user === user.username || ['moderator', 'admin', 'owner'].includes(user.role));
            return json(res, 200, filtered.map(r => ({
                id: r.id, from: r.from_user, to: r.to_user, text: r.text, createdAt: r.created_at
            })));
        } catch (err) {
            console.error('getMessages:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    // POST /api/messages (send direct message)
    if (path === '' && req.method === 'POST') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { to, text } = req.body || {};
        if (!to || !text) return json(res, 400, { error: 'Recipient and text required' });

        const inputError = validateInput({ text });
        if (inputError) return json(res, 400, { error: inputError });

        try {
            const id = randomUUID();
            await sqlRun('INSERT INTO messages (id, from_user, to_user, text) VALUES (?, ?, ?, ?)',
                id, user.username, to, text);
            return json(res, 201, { id, from: user.username, to, text });
        } catch (err) {
            console.error('addMessage:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    // GET /api/messages/notifications (list notifications)
    if (path === '/notifications' && req.method === 'GET') {
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

    // POST /api/messages/notifications (create notification)
    if (path === '/notifications' && req.method === 'POST') {
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

    // PUT /api/messages/notifications (mark notification as seen)
    if (path === '/notifications' && req.method === 'PUT') {
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

    return json(res, 404, { error: 'Not found' });
}
