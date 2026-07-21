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
            const rows = await sql('SELECT * FROM watchlist');
            const grouped = {};
            for (const r of rows) {
                if (!grouped[r.username]) grouped[r.username] = [];
                grouped[r.username].push(r.item_name);
            }
            return json(res, 200, grouped);
        } catch (err) {
            console.error('getWatchlist:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    if (req.method === 'POST') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { itemName } = req.body || {};
        if (!itemName) return json(res, 400, { error: 'Item name required' });

        const inputError = validateInput({ name: itemName });
        if (inputError) return json(res, 400, { error: inputError });

        try {
            await sqlRun('INSERT OR IGNORE INTO watchlist (id, username, item_name) VALUES (?, ?, ?)',
                randomUUID(), user.username, itemName);
            return json(res, 201, { success: true });
        } catch (err) {
            console.error('addWatchlist:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    if (req.method === 'DELETE') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { itemName } = req.query || {};
        if (!itemName) return json(res, 400, { error: 'Item name required' });

        try {
            await sqlRun('DELETE FROM watchlist WHERE username = ? AND item_name = ?', user.username, itemName);
            return json(res, 200, { success: true });
        } catch (err) {
            console.error('removeWatchlist:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
