import { sqlRun } from '../turso.js';
import { getUserFromRequest, cors, json } from '../auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = await getUserFromRequest(req);
    if (!user || !['admin', 'owner'].includes(user.role)) return json(res, 403, { error: 'Forbidden' });

    const { username, action } = req.body || {};
    if (!username || !action) return json(res, 400, { error: 'username and action required' });

    try {
        if (action === 'ban') {
            await sqlRun('UPDATE user_profiles SET banned = 1 WHERE username = ?', username);
            return json(res, 200, { success: true, action: 'banned', username });
        }
        if (action === 'unban') {
            await sqlRun('UPDATE user_profiles SET banned = 0 WHERE username = ?', username);
            return json(res, 200, { success: true, action: 'unbanned', username });
        }
        return json(res, 400, { error: 'Unknown action' });
    } catch (err) {
        console.error('user-action:', err);
        return json(res, 500, { error: 'Failed' });
    }
}
