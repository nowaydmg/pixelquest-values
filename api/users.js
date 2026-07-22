import { sql, sqlRun } from '../lib/turso.js';
import { getUserFromRequest, cors, json, SAFE_USER_FIELDS, validateInput } from '../lib/auth.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace('/api/users', '').replace(/\/$/, '');

    // GET /api/users (list all users)
    if (path === '' && req.method === 'GET') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });
        const isAdmin = ['admin', 'owner'].includes(user.role);
        try {
            const rows = await sql('SELECT id, username, role, ip, warnings, banned, created_at FROM user_profiles ORDER BY username');
            return json(res, 200, rows.map(r => ({
                id: r.id, username: r.username, role: r.role,
                ip: isAdmin ? r.ip : undefined,
                warnings: r.warnings, banned: !!r.banned, createdAt: r.created_at
            })));
        } catch (err) {
            console.error('getUsers:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    // PUT /api/users (update user field)
    if (path === '' && req.method === 'PUT') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { username, field, value } = req.body || {};
        if (!username || !field) return json(res, 400, { error: 'username and field required' });

        const dbField = SAFE_USER_FIELDS[field];
        if (!dbField) return json(res, 400, { error: 'Invalid field' });

        if (field === 'role' && value === 'owner' && user.role !== 'owner') {
            return json(res, 403, { error: 'Only owner can assign owner role' });
        }
        if (!['admin', 'owner'].includes(user.role) && field !== 'role') {
            return json(res, 403, { error: 'Forbidden' });
        }

        try {
            await sqlRun(`UPDATE user_profiles SET ${dbField} = ? WHERE username = ?`, value, username);
            return json(res, 200, { success: true });
        } catch (err) {
            console.error('updateUser:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    // GET /api/users/banned-ips
    if (path === '/banned-ips' && req.method === 'GET') {
        try {
            const rows = await sql('SELECT ip FROM banned_ips ORDER BY created_at DESC');
            return json(res, 200, rows.map(r => r.ip));
        } catch (err) {
            return json(res, 500, { error: 'Failed' });
        }
    }

    // POST /api/users/banned-ips
    if (path === '/banned-ips' && req.method === 'POST') {
        const user = await getUserFromRequest(req);
        if (!user || !['admin', 'owner'].includes(user.role)) return json(res, 403, { error: 'Forbidden' });
        const { ip } = req.body || {};
        if (!ip) return json(res, 400, { error: 'IP required' });
        try {
            await sqlRun('INSERT OR IGNORE INTO banned_ips (id, ip) VALUES (?, ?)', randomUUID(), ip);
            return json(res, 201, { success: true });
        } catch (err) {
            return json(res, 500, { error: 'Failed' });
        }
    }

    // DELETE /api/users/banned-ips
    if (path === '/banned-ips' && req.method === 'DELETE') {
        const user = await getUserFromRequest(req);
        if (!user || !['admin', 'owner'].includes(user.role)) return json(res, 403, { error: 'Forbidden' });
        const { ip } = req.body || {};
        if (!ip) return json(res, 400, { error: 'IP required' });
        try {
            await sqlRun('DELETE FROM banned_ips WHERE ip = ?', ip);
            return json(res, 200, { success: true });
        } catch (err) {
            return json(res, 500, { error: 'Failed' });
        }
    }

    // GET /api/users/profile
    if (path === '/profile' && req.method === 'GET') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });
        try {
            const rows = await sql('SELECT id, username, role, avatar_url, bio, warnings, banned, created_at FROM user_profiles WHERE id = ?', user.id);
            const p = rows[0];
            if (!p) return json(res, 404, { error: 'Profile not found' });
            return json(res, 200, {
                id: p.id, username: p.username, role: p.role,
                avatarUrl: p.avatar_url || '', bio: p.bio || '',
                warnings: p.warnings || 0, banned: !!p.banned, createdAt: p.created_at
            });
        } catch (err) {
            return json(res, 500, { error: 'Failed to fetch profile' });
        }
    }

    // PUT /api/users/profile
    if (path === '/profile' && req.method === 'PUT') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });
        const { avatarUrl, bio } = req.body || {};
        const inputError = validateInput({ avatarUrl, bio });
        if (inputError) return json(res, 400, { error: inputError });
        try {
            const sets = [];
            const args = [];
            if (avatarUrl !== undefined) { sets.push('avatar_url = ?'); args.push(avatarUrl); }
            if (bio !== undefined) { sets.push('bio = ?'); args.push(bio); }
            if (sets.length === 0) return json(res, 400, { error: 'No fields' });
            args.push(user.id);
            await sqlRun(`UPDATE user_profiles SET ${sets.join(', ')} WHERE id = ?`, ...args);
            return json(res, 200, { success: true });
        } catch (err) {
            return json(res, 500, { error: 'Failed update' });
        }
    }

    // GET /api/users/value-suggestions
    if (path === '/value-suggestions' && req.method === 'GET') {
        try {
            const rows = await sql('SELECT * FROM value_suggestions ORDER BY created_at DESC');
            return json(res, 200, rows.map(r => ({
                id: r.id, itemName: r.item_name, proposedCp: r.proposed_cp,
                reason: r.reason, suggester: r.suggester, status: r.status, createdAt: r.created_at
            })));
        } catch (err) {
            return json(res, 500, { error: 'Failed' });
        }
    }

    // POST /api/users/value-suggestions
    if (path === '/value-suggestions' && req.method === 'POST') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });
        const { itemName, proposedCp, reason } = req.body || {};
        if (!itemName || proposedCp === undefined || !reason) return json(res, 400, { error: 'Missing fields' });
        try {
            const id = randomUUID();
            await sqlRun('INSERT INTO value_suggestions (id, item_name, proposed_cp, reason, suggester, status) VALUES (?, ?, ?, ?, ?, ?)',
                id, itemName, proposedCp, reason, user.username, 'pending');
            return json(res, 201, { success: true, id });
        } catch (err) {
            return json(res, 500, { error: 'Failed' });
        }
    }

    // PUT /api/users/value-suggestions
    if (path === '/value-suggestions' && req.method === 'PUT') {
        const user = await getUserFromRequest(req);
        if (!user || !['value manager', 'moderator', 'admin', 'owner'].includes(user.role)) return json(res, 403, { error: 'Forbidden' });
        const { id, status } = req.body || {};
        if (!id || !status) return json(res, 400, { error: 'Missing fields' });
        try {
            if (status === 'approved' && ['value manager', 'admin', 'owner'].includes(user.role)) {
                const rows = await sql('SELECT * FROM value_suggestions WHERE id = ?', id);
                const sug = rows[0];
                if (sug) {
                    await sqlRun('UPDATE items SET corrupted_pages = ? WHERE name = ?', sug.proposed_cp, sug.item_name);
                }
            }
            await sqlRun('UPDATE value_suggestions SET status = ? WHERE id = ?', status, id);
            return json(res, 200, { success: true });
        } catch (err) {
            return json(res, 500, { error: 'Failed' });
        }
    }

    return json(res, 404, { error: 'Not found' });
}