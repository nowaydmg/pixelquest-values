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

    if (req.method === 'POST') {
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

    return res.status(405).json({ error: 'Method not allowed' });
}
