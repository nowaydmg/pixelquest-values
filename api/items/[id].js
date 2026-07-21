import { sql, sqlRun } from '../../lib/turso.js';
import { getUserFromRequest, cors, json } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query || {};

    if (req.method === 'PUT') {
        const user = await getUserFromRequest(req);
        if (!user || !['admin', 'owner'].includes(user.role)) return json(res, 403, { error: 'Forbidden' });

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

    if (req.method === 'DELETE') {
        const user = await getUserFromRequest(req);
        if (!user || !['admin', 'owner'].includes(user.role)) return json(res, 403, { error: 'Forbidden' });

        try {
            await sqlRun('DELETE FROM items WHERE id = ?', id);
            return json(res, 200, { success: true });
        } catch (err) {
            console.error('deleteItem:', err);
            return json(res, 500, { error: 'Failed to delete item' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
