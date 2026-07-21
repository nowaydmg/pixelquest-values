import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { sql } from './turso.js';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Set it in your .env file or Vercel dashboard.');
}
const SECRET = new TextEncoder().encode(JWT_SECRET || 'pixel-quest-emergency-fallback-not-for-production');
const ALG = 'HS256';
const EXPIRY = '7d';
const SALT_ROUNDS = 12;

// Simple CSRF token store (in production, use Redis or database)
const csrfTokens = new Map();

export function generateCsrfToken() {
    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    csrfTokens.set(token, expiresAt);
    return token;
}

export function validateCsrfToken(token) {
    if (!token) return false;
    const expiresAt = csrfTokens.get(token);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
        csrfTokens.delete(token);
        return false;
    }
    // Use once
    csrfTokens.delete(token);
    return true;
}

export function requireCsrf(req, res) {
    const { csrfToken } = req.body || {};
    if (!validateCsrfToken(csrfToken)) {
        return json(res, 403, { error: 'Invalid CSRF token' });
    }
    return null; // Validation passed
}

export function setCsrfCookie(res, token) {
    res.setHeader('Set-Cookie', `csrf_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${24 * 60 * 60}`);
}

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
    // Try Authorization header first (for backward compatibility)
    const auth = req.headers.authorization || '';
    let token = auth.replace('Bearer ', '');
    
    // Fall back to cookie
    if (!token && req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {});
        token = cookies.auth_token;
    }
    
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload?.id) return null;
    const rows = await sql('SELECT * FROM user_profiles WHERE id = ?', payload.id);
    return rows[0] || null;
}

export function setAuthCookie(res, token) {
    res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`);
}

export function clearAuthCookie(res) {
    res.setHeader('Set-Cookie', 'auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
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
