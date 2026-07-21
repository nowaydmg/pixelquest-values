// Data layer — all DB reads/writes via backend API with HTTP-only cookies and CSRF protection

let csrfToken = null;

async function getCsrfToken() {
    try {
        const res = await fetch('/api/auth/csrf', { credentials: 'include' });
        const data = await res.json();
        csrfToken = data.csrfToken;
        return csrfToken;
    } catch (err) {
        console.error('Failed to get CSRF token:', err);
        return null;
    }
}

function apiHeaders() {
    return { 'Content-Type': 'application/json' };
}

async function apiFetch(method, path, body) {
    const opts = { method, headers: apiHeaders(), credentials: 'include' };
    if (body) {
        if (!csrfToken) await getCsrfToken();
        opts.body = JSON.stringify({ ...body, csrfToken });
    }
    const res = await fetch(path, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data.csrfToken) {
        csrfToken = data.csrfToken;
    }
    return data;
}

// --- Items ---

async function getItems() {
    try { return await apiFetch('GET', '/api/items'); }
    catch { return []; }
}

async function addItem(item) {
    try { return await apiFetch('POST', '/api/items', item); }
    catch { return null; }
}

async function updateItem(id, updates) {
    try { return await apiFetch('PUT', `/api/items?id=${id}`, updates); }
    catch { return null; }
}

async function deleteItemById(id) {
    try { return await apiFetch('DELETE', `/api/items?id=${id}`); }
    catch { return false; }
}

// --- Trade offers ---

async function getTradeOffers() {
    try { return await apiFetch('GET', '/api/trades/offers'); }
    catch { return []; }
}

async function addTradeOffer(offer) {
    try { return await apiFetch('POST', '/api/trades/offers', offer); }
    catch { return null; }
}

async function deleteTradeOffer(id) {
    try { return await apiFetch('DELETE', `/api/trades/offers?id=${id}`); }
    catch { return false; }
}

// --- Trade requests ---

async function getTradeRequests() {
    try { return await apiFetch('GET', '/api/trades/requests'); }
    catch { return []; }
}

async function addTradeRequest(request) {
    try { return await apiFetch('POST', '/api/trades/requests', request); }
    catch { return null; }
}

async function deleteTradeRequest(id) {
    try { return await apiFetch('DELETE', `/api/trades/requests?id=${id}`); }
    catch { return false; }
}

// --- Messages ---

async function getDirectMessages() {
    try { return await apiFetch('GET', '/api/messages'); }
    catch { return []; }
}

async function addMessage(message) {
    try { return await apiFetch('POST', '/api/messages', message); }
    catch { return null; }
}

// --- Notifications ---

async function getNotifications() {
    try { return await apiFetch('GET', '/api/messages/notifications'); }
    catch { return []; }
}

async function addNotification(recipient, text) {
    try { return await apiFetch('POST', '/api/messages/notifications', { recipient, text }); }
    catch { return null; }
}

async function clearNotification(id) {
    try { return await apiFetch('PUT', '/api/messages/notifications', { id }); }
    catch { return false; }
}

// --- Reports ---

async function getReports() {
    try { return await apiFetch('GET', '/api/reports'); }
    catch { return []; }
}

async function addReport(report) {
    try { return await apiFetch('POST', '/api/reports', report); }
    catch { return null; }
}

async function updateReportStatus(id, status) {
    try { return await apiFetch('PUT', '/api/reports', { id, status }); }
    catch { return false; }
}

// --- Player ratings ---

async function getPlayerRatings() {
    try { return await apiFetch('GET', '/api/ratings'); }
    catch { return {}; }
}

async function addPlayerRating(username, rating, rater) {
    try { return await apiFetch('POST', '/api/ratings', { username, rating, rater }); }
    catch { return false; }
}

// --- Achievements ---

async function getAchievements() {
    try { return await apiFetch('GET', '/api/achievements'); }
    catch { return {}; }
}

async function addAchievement(username, achievement) {
    try { return await apiFetch('POST', '/api/achievements', { username, achievement }); }
    catch { return false; }
}

// --- Watchlist ---

async function getWatchlist() {
    try { return await apiFetch('GET', '/api/watchlist'); }
    catch { return {}; }
}

async function addToWatchlist(username, itemName) {
    try { return await apiFetch('POST', '/api/watchlist', { itemName }); }
    catch { return false; }
}

async function removeFromWatchlist(username, itemName) {
    try { return await apiFetch('DELETE', `/api/watchlist?itemName=${encodeURIComponent(itemName)}`); }
    catch { return false; }
}

// --- Transaction history ---

async function getTransactionHistory() {
    try { return await apiFetch('GET', '/api/transactions'); }
    catch { return []; }
}

async function addTransaction(transaction) {
    try { return await apiFetch('POST', '/api/transactions', transaction); }
    catch { return null; }
}

// --- Users ---

async function getAllUsers() {
    try { return await apiFetch('GET', '/api/users'); }
    catch { return []; }
}

async function updateUserRole(username, role) {
    try { return await apiFetch('PUT', '/api/users', { username, field: 'role', value: role }); }
    catch { return false; }
}

async function updateUserWarnings(username, warnings) {
    try { return await apiFetch('PUT', '/api/users', { username, field: 'warnings', value: warnings }); }
    catch { return false; }
}

async function banUser(username) {
    try { return await apiFetch('PUT', '/api/users', { username, field: 'banned', value: 1 }); }
    catch { return false; }
}

async function unbanUser(username) {
    try { return await apiFetch('PUT', '/api/users', { username, field: 'banned', value: 0 }); }
    catch { return false; }
}

// --- Banned IPs ---

async function getBannedIps() {
    try { return await apiFetch('GET', '/api/users/banned-ips'); }
    catch { return []; }
}

async function addBannedIp(ip) {
    try { return await apiFetch('POST', '/api/users/banned-ips', { ip }); }
    catch { return false; }
}

async function removeBannedIp(ip) {
    try { return await apiFetch('DELETE', '/api/users/banned-ips', { ip }); }
    catch { return false; }
}

// --- App data cache ---

const appData = {
    items: [],
    tradeOffers: [],
    tradeRequests: [],
    messages: [],
    notifications: [],
    reports: [],
    users: [],
    ratings: {},
    achievements: {},
    watchlist: {},
    transactions: [],
    bannedIps: []
};

async function refreshAppData() {
    const [
        items, tradeOffers, tradeRequests, messages, notifications,
        reports, users, ratings, achievements, watchlist, transactions, bannedIps
    ] = await Promise.all([
        getItems(), getTradeOffers(), getTradeRequests(), getDirectMessages(),
        getNotifications(), getReports(), getAllUsers(), getPlayerRatings(),
        getAchievements(), getWatchlist(), getTransactionHistory(), getBannedIps()
    ]);

    appData.items = items;
    appData.tradeOffers = tradeOffers;
    appData.tradeRequests = tradeRequests;
    appData.messages = messages;
    appData.notifications = notifications;
    appData.reports = reports;
    appData.users = users;
    appData.ratings = ratings;
    appData.achievements = achievements;
    appData.watchlist = watchlist;
    appData.transactions = transactions;
    appData.bannedIps = bannedIps;
}
