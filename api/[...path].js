import auth from '../lib/handlers/auth.js';
import health from '../lib/handlers/health.js';
import items from '../lib/handlers/items.js';
import trades from '../lib/handlers/trades.js';
import messages from '../lib/handlers/messages.js';
import users from '../lib/handlers/users.js';
import ratings from '../lib/handlers/ratings.js';
import achievements from '../lib/handlers/achievements.js';
import reports from '../lib/handlers/reports.js';
import transactions from '../lib/handlers/transactions.js';
import watchlist from '../lib/handlers/watchlist.js';
import adminUserAction from '../lib/handlers/admin-user-action.js';

const routes = [
    ['/api/admin/user-action', adminUserAction],
    ['/api/auth', auth],
    ['/api/health', health],
    ['/api/items', items],
    ['/api/trades', trades],
    ['/api/messages', messages],
    ['/api/users', users],
    ['/api/ratings', ratings],
    ['/api/achievements', achievements],
    ['/api/reports', reports],
    ['/api/transactions', transactions],
    ['/api/watchlist', watchlist]
];

export default function handler(req, res) {
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
    const match = routes.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    if (!match) return res.status(404).json({ error: 'Not found' });
    return match[1](req, res);
}
