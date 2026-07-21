import { sql, sqlRun } from '../../lib/turso.js';
import { getUserFromRequest, cors, json, validateInput } from '../../lib/auth.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        try {
            const rows = await sql('SELECT * FROM trade_offers ORDER BY created_at DESC');
            return json(res, 200, rows.map(r => ({
                id: r.id, seller: r.seller, itemName: r.item_name,
                price: r.price, message: r.message, createdAt: r.created_at
            })));
        } catch (err) {
            console.error('getOffers:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    if (req.method === 'POST') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { seller, itemName, price, message } = req.body || {};
        if (!itemName) return json(res, 400, { error: 'Item name required' });

        const inputError = validateInput({ name: itemName, price, message });
        if (inputError) return json(res, 400, { error: inputError });

        try {
            const id = randomUUID();
            await sqlRun(
                'INSERT INTO trade_offers (id, seller, item_name, price, message) VALUES (?, ?, ?, ?, ?)',
                id, user.username, itemName, price || null, message || null
            );
            return json(res, 201, { id, seller: user.username, itemName, price, message });
        } catch (err) {
            console.error('addOffer:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    if (req.method === 'DELETE') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { id } = req.query || {};
        if (!id) return json(res, 400, { error: 'ID required' });

        try {
            const rows = await sql('SELECT seller FROM trade_offers WHERE id = ?', id);
            if (rows.length === 0) return json(res, 404, { error: 'Not found' });
            if (rows[0].seller !== user.username && !['admin', 'owner'].includes(user.role)) {
                return json(res, 403, { error: 'Forbidden' });
            }
            await sqlRun('DELETE FROM trade_offers WHERE id = ?', id);
            return json(res, 200, { success: true });
        } catch (err) {
            console.error('deleteOffer:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
