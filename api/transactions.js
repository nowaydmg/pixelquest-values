import { sql, sqlRun } from '../lib/turso.js';
import { getUserFromRequest, cors, json, validateInput } from '../lib/auth.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        try {
            const rows = await sql('SELECT * FROM transaction_history ORDER BY created_at DESC');
            return json(res, 200, rows.map(r => ({
                id: r.id, offerId: r.offer_id, buyer: r.buyer, seller: r.seller,
                item: r.item, price: r.price, rating: r.rating, comment: r.comment, createdAt: r.created_at
            })));
        } catch (err) {
            console.error('getTransactions:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    if (req.method === 'POST') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { offerId, buyer, seller, item, price, rating, comment } = req.body || {};
        if (!buyer || !seller || !item) return json(res, 400, { error: 'buyer, seller, item required' });

        const inputError = validateInput({ name: item, price, text: comment });
        if (inputError) return json(res, 400, { error: inputError });

        try {
            await sqlRun(
                'INSERT INTO transaction_history (id, offer_id, buyer, seller, item, price, rating, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                randomUUID(), offerId || null, buyer, seller, item, price || null, rating || null, comment || null
            );
            return json(res, 201, { success: true });
        } catch (err) {
            console.error('addTransaction:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
