import { sql, sqlRun } from '../../lib/turso.js';
import { getUserFromRequest, cors, json, validateInput } from '../../lib/auth.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        try {
            const rows = await sql('SELECT * FROM items ORDER BY created_at DESC');
            return json(res, 200, rows.map(r => ({
                id: r.id, icon: r.icon, name: r.name,
                corruptedPages: r.corrupted_pages, tier: r.tier,
                rarity: r.rarity, type: r.type, createdAt: r.created_at
            })));
        } catch (err) {
            console.error('getItems:', err);
            return json(res, 500, { error: 'Failed to fetch items' });
        }
    }

    if (req.method === 'POST') {
        const user = await getUserFromRequest(req);
        if (!user || !['admin', 'owner'].includes(user.role)) return json(res, 403, { error: 'Forbidden' });

        const { icon, name, corruptedPages, tier, rarity, type } = req.body || {};
        if (!name || !type) return json(res, 400, { error: 'Name and type required' });

        const inputError = validateInput({ name, icon, type, tier });
        if (inputError) return json(res, 400, { error: inputError });

        try {
            const id = randomUUID();
            await sqlRun(
                'INSERT INTO items (id, icon, name, corrupted_pages, tier, rarity, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
                id, icon || null, name, corruptedPages ?? null, tier || null, rarity || 'Common', type
            );
            return json(res, 201, { id, icon: icon || null, name, corruptedPages: corruptedPages ?? null, tier: tier || null, rarity: rarity || 'Common', type });
        } catch (err) {
            console.error('addItem:', err);
            return json(res, 500, { error: 'Failed to add item' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
