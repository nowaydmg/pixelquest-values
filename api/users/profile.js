import { sql, sqlRun } from '../lib/turso.js';
import { getUserFromRequest, cors, json, validateInput } from '../lib/auth.js';

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

    const user = await getUserFromRequest(req);
    if (!user) return json(res, 401, { error: 'Unauthorized' });

    // GET /api/users/profile — pobierz swój profil
    if (req.method === 'GET') {
        try {
            const rows = await sql('SELECT * FROM user_profiles WHERE id = ?', user.id);
            if (!rows[0]) return json(res, 404, { error: 'Profile not found' });
            const p = rows[0];
            return json(res, 200, {
                id: p.id,
                username: p.username,
                role: p.role,
                avatarUrl: p.avatar_url || '',
                bio: p.bio || '',
                warnings: p.warnings || 0,
                banned: p.banned || 0,
                createdAt: p.created_at
            });
        } catch (err) {
            console.error('getProfile:', err);
            return json(res, 500, { error: 'Failed to fetch profile' });
        }
    }

    // PUT /api/users/profile — zaktualizuj swój profil
    if (req.method === 'PUT') {
        const { avatarUrl, bio } = req.body || {};

        // Walidacja avatarUrl
        if (avatarUrl !== undefined && avatarUrl !== '') {
            const isHttps = /^https:\/\//i.test(avatarUrl);
            const isBase64 = /^data:image\/(png|jpeg|webp);base64,/i.test(avatarUrl);
            if (!isHttps && !isBase64) {
                return json(res, 400, { error: 'avatarUrl must be a valid https URL or a base64 image (PNG/JPG/WebP)' });
            }
            if (avatarUrl.length > 7_000_000) {
                return json(res, 400, { error: 'avatarUrl image is too large (max ~5 MB)' });
            }
        }

        // Walidacja bio
        if (bio !== undefined && typeof bio === 'string' && bio.length > 300) {
            return json(res, 400, { error: 'bio must be at most 300 characters' });
        }

        try {
            const sets = [];
            const args = [];

            if (avatarUrl !== undefined) {
                sets.push('avatar_url = ?');
                args.push(avatarUrl || null);
            }
            if (bio !== undefined) {
                sets.push('bio = ?');
                args.push(bio || null);
            }

            if (sets.length === 0) {
                return json(res, 400, { error: 'No fields to update' });
            }

            args.push(user.id);
            await sqlRun(`UPDATE user_profiles SET ${sets.join(', ')} WHERE id = ?`, ...args);

            return json(res, 200, { success: true });
        } catch (err) {
            console.error('updateProfile:', err);
            return json(res, 500, { error: 'Failed to update profile' });
        }
    }

    return json(res, 405, { error: 'Method not allowed' });
}