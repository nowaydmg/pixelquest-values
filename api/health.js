import { sql } from '../lib/turso.js';
import { cors, json } from '../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    let dbStatus = 'not configured';
    try {
        await sql('SELECT 1');
        dbStatus = 'ok';
    } catch (e) {
        dbStatus = `error: ${e.message}`;
    }

    return json(res, 200, {
        status: 'ok',
        service: 'pixel-quest-values',
        timestamp: new Date().toISOString(),
        database: dbStatus
    });
}
