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

export function generateCsrfToken() {
    return randomBytes(32).toString('hex');
}

export function validateCsrfToken(token, req) {
    if (!token || !req?.headers?.cookie) return false;
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, ...value] = cookie.trim().split('=');
        acc[key] = value.join('=');
        return acc;
    }, {});
    return cookies.csrf_token === token;
}

export function requireCsrf(req, res) {
    const { csrfToken } = req.body || {};
    if (!validateCsrfToken(csrfToken, req)) {
        return json(res, 403, { error: 'Invalid CSRF token' });
    }
    return null;
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
    const auth = req.headers.authorization || '';
    let token = auth.replace('Bearer ', '');

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

// Czy wartość to prawidłowy base64 obrazka
function isBase64Image(value) {
    return /^data:image\/(png|jpeg|webp);base64,/i.test(value);
}

// Czy wartość to prawidłowy URL https
function isHttpsUrl(value) {
    return /^https:\/\//i.test(value);
}

const MAX_LENGTHS = {
    name: 200,
    text: 5000,
    reason: 2000,
    message: 2000,
    price: 200,
    type: 100,
    tier: 20,
    // icon i avatarUrl: base64 może mieć ~350 000 znaków przy 256px WebP
    // dlatego sprawdzamy je osobno poniżej
    icon: null,
    avatarUrl: null
};

export function validateInput(fields) {
    for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null) continue;
        if (typeof value !== 'string') continue;

        // Pola ze zdjęciami — sprawdź tylko format, nie długość
        if (key === 'icon' || key === 'avatarUrl') {
            if (value === '') continue; // puste jest OK
            if (isBase64Image(value)) {
                // Maksymalnie ~5 MB po base64 (5 * 1024 * 1024 * 4/3 ≈ 6 971 000 znaków)
                if (value.length > 7_000_000) {
                    return `${key} image is too large (max ~5 MB)`;
                }
                continue;
            }
            if (isHttpsUrl(value)) {
                if (value.length > 2000) return `${key} URL is too long`;
                continue;
            }
            // Emoji lub krótki tekst (np. "📜")
            if (value.length <= 10) continue;
            return `${key} must be an https URL, a base64 image, or a short emoji`;
        }

        const max = MAX_LENGTHS[key] ?? 1000;
        if (max !== null && value.length > max) {
            return `${key} must be at most ${max} characters`;
        }
    }
    return null;
}

export const SAFE_USER_FIELDS = { role: 'role', warnings: 'warnings', banned: 'banned' };
