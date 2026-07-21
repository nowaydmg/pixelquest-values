import { getUserFromRequest, cors, json } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return json(res, 401, { error: 'Not authenticated' });

    return json(res, 200, {
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
            ip: user.ip,
            warnings: user.warnings,
            banned: user.banned,
            createdAt: user.created_at
        }
    });
}
