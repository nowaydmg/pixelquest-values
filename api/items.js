import { sql, sqlRun } from '../lib/turso.js';
import { getUserFromRequest, cors, json, validateInput } from '../lib/auth.js';
import { randomUUID } from 'crypto';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '5mb'
        }
    }
};

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace('/api/items', '');
    const { id } = req.query || {};

    // GET /api/items (list all)
    if (path === '' && req.method === 'GET') {
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

    // POST /api/items (create)
    if (path === '' && req.method === 'POST') {
        const user = await getUserFromRequest(req);
        if (!user || !['value manager', 'admin', 'owner'].includes(user.role)) return json(res, 403, { error: 'Forbidden' });

        const { icon, name, corruptedPages, tier, rarity, type } = req.body || {};
        if (!name || !type) return json(res, 400, { error: 'Name and type required' });

        const inputError = validateInput({ name, icon, type, tier });
        if (inputError) return json(res, 400, { error: inputError });

        try {
            const itemId = randomUUID();
            await sqlRun(
                'INSERT INTO items (id, icon, name, corrupted_pages, tier, rarity, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
                itemId, icon || null, name, corruptedPages ?? null, tier || null, rarity || 'Common', type
            );
            return json(res, 201, { id: itemId, icon: icon || null, name, corruptedPages: corruptedPages ?? null, tier: tier || null, rarity: rarity || 'Common', type });
        } catch (err) {
            console.error('addItem:', err);
            return json(res, 500, { error: 'Failed to add item' });
        }
    }

    // PUT /api/items?id=xxx (update)
    if (path === '' && req.method === 'PUT' && id) {
        const user = await getUserFromRequest(req);
        if (!user || !['value manager', 'admin', 'owner'].includes(user.role)) return json(res, 403, { error: 'Forbidden' });

        const { icon, name, corruptedPages, tier, rarity, type } = req.body || {};
        try {
            const sets = [];
            const args = [];
            if (icon !== undefined) { sets.push('icon = ?'); args.push(icon); }
            if (name !== undefined) { sets.push('name = ?'); args.push(name); }
            if (corruptedPages !== undefined) { sets.push('corrupted_pages = ?'); args.push(corruptedPages); }
            if (tier !== undefined) { sets.push('tier = ?'); args.push(tier); }
            if (rarity !== undefined) { sets.push('rarity = ?'); args.push(rarity); }
            if (type !== undefined) { sets.push('type = ?'); args.push(type); }
            if (sets.length === 0) return json(res, 400, { error: 'No fields to update' });
            args.push(id);
            await sqlRun(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`, ...args);
            return json(res, 200, { success: true });
        } catch (err) {
            console.error('updateItem:', err);
            return json(res, 500, { error: 'Failed to update item' });
        }
    }

    // DELETE /api/items?id=xxx (delete)
    if (path === '' && req.method === 'DELETE' && id) {
        const user = await getUserFromRequest(req);
        if (!user || !['value manager', 'admin', 'owner'].includes(user.role)) return json(res, 403, { error: 'Forbidden' });

        try {
            await sqlRun('DELETE FROM items WHERE id = ?', id);
            return json(res, 200, { success: true });
        } catch (err) {
            console.error('deleteItem:', err);
            return json(res, 500, { error: 'Failed to delete item' });
        }
    }

    return json(res, 404, { error: 'Not found' });
}
