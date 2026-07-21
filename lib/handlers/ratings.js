import { sql, sqlRun } from '../turso.js';
import { getUserFromRequest, cors, json, validateInput } from '../auth.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        try {
            const rows = await sql('SELECT * FROM player_ratings');
            const grouped = {};
            for (const r of rows) {
                if (!grouped[r.username]) grouped[r.username] = { total: 0, count: 0, average: '0.0' };
                grouped[r.username].total += r.rating;
                grouped[r.username].count += 1;
                grouped[r.username].average = (grouped[r.username].total / grouped[r.username].count).toFixed(1);
            }
            return json(res, 200, grouped);
        } catch (err) {
            console.error('getRatings:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    if (req.method === 'POST') {
        const user = await getUserFromRequest(req);
        if (!user) return json(res, 401, { error: 'Unauthorized' });

        const { username, rating } = req.body || {};
        if (!username || !rating) return json(res, 400, { error: 'Username and rating required' });

        const inputError = validateInput({ username });
        if (inputError) return json(res, 400, { error: inputError });

        const ratingNum = parseInt(rating, 10);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return json(res, 400, { error: 'Rating must be 1-5' });
        }
        if (username === user.username) {
            return json(res, 400, { error: 'Cannot rate yourself' });
        }

        try {
            const existing = await sql(
                'SELECT id FROM player_ratings WHERE username = ? AND rater = ?',
                username, user.username
            );
            if (existing.length > 0) {
                await sqlRun(
                    'UPDATE player_ratings SET rating = ? WHERE username = ? AND rater = ?',
                    ratingNum, username, user.username
                );
            } else {
                await sqlRun('INSERT INTO player_ratings (id, username, rating, rater) VALUES (?, ?, ?, ?)',
                    randomUUID(), username, ratingNum, user.username);
            }
            return json(res, 201, { success: true });
        } catch (err) {
            console.error('addRating:', err);
            return json(res, 500, { error: 'Failed' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
