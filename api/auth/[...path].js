import { verifyPassword, hashPassword, createToken, getUserFromRequest, cors, json, setAuthCookie, clearAuthCookie, generateCsrfToken, validateCsrfToken, setCsrfCookie } from '../../lib/auth.js';
import { sql, sqlRun } from '../../lib/turso.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace('/api/auth', '');

    if (path === '/csrf' && req.method === 'GET') {
        const csrfToken = generateCsrfToken();
        setCsrfCookie(res, csrfToken);
        return json(res, 200, { csrfToken });
    }

    if (path === '/login' && req.method === 'POST') {
        const { username, password, csrfToken } = req.body || {};
        if (!username || !password) return json(res, 400, { error: 'Username and password required' });
        if (!validateCsrfToken(csrfToken, req)) return json(res, 403, { error: 'Invalid CSRF token' });

        try {
            const rows = await sql('SELECT * FROM user_profiles WHERE username = ?', username.trim());
            const user = rows[0];
            if (!user) return json(res, 401, { error: 'Invalid credentials' });

            const valid = await verifyPassword(password.trim(), user.password_hash);
            if (!valid) return json(res, 401, { error: 'Invalid credentials' });
            if (user.banned) return json(res, 403, { error: 'Account is banned' });

            const token = await createToken({ id: user.id, username: user.username, role: user.role });
            const newCsrfToken = generateCsrfToken();
            setAuthCookie(res, token);
            setCsrfCookie(res, newCsrfToken);
            return json(res, 200, {
                success: true,
                csrfToken: newCsrfToken,
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

    if (path === '/register' && req.method === 'POST') {
        const { username, password, csrfToken } = req.body || {};
        if (!username || !password) return json(res, 400, { error: 'Username and password required' });
        if (password.length < 6) return json(res, 400, { error: 'Password must be at least 6 characters' });
        if (!validateCsrfToken(csrfToken, req)) return json(res, 403, { error: 'Invalid CSRF token' });

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

            await sqlRun('INSERT INTO user_profiles (id, username, password_hash, role, ip) VALUES (?, ?, ?, ?, ?)', id, cleanUsername, hash, role, ip);

            const token = await createToken({ id, username: cleanUsername, role });
            const newCsrfToken = generateCsrfToken();
            setAuthCookie(res, token);
            setCsrfCookie(res, newCsrfToken);
            return json(res, 201, { success: true, csrfToken: newCsrfToken, user: { id, username: cleanUsername, role } });
        } catch (err) {
            console.error('Register error:', err);
            return json(res, 500, { error: 'Registration failed' });
        }
    }

    if (path === '/session' && req.method === 'GET') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Not authenticated' });

        const newCsrfToken = generateCsrfToken();
        setCsrfCookie(res, newCsrfToken);
        return json(res, 200, {
            csrfToken: newCsrfToken,
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

    if (path === '/logout' && req.method === 'POST') {
        clearAuthCookie(res);
        return json(res, 200, { success: true });
    }

    return json(res, 404, { error: 'Not found' });
}
