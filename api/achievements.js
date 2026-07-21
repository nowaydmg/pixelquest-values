import { sql, sqlRun } from '../../lib/turso.js';
import { getUserFromRequest, cors, json, validateInput } from '../../lib/auth.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        try {
            const rows = await sql('SELECT * FROM achievements');
            const grouped = {};
            for (const r of rows) {
                if (!grouped[r.username]) grouped[r.username] = [];
                grouped[r.username].push(r.achievement);
            }
            return json(res, 200, grouped);
        } catch (err) {
            console.error('getAchievements:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    if (req.method === 'POST') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { username, achievement } = req.body || {};
        if (!username || !achievement) return json(res, 400, { error: 'Username and achievement required' });

        const inputError = validateInput({ username, text: achievement });
        if (inputError) return json(res, 400, { error: inputError });

        try {
            await sqlRun('INSERT OR IGNORE INTO achievements (id, username, achievement) VALUES (?, ?, ?)',
                randomUUID(), username, achievement);
            return json(res, 201, { success: true });
        } catch (err) {
            console.error('addAchievement:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
