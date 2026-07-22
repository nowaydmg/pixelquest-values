// Data layer — all DB reads/writes via backend API with HTTP-only cookies and CSRF protection

let apiCsrfToken = null;

async function getApiCsrfToken() {
    const res = await fetch('/api/auth/csrf', { credentials: 'include' });
    if (!res.ok) throw new Error(`Nie udało się pobrać tokenu CSRF: HTTP ${res.status}`);
    const data = await res.json();
    if (!data.csrfToken) throw new Error('Backend nie zwrócił tokenu CSRF.');
    apiCsrfToken = data.csrfToken;
    return apiCsrfToken;
}

function apiHeaders() {
    return { 'Content-Type': 'application/json' };
}

async function apiFetch(method, path, body) {
    const upperMethod = method.toUpperCase();
    const isMutation = !['GET', 'HEAD'].includes(upperMethod);
    const opts = { method: upperMethod, headers: apiHeaders(), credentials: 'include' };

    if (isMutation) {
        if (!apiCsrfToken) await getApiCsrfToken();
        opts.body = JSON.stringify({ ...(body || {}), csrfToken: apiCsrfToken });
    }

    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        if (res.status === 403) apiCsrfToken = null;
        throw new Error(data.error || `HTTP ${res.status}`);
    }

    if (data.csrfToken) apiCsrfToken = data.csrfToken;
    return data;
}

// --- Items ---

async function getItems() {
    return apiFetch('GET', '/api/items');
}

async function addItem(item) {
    return apiFetch('POST', '/api/items', item);
}

async function updateItem(id, updates) {
    return apiFetch('PUT', `/api/items?id=${encodeURIComponent(id)}`, updates);
}

async function deleteItemById(id) {
    return apiFetch('DELETE', `/api/items?id=${encodeURIComponent(id)}`);
}

// --- Trade offers ---

async function getTradeOffers() {
    try { return await apiFetch('GET', '/api/trades/offers'); }
    catch { return []; }
}

async function addTradeOffer(offer) {
    return apiFetch('POST', '/api/trades/offers', offer);
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
    return apiFetch('POST', '/api/trades/requests', request);
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
    return apiFetch('POST', '/api/reports', report);
}

async function updateReportStatus(id, status) {
    try { return await apiFetch('PUT', '/api/reports', { id, status }); }
    catch { return false; }
}

// --- Value suggestions ---

async function getValueSuggestions() {
    try { return await apiFetch('GET', '/api/users/value-suggestions'); }
    catch { return []; }
}

async function addValueSuggestion(suggestion) {
    return apiFetch('POST', '/api/users/value-suggestions', suggestion);
}

async function reviewValueSuggestion(id, status) {
    return apiFetch('PUT', '/api/users/value-suggestions', { id, status });
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

async function getMyProfile() {
    return apiFetch('GET', '/api/users/profile');
}

async function updateMyProfile(profile) {
    return apiFetch('PUT', '/api/users/profile', profile);
}

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
    valueSuggestions: [],
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
        reports, valueSuggestions, users, myProfileResponse, ratings,
        achievements, watchlist, transactions, bannedIps
    ] = await Promise.all([
        getItems().catch(() => []),
        getTradeOffers().catch(() => []),
        getTradeRequests().catch(() => []),
        getDirectMessages().catch(() => []),
        getNotifications().catch(() => []),
        getReports().catch(() => []),
        getValueSuggestions().catch(() => []),
        getAllUsers().catch(() => []),
        getMyProfile().catch(() => null),
        getPlayerRatings().catch(() => {}),
        getAchievements().catch(() => {}),
        getWatchlist().catch(() => {}),
        getTransactionHistory().catch(() => []),
        getBannedIps().catch(() => [])
    ]);

    appData.items = Array.isArray(items) ? items : [];
    appData.tradeOffers = Array.isArray(tradeOffers) ? tradeOffers : [];
    appData.tradeRequests = Array.isArray(tradeRequests) ? tradeRequests : [];
    appData.messages = Array.isArray(messages) ? messages : [];
    appData.notifications = Array.isArray(notifications) ? notifications : [];
    appData.reports = Array.isArray(reports) ? reports : [];
    appData.valueSuggestions = Array.isArray(valueSuggestions) ? valueSuggestions : [];
    appData.users = Array.isArray(users) ? users : [];
    appData.ratings = ratings || {};
    appData.achievements = achievements || {};
    appData.watchlist = watchlist || {};
    appData.transactions = Array.isArray(transactions) ? transactions : [];
    appData.bannedIps = Array.isArray(bannedIps) ? bannedIps : [];

    const myProfile = myProfileResponse?.user || myProfileResponse;
    if (myProfile?.username) {
        const index = appData.users.findIndex(u => u.username === myProfile.username);
        if (index >= 0) {
            appData.users[index] = { ...appData.users[index], ...myProfile };
        } else {
            appData.users.push(myProfile);
        }
    }
}
