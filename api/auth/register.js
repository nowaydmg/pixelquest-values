import { hashPassword, createToken } from '../../lib/auth.js';
import { sql, sqlRun } from '../../lib/turso.js';
import { cors, json } from '../../lib/auth.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { username, password } = req.body || {};
    if (!username || !password) return json(res, 400, { error: 'Username and password required' });
    if (password.length < 6) return json(res, 400, { error: 'Password must be at least 6 characters' });

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    try {
        const existing = await sql('SELECT id FROM user_profiles WHERE username = ?', cleanUsername);
        if (existing.length > 0) return json(res, 409, { error: 'Username already taken' });

        const id = randomUUID();
        const hash = await hashPassword(cleanPassword);
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

        const ownerCount = await sql('SELECT COUNT(*) as cnt FROM user_profiles WHERE role = ?', 'owner');
        const role = ownerCount[0]?.cnt === 0 ? 'owner' : 'user';

        await sqlRun(
            'INSERT INTO user_profiles (id, username, password_hash, role, ip) VALUES (?, ?, ?, ?, ?)',
            id, cleanUsername, hash, role, ip
        );

        const token = await createToken({ id, username: cleanUsername, role });
        return json(res, 201, {
            success: true,
            token,
            user: { id, username: cleanUsername, role }
        });
    } catch (err) {
        console.error('Register error:', err);
        return json(res, 500, { error: 'Registration failed' });
    }
}
