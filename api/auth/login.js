import { verifyPassword, createToken } from '../../lib/auth.js';
import { sql } from '../../lib/turso.js';
import { cors, json } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { username, password } = req.body || {};
    if (!username || !password) return json(res, 400, { error: 'Username and password required' });

    try {
        const rows = await sql('SELECT * FROM user_profiles WHERE username = ?', username.trim());
        const user = rows[0];
        if (!user) return json(res, 401, { error: 'Invalid credentials' });

        const valid = await verifyPassword(password.trim(), user.password_hash);
        if (!valid) return json(res, 401, { error: 'Invalid credentials' });

        if (user.banned) return json(res, 403, { error: 'Account is banned' });

        const token = await createToken({ id: user.id, username: user.username, role: user.role });
        return json(res, 200, {
            success: true,
            token,
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
    } catch (err) {
        console.error('Login error:', err);
        return json(res, 500, { error: 'Login failed' });
    }
}
