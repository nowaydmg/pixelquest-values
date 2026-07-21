import { sql, sqlRun } from '../../lib/turso.js';
import { getUserFromRequest, cors, json, validateInput } from '../../lib/auth.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        try {
            const rows = await sql('SELECT * FROM trade_requests ORDER BY created_at DESC');
            return json(res, 200, rows.map(r => ({
                id: r.id, requester: r.requester, itemName: r.item_name,
                cp: r.cp, quantity: r.quantity, message: r.message, createdAt: r.created_at
            })));
        } catch (err) {
            console.error('getRequests:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    if (req.method === 'POST') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { itemName, cp, quantity, message } = req.body || {};
        if (!itemName) return json(res, 400, { error: 'Item name required' });

        const inputError = validateInput({ name: itemName, message });
        if (inputError) return json(res, 400, { error: inputError });

        try {
            const id = randomUUID();
            await sqlRun(
                'INSERT INTO trade_requests (id, requester, item_name, cp, quantity, message) VALUES (?, ?, ?, ?, ?, ?)',
                id, user.username, itemName, cp ?? null, quantity || 1, message || null
            );
            return json(res, 201, { id, requester: user.username, itemName, cp, quantity: quantity || 1, message });
        } catch (err) {
            console.error('addRequest:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    if (req.method === 'DELETE') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { id } = req.query || {};
        if (!id) return json(res, 400, { error: 'ID required' });

        try {
            const rows = await sql('SELECT requester FROM trade_requests WHERE id = ?', id);
            if (rows.length === 0) return json(res, 404, { error: 'Not found' });
            if (rows[0].requester !== user.username && !['admin', 'owner'].includes(user.role)) {
                return json(res, 403, { error: 'Forbidden' });
            }
            await sqlRun('DELETE FROM trade_requests WHERE id = ?', id);
            return json(res, 200, { success: true });
        } catch (err) {
            console.error('deleteRequest:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
