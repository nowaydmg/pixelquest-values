import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { sql } from './turso.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Set it in your .env file or Vercel dashboard.');
}
const SECRET = new TextEncoder().encode(JWT_SECRET || 'pixel-quest-emergency-fallback-not-for-production');
const ALG = 'HS256';
const EXPIRY = '7d';
const SALT_ROUNDS = 12;

export async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

export async function createToken(payload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime(EXPIRY)
        .sign(SECRET);
}

export async function verifyToken(token) {
    try {
        const { payload } = await jwtVerify(token, SECRET, { algorithms: [ALG] });
        return payload;
    } catch {
        return null;
    }
}

export async function getUserFromRequest(req) {
    const auth = req.headers.authorization || '';
    const token = auth.replace('Bearer ', '');
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload?.id) return null;
    const rows = await sql('SELECT * FROM user_profiles WHERE id = ?', payload.id);
    return rows[0] || null;
}

export function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function json(res, status, data) {
    return res.status(status).json(data);
}

const MAX_LENGTHS = { name: 200, text: 5000, reason: 2000, message: 2000, price: 200, type: 100, tier: 20, icon: 500 };

export function validateInput(fields) {
    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null && typeof value === 'string') {
            const max = MAX_LENGTHS[key] || 1000;
            if (value.length > max) return `${key} must be at most ${max} characters`;
        }
    }
    return null;
}

export const SAFE_USER_FIELDS = { role: 'role', warnings: 'warnings', banned: 'banned' };
