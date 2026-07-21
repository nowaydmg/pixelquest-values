const defaultItems = [
    { icon: '📜', name: 'Ancient Scroll Fragment', corruptedPages: 42, tier: 'A', rarity: 'Rare', type: 'Crafting Material' },
    { icon: '🪻', name: 'Cursed Amulet', corruptedPages: 88, tier: 'S', rarity: 'Epic', type: 'Accessory' },
    { icon: '💎', name: 'Corrupted Core', corruptedPages: 56, tier: 'B', rarity: 'Rare', type: 'Crafting Material' },
    { icon: '🔮', name: 'Dark Crystal', corruptedPages: 64, tier: 'A', rarity: 'Epic', type: 'Crafting Material' },
    { icon: '🗡️', name: 'Enchanted Dagger', corruptedPages: 70, tier: 'A', rarity: 'Rare', type: 'Weapon' },
    { icon: '📖', name: 'Forbidden Grimoire', corruptedPages: 95, tier: 'S', rarity: 'Epic', type: 'Quest Item' },
    { icon: '✨', name: 'Glowing Essence', corruptedPages: 18, tier: 'C', rarity: 'Common', type: 'Crafting Material' },
    { icon: '🛡️', name: 'Obsidian Helm', corruptedPages: 76, tier: 'A', rarity: 'Epic', type: 'Armor' },
    { icon: '🌙', name: "Phantom's Whisper", corruptedPages: 110, tier: 'S', rarity: 'Legendary', type: 'Weapon' },
    { icon: '🪙', name: 'Rusted Coin', corruptedPages: 10, tier: 'C', rarity: 'Common', type: 'Currency' },
    { icon: '🧥', name: 'Shadow Cloak', corruptedPages: 72, tier: 'A', rarity: 'Epic', type: 'Armor' },
    { icon: '🕯️', name: 'Soul Fragment', corruptedPages: 100, tier: 'S', rarity: 'Legendary', type: 'Crafting Material' },
    { icon: '🧪', name: 'Tainted Potion', corruptedPages: 24, tier: 'B', rarity: 'Common', type: 'Consumable' },
    { icon: '💠', name: 'Void Shard', corruptedPages: 120, tier: 'S', rarity: 'Legendary', type: 'Crafting Material' }
];

let currentSort = { key: 'corruptedPages', direction: 'desc' };
let editingIndex = null;
let uploadedItemImage = null;

function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            <div class="toast-title">${sanitizeText(title)}</div>
            <div class="toast-message">${sanitizeText(message)}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
}

function getCurrentUser() {
    return localStorage.getItem('currentUser') || 'guest';
}

function getRegisteredUsers() {
    try {
        const stored = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
        return Object.keys(stored).filter(Boolean);
    } catch (error) {
        return [];
    }
}

function sanitizeText(input) {
    return String(input)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isSafeString(input) {
    const value = String(input);
    const blocked = /<script|javascript:|onerror|onload|eval\(|Function\(/i;
    return !blocked.test(value);
}

function getActionLog() {
    try {
        const stored = JSON.parse(localStorage.getItem('actionLog') || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        return [];
    }
}

function saveActionLog(log) {
    localStorage.setItem('actionLog', JSON.stringify(log));
}

function recordAction(action) {
    const now = Date.now();
    const log = getActionLog().filter((entry) => now - entry.timestamp < 60_000);
    log.push({ action, timestamp: now, user: getCurrentUser() });
    saveActionLog(log);
}

function canPerformAction(action, limit = 6, windowMs = 60_000) {
    const now = Date.now();
    const recent = getActionLog().filter((entry) => entry.action === action && now - entry.timestamp < windowMs);
    return recent.length < limit;
}

function getNotifications() {
    try {
        const stored = JSON.parse(localStorage.getItem('notifications') || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        return [];
    }
}

function saveNotifications(notes) {
    localStorage.setItem('notifications', JSON.stringify(notes));
}

function addNotification(recipient, text) {
    const notifications = getNotifications();
    notifications.push({
        id: Date.now(),
        to: recipient,
        text: sanitizeText(text),
        createdAt: new Date().toISOString(),
        seen: false
    });
    saveNotifications(notifications);
}

function getReports() {
    try {
        const stored = JSON.parse(localStorage.getItem('reports') || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        return [];
    }
}

function saveReports(reports) {
    localStorage.setItem('reports', JSON.stringify(reports));
}

function getPlayerRatings() {
    try {
        const stored = JSON.parse(localStorage.getItem('playerRatings') || '{}');
        return stored;
    } catch (error) {
        return {};
    }
}

function savePlayerRatings(ratings) {
    localStorage.setItem('playerRatings', JSON.stringify(ratings));
}

function ratePlayer(targetUsername, rating) {
    const ratings = getPlayerRatings();
    if (!ratings[targetUsername]) {
        ratings[targetUsername] = { total: 0, count: 0, average: 0 };
    }
    ratings[targetUsername].total += rating;
    ratings[targetUsername].count += 1;
    ratings[targetUsername].average = (ratings[targetUsername].total / ratings[targetUsername].count).toFixed(1);
    savePlayerRatings(ratings);
}

function addReport(target, reason, reporter) {
    const reports = getReports();
    reports.push({
        id: Date.now(),
        target: sanitizeText(target),
        reason: sanitizeText(reason),
        reporter: sanitizeText(reporter),
        createdAt: new Date().toISOString(),
        status: 'pending'
    });
    saveReports(reports);
}

function getNotificationsForUser(user) {
    return getNotifications().filter((note) => note.to === user || note.to === 'all');
}

function clearNotification(id) {
    const notifications = getNotifications().filter((note) => note.id !== id);
    saveNotifications(notifications);
    renderNotifications();
}

function getPendingReports() {
    return getReports().filter((report) => report.status === 'pending');
}

function updateReportStatus(id, status) {
    const reports = getReports().map((report) => (report.id === id ? { ...report, status } : report));
    saveReports(reports);
}

function renderNotifications() {
    const currentUser = getCurrentUser();
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;

    const notifications = getNotificationsForUser(currentUser);
    notificationList.innerHTML = notifications.length
        ? notifications.map((note) => `
            <div class="trade-offer notification-card ${note.seen ? 'seen' : ''}">
                <div class="trade-offer-header">
                    <strong>Notification</strong>
                    <span>${new Date(note.createdAt).toLocaleTimeString('pl-PL')}</span>
                </div>
                <div>${note.text}</div>
                <div class="trade-actions">
                    <button class="btn btn-secondary btn-small" type="button" onclick="clearNotification(${note.id})">Dismiss</button>
                </div>
            </div>
        `).join('')
        : '<div class="trade-empty">No notifications.</div>';
}

function renderNotificationsSection() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;

    const currentUser = getCurrentUser();
    const notifications = getNotificationsForUser(currentUser);

    if (!notifications.length) {
        notificationsList.innerHTML = '<div class="trade-empty">No notifications yet.</div>';
        return;
    }

    notificationsList.innerHTML = notifications
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((note) => `
            <div class="notification-card ${note.seen ? 'seen' : ''}">
                <div class="notification-content">${note.text}</div>
                <div class="notification-time">${new Date(note.createdAt).toLocaleString('pl-PL')}</div>
                <div class="notification-actions">
                    <button class="btn btn-secondary btn-small" type="button" onclick="clearNotification(${note.id})">Dismiss</button>
                </div>
            </div>
        `)
        .join('');
}

function renderReportTargets() {
    const currentUser = getCurrentUser();
    const reportTargetSelect = document.getElementById('reportTargetSelect');
    if (!reportTargetSelect) return;

    const users = getRegisteredUsers().filter((user) => user !== currentUser);
    reportTargetSelect.innerHTML = users.length
        ? users.map((user) => `<option value="${user}">${user}</option>`).join('')
        : '<option value="">No players available</option>';
}

function submitReport() {
    const currentUser = getCurrentUser();
    const target = document.getElementById('reportTargetSelect')?.value;
    const reason = document.getElementById('reportReason')?.value.trim();

    if (!target || !reason) {
        showToast('Error', 'Select a player and enter a reason.', 'error');
        return;
    }

    if (!isSafeString(target) || !isSafeString(reason)) {
        showToast('Error', 'Unsafe characters detected.', 'error');
        return;
    }

    if (!canPerformAction('submitReport', 4, 60_000)) {
        showToast('Warning', 'Too many reports recently.', 'warning');
        return;
    }

    recordAction('submitReport');
    addReport(target, reason, currentUser);
    addNotification('all', `${currentUser} submitted a report against ${target}.`);
    document.getElementById('reportReason').value = '';
    renderReportTargets();
    showToast('Success', 'Report submitted successfully.', 'success');
}

function renderModeratorReports() {
    const reportsList = document.getElementById('moderatorReportsList');
    if (!reportsList) return;

    const reports = getPendingReports();
    reportsList.innerHTML = reports.length
        ? reports.map((report) => `
            <div class="trade-offer report-card">
                <div class="trade-offer-header">
                    <strong>Report: ${sanitizeText(report.target)}</strong>
                    <span>${new Date(report.createdAt).toLocaleTimeString('pl-PL')}</span>
                </div>
                <div>${sanitizeText(report.reason)}</div>
                <div class="trade-offer-meta">Reporter: ${sanitizeText(report.reporter)}</div>
                <div class="trade-actions">
                    <button class="btn btn-primary btn-small" type="button" onclick="handleReportOutcome(${report.id}, 'approved')">Approve</button>
                    <button class="btn btn-secondary btn-small" type="button" onclick="handleReportOutcome(${report.id}, 'rejected')">Reject</button>
                </div>
            </div>
        `).join('')
        : '<div class="trade-empty">No pending reports.</div>';
}

function handleReportOutcome(id, status) {
    updateReportStatus(id, status);
    const report = getReports().find((reportItem) => reportItem.id === id);
    if (report) {
        addNotification(report.reporter, `Your report against ${report.target} was ${status}.`);
        addNotification('all', `Report against ${report.target} was ${status}.`);
    }
    renderModeratorReports();
    renderReportSection();
}

function renderReportSection() {
    const reportList = document.getElementById('reportList');
    if (!reportList) return;

    const currentUser = getCurrentUser();
    const userRole = localStorage.getItem('userRole') || 'user';
    const reports = getReports();

    let filteredReports = reports;
    if (userRole !== 'moderator' && userRole !== 'admin' && userRole !== 'owner') {
        filteredReports = reports.filter((report) => report.reporter === currentUser);
    }

    reportList.innerHTML = filteredReports.length
        ? filteredReports.map((report) => `
            <div class="trade-offer report-card">
                <div class="trade-offer-header">
                    <strong>Report: ${sanitizeText(report.target)}</strong>
                    <span class="report-status ${report.status}">${report.status}</span>
                </div>
                <div>${sanitizeText(report.reason)}</div>
                <div class="trade-offer-meta">
                    <span>Reporter: ${sanitizeText(report.reporter)}</span>
                    <span>${new Date(report.createdAt).toLocaleString('pl-PL')}</span>
                </div>
            </div>
        `).join('')
        : '<div class="trade-empty">No reports available.</div>';
}

function renderLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;

    const ratings = getPlayerRatings();
    const entries = Object.entries(ratings).map(([username, data]) => ({
        username,
        ...data
    }));

    entries.sort((a, b) => parseFloat(b.average) - parseFloat(a.average));

    leaderboardList.innerHTML = entries.length
        ? entries.map((entry, index) => {
            const rank = index + 1;
            const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
            const stars = '★'.repeat(Math.round(parseFloat(entry.average)));
            return `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank ${rankClass}">${rank}</div>
                    <div class="leaderboard-player">
                        <span class="leaderboard-name">${sanitizeText(entry.username)}</span>
                    </div>
                    <div class="leaderboard-rating">
                        <span class="leaderboard-stars">${stars}</span>
                        <span class="leaderboard-score">${entry.average}</span>
                        <span class="leaderboard-count">(${entry.count})</span>
                    </div>
                </div>
            `;
        }).join('')
        : '<div class="trade-empty">No ratings yet. Complete trades to get rated!</div>';
}

function renderMessages() {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;

    const currentUser = getCurrentUser();
    const messages = getDirectMessages();
    const users = getRegisteredUsers();

    const conversations = {};
    messages.forEach((msg) => {
        const otherUser = msg.from === currentUser ? msg.to : msg.from;
        if (!conversations[otherUser]) {
            conversations[otherUser] = [];
        }
        conversations[otherUser].push(msg);
    });

    const conversationKeys = Object.keys(conversations).sort((a, b) => {
        const lastA = conversations[a][conversations[a].length - 1].createdAt;
        const lastB = conversations[b][conversations[b].length - 1].createdAt;
        return new Date(lastB) - new Date(lastA);
    });

    messagesList.innerHTML = conversationKeys.length
        ? conversationKeys.map((username) => {
            const userMessages = conversations[username];
            const lastMessage = userMessages[userMessages.length - 1];
            const preview = sanitizeText(lastMessage.text).substring(0, 50) + (lastMessage.text.length > 50 ? '...' : '');
            return `
                <div class="conversation-item" onclick="openConversation('${username.replace(/'/g, "\\'")}')">
                    <div class="conversation-header">
                        <strong>${sanitizeText(username)}</strong>
                        <span class="conversation-time">${new Date(lastMessage.createdAt).toLocaleString('pl-PL')}</span>
                    </div>
                    <div class="conversation-preview">${preview}</div>
                </div>
            `;
        }).join('')
        : '<div class="trade-empty">No messages yet.</div>';
}

function openConversation(username) {
    const messagesList = document.getElementById('messagesList');
    const currentUser = getCurrentUser();
    const messages = getDirectMessages();

    const conversation = messages.filter((msg) => {
        return (msg.from === currentUser && msg.to === username) || (msg.from === username && msg.to === currentUser);
    }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    messagesList.innerHTML = `
        <div class="conversation-view">
            <div class="conversation-back">
                <button class="btn btn-secondary btn-small" onclick="renderMessages()">← Back</button>
                <strong>Conversation with ${sanitizeText(username)}</strong>
            </div>
            <div class="conversation-messages">
                ${conversation.map((msg) => `
                    <div class="dm-message ${msg.from === currentUser ? 'mine' : ''}">
                        <div class="dm-message-meta">${msg.from === currentUser ? 'You' : sanitizeText(msg.from)}</div>
                        <div>${sanitizeText(msg.text)}</div>
                        <div class="dm-message-time">${new Date(msg.createdAt).toLocaleString('pl-PL')}</div>
                    </div>
                `).join('')}
            </div>
            <div class="conversation-reply">
                <textarea id="quickReplyMessage" rows="2" placeholder="Quick reply..."></textarea>
                <button class="btn btn-primary" onclick="quickReply('${username.replace(/'/g, "\\'")}')">Send</button>
            </div>
        </div>
    `;
}

function quickReply(username) {
    const text = document.getElementById('quickReplyMessage')?.value.trim();
    if (!text) {
        showToast('Error', 'Write a message first.', 'error');
        return;
    }

    const currentUser = getCurrentUser();
    const messages = getDirectMessages();
    messages.push({
        id: Date.now(),
        from: currentUser,
        to: username,
        text: sanitizeText(text),
        createdAt: new Date().toISOString()
    });

    saveDirectMessages(messages);
    addNotification(username, `New DM from ${currentUser}.`);
    openConversation(username);
    showToast('Success', 'Message sent!', 'success');
}

function renderAdminPanel() {
    const currentUser = getCurrentUser();
    const userSelect = document.getElementById('adminUserSelect');
    const bannedList = document.getElementById('bannedIpList');
    const userSummary = document.getElementById('adminUserSummary');

    const users = getAllUsers().filter((user) => user.username !== currentUser);
    if (userSelect) {
        userSelect.innerHTML = users
            .map((user) => `<option value="${user.username}">${user.username} (${user.role})</option>`)
            .join('') || '<option value="">No players available</option>';
    }

    if (userSummary) {
        const selectedUsername = userSelect?.value || users[0]?.username;
        const selectedUser = users.find((user) => user.username === selectedUsername);
        userSummary.innerHTML = selectedUser
            ? `<strong>IP:</strong> ${selectedUser.ip}<br><strong>Warnings:</strong> ${selectedUser.warnings}<br><strong>Banned:</strong> ${selectedUser.banned ? 'Yes' : 'No'}`
            : '<em>Select a player to view details.</em>';
    }

    if (bannedList) {
        const bannedIps = getBannedIps();
        bannedList.innerHTML = bannedIps.length
            ? bannedIps.map((ip) => `<div class="ban-row"><span>${ip}</span><button type="button" class="btn btn-secondary btn-small" onclick="handleUnbanIp('${ip}')">Unban</button></div>`).join('')
            : '<div class="empty-state">No banned IPs.</div>';
    }
}

function renderAccount() {
    const accountContent = document.getElementById('accountContent');
    if (!accountContent) return;

    const currentUser = getCurrentUser();
    const userRole = localStorage.getItem('userRole') || 'user';
    const ratings = getPlayerRatings();
    const userRating = ratings[currentUser] || { average: 0, count: 0 };
    const offers = getTradeOffers().filter((o) => o.seller === currentUser);
    const requests = getTradeRequests().filter((r) => r.requester === currentUser);

    const stored = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
    const userData = stored[currentUser] || {};

    // Generate real UserID based on username hash
    const userId = userData.userId || Math.abs(currentUser.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0));
    
    // Use real registration date or current date
    const registered = userData.registered || new Date().toISOString();
    
    // Calculate real time spent based on localStorage timestamps
    const loginTime = localStorage.getItem('loginTime') || Date.now();
    const timeSpent = Math.floor((Date.now() - parseInt(loginTime)) / 1000);
    
    // Count real activity from localStorage
    const posts = userData.posts || 0;
    const likes = userData.likes || 0;
    const views = userData.views || 0;
    const awards = userData.awards || 0;

    accountContent.innerHTML = `
        <div class="account-grid">
            <div class="account-card profile-header">
                <div class="profile-avatar">
                    <div class="avatar-placeholder">${sanitizeText(currentUser.charAt(0).toUpperCase())}</div>
                </div>
                <div class="profile-info">
                    <h2>${sanitizeText(currentUser)}</h2>
                    <span class="role-badge">${userRole}</span>
                    <div class="profile-status">Offline</div>
                </div>
            </div>

            <div class="account-card">
                <h3>Profile Info</h3>
                <div class="profile-stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">UserID</span>
                        <span class="stat-value">#${userId}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Registered</span>
                        <span class="stat-value">${new Date(registered).toLocaleDateString('pl-PL')}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Rating</span>
                        <span class="stat-value">${userRating.average} ★</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Awards</span>
                        <span class="stat-value">${awards}</span>
                    </div>
                </div>
            </div>

            <div class="account-card">
                <h3>Activity</h3>
                <div class="profile-stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Time Spent</span>
                        <span class="stat-value">${Math.floor(timeSpent / 3600)}h ${Math.floor((timeSpent % 3600) / 60)}m</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Trade Offers</span>
                        <span class="stat-value">${offers.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Trade Requests</span>
                        <span class="stat-value">${requests.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Views</span>
                        <span class="stat-value">${views}</span>
                    </div>
                </div>
            </div>

            <div class="account-card">
                <h3>Your Trade Offers</h3>
                <div class="account-stats">
                    <div>Active offers: ${offers.length}</div>
                </div>
                <div class="account-list">
                    ${offers.length ? offers.map((o) => `
                        <div class="account-item">
                            <strong>${sanitizeText(o.itemName)}</strong>
                            <span>${sanitizeText(o.price || 'Open to trade')}</span>
                            <small>${new Date(o.createdAt).toLocaleString('pl-PL')}</small>
                        </div>
                    `).join('') : '<div class="trade-empty">No active offers</div>'}
                </div>
            </div>

            <div class="account-card">
                <h3>Your Trade Requests</h3>
                <div class="account-stats">
                    <div>Active requests: ${requests.length}</div>
                </div>
                <div class="account-list">
                    ${requests.length ? requests.map((r) => `
                        <div class="account-item">
                            <strong>${sanitizeText(r.itemName)}</strong>
                            <span>Qty: ${r.quantity}</span>
                            <small>${new Date(r.createdAt).toLocaleString('pl-PL')}</small>
                        </div>
                    `).join('') : '<div class="trade-empty">No active requests</div>'}
                </div>
            </div>
        </div>
    `;
}

function renderRoleManager() {
    const currentUser = localStorage.getItem('currentUser');
    const userSelect = document.getElementById('roleUserSelect');
    const roleList = document.getElementById('roleManagerList');
    const messageBox = document.getElementById('roleAssignmentMessage');
    if (!userSelect || !roleList) return;

    const users = getAllUsers();
    const options = users
        .filter((user) => user.username !== currentUser)
        .map((user) => `<option value="${user.username}">${user.username}</option>`)
        .join('');

    userSelect.innerHTML = options || '<option value="">No players available</option>';
    roleList.innerHTML = users
        .map((user) => `
            <div class="role-row">
                <span>${user.username}</span>
                <span class="role-badge">${user.role}</span>
            </div>
        `)
        .join('');

    if (messageBox) {
        messageBox.textContent = '';
        messageBox.className = 'auth-message';
    }
}

function getAllUsers() {
    try {
        const stored = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
        return Object.entries(stored).map(([username, data]) => ({
            username,
            role: data.role || 'user',
            ip: data.ip || 'unknown',
            warnings: data.warnings || 0,
            banned: Boolean(data.banned)
        }));
    } catch (error) {
        return [];
    }
}

function getBannedIps() {
    try {
        const stored = window.localStorage.getItem('bannedIps');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        return [];
    }
}

function handleUnbanIp(ip) {
    const ips = getBannedIps().filter((entry) => entry !== ip);
    window.localStorage.setItem('bannedIps', JSON.stringify(ips));
    renderAdminPanel();
    showToast('Success', `${ip} has been unbanned.`, 'success');
}

function handleAdminWarn() {
    const username = document.getElementById('adminUserSelect')?.value;
    if (!username) {
        showToast('Error', 'Select a player to warn.', 'error');
        return;
    }
    const users = getAllUsers();
    const user = users.find(u => u.username === username);
    if (user) {
        user.warnings = (user.warnings || 0) + 1;
        const stored = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
        stored[username] = { ...stored[username], warnings: user.warnings };
        localStorage.setItem('registeredUsers', JSON.stringify(stored));
        renderAdminPanel();
        showToast('Success', `${username} has been warned.`, 'success');
    }
}

function handleAssignRole() {
    const username = document.getElementById('roleUserSelect')?.value;
    const role = document.getElementById('roleSelect')?.value;
    const userRole = localStorage.getItem('userRole');

    console.log('handleAssignRole called', { username, role, userRole });

    if (!username || !role) {
        showToast('Error', 'Select a player and role first.', 'error');
        return;
    }

    if (role === 'owner' && userRole !== 'owner') {
        showToast('Error', 'Only owner can assign owner role.', 'error');
        return;
    }

    const stored = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
    if (stored[username]) {
        stored[username].role = role;
        localStorage.setItem('registeredUsers', JSON.stringify(stored));
        renderRoleManager();
        showToast('Success', `Updated ${username} to ${role}.`, 'success');
    }
}

window.handleAssignRole = handleAssignRole;
window.createTradeOffer = createTradeOffer;
window.createTradeRequest = createTradeRequest;
window.deleteItem = deleteItem;
window.startEditItem = startEditItem;

function getTradeOffers() {
    try {
        const stored = JSON.parse(localStorage.getItem('tradeOffers') || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        return [];
    }
}

function saveTradeOffers(offers) {
    localStorage.setItem('tradeOffers', JSON.stringify(offers));
}

function getTradeRequests() {
    try {
        const stored = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        return [];
    }
}

function saveTradeRequests(requests) {
    localStorage.setItem('tradeRequests', JSON.stringify(requests));
}

function getDirectMessages() {
    try {
        const stored = JSON.parse(localStorage.getItem('directMessages') || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        return [];
    }
}

function saveDirectMessages(messages) {
    localStorage.setItem('directMessages', JSON.stringify(messages));
}

function getItems() {
    try {
        const stored = JSON.parse(localStorage.getItem('items'));
        return Array.isArray(stored) ? stored : defaultItems;
    } catch (error) {
        return defaultItems;
    }
}

function saveItems(items) {
    localStorage.setItem('items', JSON.stringify(items));
}

function loadTableData(userRole) {
    const items = getItems();
    const sortedItems = sortItems(items, currentSort.key, currentSort.direction);
    renderTable(sortedItems, userRole);
    renderTradePlace();
    renderNotifications();
    renderReportTargets();
    renderModeratorReports();
    renderReportSection();
    renderLeaderboard();
    renderMessages();
    renderNotificationsSection();
    renderAccount();
    renderAdminPanel();
    renderRoleManager();
    updateLastUpdate();
}

function sortItems(items, key, direction) {
    const sorted = [...items];

    sorted.sort((a, b) => {
        let valueA = a[key];
        let valueB = b[key];

        if (key === 'name' || key === 'type' || key === 'tier' || key === 'rarity') {
            valueA = String(valueA || '').toLowerCase();
            valueB = String(valueB || '').toLowerCase();
        } else if (key === 'corruptedPages') {
            valueA = Number(valueA || 0);
            valueB = Number(valueB || 0);
        }

        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    return sorted;
}

function toggleSort(key) {
    if (currentSort.key === key) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.key = key;
        currentSort.direction = 'asc';
    }

    const userRole = localStorage.getItem('userRole') || 'admin';
    loadTableData(userRole);
}

function getIconHtml(item) {
    if (!item.icon) {
        return '<span class="item-icon">✦</span>';
    }

    const isImageUrl = /^https?:\/\//i.test(item.icon) || /^data:image\//i.test(item.icon);
    if (isImageUrl) {
        return `<img class="item-image" src="${item.icon}" alt="${item.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='✦';">`;
    }

    return `<span class="item-icon">${item.icon}</span>`;
}

function renderTable(items, userRole) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No items available yet.</td></tr>';
        return;
    }

    items.forEach((item, index) => {
        const row = document.createElement('tr');
        const rarityClass = `rarity-${(item.rarity || 'common').toLowerCase()}`;
        const corruptedPages = item.corruptedPages !== undefined ? item.corruptedPages : '—';
        const tier = item.tier ? item.tier : '—';

        let actionsCell = '';
        if (userRole === 'admin') {
            actionsCell = `<td><div class="table-actions"><button onclick="startEditItem(${index})" class="btn-table btn-edit">Edit</button><button onclick="deleteItem(${index})" class="btn-table btn-delete">Delete</button></div></td>`;
        }

        row.dataset.searchText = `${item.name} ${item.icon || ''} ${item.type || ''} ${item.rarity || ''} ${item.tier || ''}`.toLowerCase();
        row.innerHTML = `
            <td>${getIconHtml(item)}</td>
            <td>${item.name}</td>
            <td>${corruptedPages}</td>
            <td>${tier}</td>
            <td class="${rarityClass}">${item.rarity}</td>
            <td>${item.type}</td>
            ${actionsCell}
        `;
        tbody.appendChild(row);
    });
}

function resetForm() {
    document.getElementById('itemIcon').value = '';
    document.getElementById('itemImageUpload').value = '';
    document.getElementById('itemName').value = '';
    document.getElementById('itemCorruptedPages').value = '';
    document.getElementById('itemTier').value = '';
    document.getElementById('itemType').value = '';
    document.getElementById('itemRarity').value = 'Common';
    document.getElementById('itemImagePreview').innerHTML = '';
    uploadedItemImage = null;
    document.getElementById('editingItemIndex').value = '';
    editingIndex = null;
    document.getElementById('saveItemBtn').textContent = 'Add item';
}

function saveItem() {
    const icon = document.getElementById('itemIcon').value.trim();
    const name = document.getElementById('itemName').value.trim();
    const corruptedPages = document.getElementById('itemCorruptedPages').value.trim();
    const tier = document.getElementById('itemTier').value.trim();
    const rarity = document.getElementById('itemRarity').value;
    const type = document.getElementById('itemType').value.trim();

    if (!name || !type) {
        showToast('Error', 'Fill name and type fields!', 'error');
        return;
    }

    const items = getItems();
    const itemPayload = {
        icon: uploadedItemImage || icon,
        name,
        corruptedPages: corruptedPages ? parseInt(corruptedPages, 10) : undefined,
        tier,
        rarity,
        type
    };

    if (editingIndex !== null) {
        items[editingIndex] = { ...items[editingIndex], ...itemPayload };
    } else {
        items.push(itemPayload);
    }

    saveItems(items);
    resetForm();
    loadTableData('admin');
}

function startEditItem(index) {
    const items = getItems();
    const item = items[index];
    if (!item) return;

    editingIndex = index;
    document.getElementById('editingItemIndex').value = index;
    document.getElementById('itemIcon').value = item.icon && !item.icon.startsWith('data:') ? item.icon : '';
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemCorruptedPages').value = item.corruptedPages || '';
    document.getElementById('itemTier').value = item.tier || '';
    document.getElementById('itemType').value = item.type || '';
    document.getElementById('itemRarity').value = item.rarity || 'Common';
    document.getElementById('itemImageUpload').value = '';
    uploadedItemImage = item.icon && item.icon.startsWith('data:') ? item.icon : null;
    document.getElementById('itemImagePreview').innerHTML = uploadedItemImage ? `<img src="${uploadedItemImage}" alt="Preview">` : '';
    document.getElementById('saveItemBtn').textContent = 'Save changes';
}

function deleteItem(index) {
    if (confirm('>>> REMOVE ITEM? <<<')) {
        const items = getItems();
        items.splice(index, 1);
        saveItems(items);
        if (editingIndex === index) {
            resetForm();
        } else if (editingIndex !== null && editingIndex > index) {
            editingIndex -= 1;
        }
        loadTableData('admin');
        showToast('Success', 'Item removed successfully', 'success');
    }
}

function filterTable() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const rows = document.querySelectorAll('#pricesTable tbody tr');

    rows.forEach((row) => {
        const text = row.dataset.searchText || '';
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

function renderTradePlace() {
    const items = getItems();
    const tradeItemSelect = document.getElementById('tradeItemSelect');
    const requestItemSelect = document.getElementById('requestItemSelect');
    const dmRecipient = document.getElementById('dmRecipient');
    const offerList = document.getElementById('tradeOffersList');
    const requestList = document.getElementById('tradeRequestsList');
    const dmList = document.getElementById('dmMessagesList');

    if (!tradeItemSelect || !dmRecipient || !offerList || !dmList) {
        return;
    }

    const currentUser = getCurrentUser();
    tradeItemSelect.innerHTML = items.length
        ? items.map((item) => `<option value="${item.name}">${item.name}</option>`).join('')
        : '<option value="">No items yet</option>';

    if (requestItemSelect) {
        requestItemSelect.innerHTML = items.length
            ? items.map((item) => `<option value="${item.name}">${item.name}</option>`).join('')
            : '<option value="">No items yet</option>';
    }

    const users = getRegisteredUsers().filter((user) => user !== currentUser);
    dmRecipient.innerHTML = users.length
        ? users.map((user) => `<option value="${user}">${user}</option>`).join('')
        : '<option value="">No available users</option>';

    const offers = getTradeOffers().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!offers.length) {
        offerList.innerHTML = '<div class="trade-empty">No active offers yet.</div>';
    } else {
        offerList.innerHTML = offers.map((offer) => {
            const itemName = sanitizeText(offer.itemName);
            const message = sanitizeText(offer.message || 'No extra note.');
            const seller = sanitizeText(offer.seller);
            const isOwner = currentUser === offer.seller;
            const actionButtons = isOwner
                ? '<span class="trade-tag">Your offer</span>'
                : `
                    <button class="btn btn-primary btn-small" type="button" onclick="acceptTradeOffer(${offer.id})">Accept</button>
                    <button class="btn btn-secondary btn-small" type="button" onclick="rejectTradeOffer(${offer.id})">Reject</button>
                    <button class="btn btn-secondary btn-small" type="button" onclick="startDm('${seller.replace(/'/g, "\\'")}')">DM</button>
                `;

            return `
                <div class="trade-offer">
                    <div class="trade-offer-header">
                        <strong>${itemName}</strong>
                        <span>${sanitizeText(offer.price || 'Open to trade')}</span>
                    </div>
                    <p>${message}</p>
                    <div class="trade-offer-meta">
                        <span>Seller: ${seller}</span>
                        <span>${new Date(offer.createdAt).toLocaleString('pl-PL')}</span>
                    </div>
                    <div class="trade-actions">${actionButtons}</div>
                </div>
            `;
        }).join('');
    }

    if (requestList) {
        const requests = getTradeRequests().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (!requests.length) {
            requestList.innerHTML = '<div class="trade-empty">No active requests yet.</div>';
        } else {
            requestList.innerHTML = requests.map((request) => {
                const itemName = sanitizeText(request.itemName);
                const message = sanitizeText(request.message || 'No extra note.');
                const requester = sanitizeText(request.requester);
                const isOwner = currentUser === request.requester;
                const actionButtons = isOwner
                    ? '<span class="trade-tag">Your request</span>'
                    : `
                        <button class="btn btn-primary btn-small" type="button" onclick="startDm('${requester.replace(/'/g, "\\'")}')">DM</button>
                    `;

                return `
                    <div class="trade-offer">
                        <div class="trade-offer-header">
                            <strong>${itemName}</strong>
                            <span>Qty: ${request.quantity}</span>
                        </div>
                        <p>${message}</p>
                        <div class="trade-offer-meta">
                            <span>CP: ${request.cp || 'Any'}</span>
                            <span>Requester: ${requester}</span>
                            <span>${new Date(request.createdAt).toLocaleString('pl-PL')}</span>
                        </div>
                        <div class="trade-actions">${actionButtons}</div>
                    </div>
                `;
            }).join('');
        }
    }

    const messages = getDirectMessages();
    const recipient = dmRecipient.value;
    const visibleMessages = messages.filter((message) => {
        const isRelevant = (message.from === currentUser && message.to === recipient) || (message.from === recipient && message.to === currentUser);
        return recipient ? isRelevant : false;
    });

    if (!recipient) {
        dmList.innerHTML = '<div class="trade-empty">Choose a player to see messages.</div>';
        return;
    }

    if (!visibleMessages.length) {
        dmList.innerHTML = '<div class="trade-empty">No messages yet. Start the conversation.</div>';
        return;
    }

    dmList.innerHTML = visibleMessages.map((message) => `
        <div class="dm-message ${message.from === currentUser ? 'mine' : ''}">
            <div class="dm-message-meta">${message.from === currentUser ? 'You' : sanitizeText(message.from)}</div>
            <div>${sanitizeText(message.text)}</div>
            <div class="dm-message-time">${new Date(message.createdAt).toLocaleString('pl-PL')}</div>
        </div>
    `).join('');
}

function createTradeOffer() {
    const currentUser = getCurrentUser();
    const itemName = document.getElementById('tradeItemSelect')?.value;
    const price = document.getElementById('tradePrice')?.value.trim();
    const message = document.getElementById('tradeMessage')?.value.trim();

    console.log('createTradeOffer called', { currentUser, itemName, price, message });

    if (!itemName) {
        showToast('Error', 'Select an item before listing it.', 'error');
        return;
    }

    if (!isSafeString(itemName) || !isSafeString(message) || !isSafeString(price)) {
        showToast('Error', 'Unsafe characters detected.', 'error');
        return;
    }

    if (!canPerformAction('tradeOffer', 5, 60_000)) {
        showToast('Warning', 'Too many trade actions recently. Please wait a moment.', 'warning');
        return;
    }

    recordAction('tradeOffer');
    const offers = getTradeOffers();
    offers.push({
        id: Date.now(),
        seller: currentUser,
        itemName,
        price,
        message,
        createdAt: new Date().toISOString()
    });

    saveTradeOffers(offers);
    document.getElementById('tradePrice').value = '';
    document.getElementById('tradeMessage').value = '';
    addNotification('all', `${currentUser} posted a new trade offer for ${itemName}.`);
    renderTradePlace();
    showToast('Success', 'Trade offer listed successfully!', 'success');
}

function createTradeRequest() {
    const currentUser = getCurrentUser();
    const itemName = document.getElementById('requestItemSelect')?.value;
    const cp = document.getElementById('requestCp')?.value.trim();
    const quantity = document.getElementById('requestQuantity')?.value.trim();
    const message = document.getElementById('requestMessage')?.value.trim();

    if (!itemName) {
        showToast('Error', 'Select an item before listing request.', 'error');
        return;
    }

    if (!isSafeString(itemName) || !isSafeString(message) || !isSafeString(cp)) {
        showToast('Error', 'Unsafe characters detected.', 'error');
        return;
    }

    if (!canPerformAction('tradeRequest', 5, 60_000)) {
        showToast('Warning', 'Too many trade actions recently. Please wait a moment.', 'warning');
        return;
    }

    recordAction('tradeRequest');
    const requests = getTradeRequests();
    requests.push({
        id: Date.now(),
        requester: currentUser,
        itemName,
        cp: cp ? parseInt(cp, 10) : null,
        quantity: quantity ? parseInt(quantity, 10) : 1,
        message,
        createdAt: new Date().toISOString()
    });

    saveTradeRequests(requests);
    document.getElementById('requestCp').value = '';
    document.getElementById('requestQuantity').value = '1';
    document.getElementById('requestMessage').value = '';
    addNotification('all', `${currentUser} posted a new trade request for ${itemName}.`);
    renderTradePlace();
    showToast('Success', 'Trade request listed successfully!', 'success');
}

function acceptTradeOffer(id) {
    const currentUser = getCurrentUser();
    if (!canPerformAction('tradeResponse', 4, 60_000)) {
        showToast('Warning', 'Too many offer responses.', 'warning');
        return;
    }
    recordAction('tradeResponse');

    const offers = getTradeOffers();
    const offer = offers.find((offer) => offer.id === id);
    if (!offer) {
        showToast('Error', 'Offer not found.', 'error');
        return;
    }

    const updatedOffers = offers.filter((offerItem) => offerItem.id !== id);
    saveTradeOffers(updatedOffers);
    addNotification(offer.seller, `${currentUser} accepted your offer for ${offer.itemName}.`);
    addNotification(currentUser, `You accepted ${offer.seller}'s offer for ${offer.itemName}.`);
    renderTradePlace();
    showToast('Success', 'Trade offer accepted!', 'success');

    setTimeout(() => {
        const rating = prompt(`Rate ${offer.seller} (1-5 stars):`, '5');
        if (rating && !isNaN(rating) && rating >= 1 && rating <= 5) {
            ratePlayer(offer.seller, parseInt(rating, 10));
            showToast('Thanks', `You rated ${offer.seller} ${rating} stars!`, 'success');
            renderLeaderboard();
        }
    }, 500);
}

function rejectTradeOffer(id) {
    const currentUser = getCurrentUser();
    if (!canPerformAction('tradeResponse', 6, 60_000)) {
        showToast('Warning', 'Too many offer responses.', 'warning');
        return;
    }
    recordAction('tradeResponse');

    const offers = getTradeOffers();
    const offer = offers.find((offer) => offer.id === id);
    if (!offer) {
        showToast('Error', 'Offer not found.', 'error');
        return;
    }

    const updatedOffers = offers.filter((offerItem) => offerItem.id !== id);
    saveTradeOffers(updatedOffers);
    addNotification(offer.seller, `${currentUser} rejected your offer for ${offer.itemName}.`);
    renderTradePlace();
    showToast('Info', 'Trade offer rejected.', 'info');
}

function startDm(recipient) {
    const modal = document.getElementById('dmModal');
    const recipientInput = document.getElementById('dmModalRecipient');
    const recipientDisplay = document.getElementById('dmModalRecipientDisplay');
    const messageInput = document.getElementById('dmModalMessage');

    if (modal && recipientInput && recipientDisplay && messageInput) {
        recipientInput.value = recipient;
        recipientDisplay.textContent = `To: ${recipient}`;
        messageInput.value = '';
        modal.style.display = 'flex';
        messageInput.focus();
    }
}

function closeDmModal() {
    const modal = document.getElementById('dmModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function sendDmFromModal() {
    const recipient = document.getElementById('dmModalRecipient')?.value;
    const text = document.getElementById('dmModalMessage')?.value.trim();

    if (!recipient || !text) {
        showToast('Error', 'Write a message first.', 'error');
        return;
    }

    if (!isSafeString(text) || !isSafeString(recipient)) {
        showToast('Error', 'Unsafe content detected.', 'error');
        return;
    }

    if (!canPerformAction('directMessage', 8, 60_000)) {
        showToast('Warning', 'Too many messages recently.', 'warning');
        return;
    }

    recordAction('directMessage');
    const messages = getDirectMessages();
    messages.push({
        id: Date.now(),
        from: getCurrentUser(),
        to: recipient,
        text: sanitizeText(text),
        createdAt: new Date().toISOString()
    });

    saveDirectMessages(messages);
    addNotification(recipient, `New DM from ${getCurrentUser()}.`);
    closeDmModal();
    renderMessages();
    showToast('Success', 'Message sent!', 'success');
}

function sendDirectMessage() {
    const currentUser = getCurrentUser();
    const recipient = document.getElementById('dmRecipient')?.value;
    const text = document.getElementById('dmMessage')?.value.trim();

    if (!recipient || !text) {
        showToast('Error', 'Choose a player and write a message.', 'error');
        return;
    }

    if (!isSafeString(text) || !isSafeString(recipient)) {
        showToast('Error', 'Unsafe content detected.', 'error');
        return;
    }

    if (!canPerformAction('directMessage', 8, 60_000)) {
        showToast('Warning', 'Too many messages recently.', 'warning');
        return;
    }

    recordAction('directMessage');
    const messages = getDirectMessages();
    messages.push({
        id: Date.now(),
        from: currentUser,
        to: recipient,
        text: sanitizeText(text),
        createdAt: new Date().toISOString()
    });

    saveDirectMessages(messages);
    addNotification(recipient, `New DM from ${currentUser}.`);
    document.getElementById('dmMessage').value = '';
    renderTradePlace();
    showToast('Success', 'Message sent!', 'success');
}

function updateLastUpdate() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pl-PL') + ' ' + now.toLocaleTimeString('pl-PL');
    document.getElementById('lastUpdate').textContent = dateStr;
}

function setTheme(theme) {
    const resolvedTheme = theme === 'light' ? 'light' : 'dark';
    document.body.classList.toggle('theme-light', resolvedTheme === 'light');
    localStorage.setItem('theme', resolvedTheme);
    const button = document.getElementById('themeToggle');
    if (button) {
        button.textContent = resolvedTheme === 'light' ? '🌙 Dark' : '☀️ Light';
    }
}

function handleItemImageUpload(event) {
    const file = event.target.files?.[0];
    const preview = document.getElementById('itemImagePreview');

    if (!file || !preview) {
        uploadedItemImage = null;
        if (preview) preview.innerHTML = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        uploadedItemImage = reader.result;
        preview.innerHTML = `<img src="${uploadedItemImage}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

function switchSection(sectionName) {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.section === sectionName);
    });

    document.querySelectorAll('.section-content').forEach((section) => {
        section.style.display = 'none';
    });

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
}

function initDashboardControls() {
    document.querySelectorAll('.sort-btn').forEach((button) => {
        button.addEventListener('click', () => toggleSort(button.dataset.sort));
    });

    document.querySelectorAll('.nav-btn').forEach((button) => {
        button.addEventListener('click', () => switchSection(button.dataset.section));
    });

    const themeButton = document.getElementById('themeToggle');
    if (themeButton) {
        themeButton.addEventListener('click', () => {
            const nextTheme = document.body.classList.contains('theme-light') ? 'dark' : 'light';
            setTheme(nextTheme);
        });
    }

    document.getElementById('saveItemBtn')?.addEventListener('click', saveItem);
    document.getElementById('cancelEditBtn')?.addEventListener('click', resetForm);
    document.getElementById('itemImageUpload')?.addEventListener('change', handleItemImageUpload);
    document.getElementById('createTradeOfferBtn')?.addEventListener('click', createTradeOffer);
    document.getElementById('createTradeRequestBtn')?.addEventListener('click', createTradeRequest);
    document.getElementById('assignRoleBtn')?.addEventListener('click', handleAssignRole);
    document.getElementById('dmModalSendBtn')?.addEventListener('click', sendDmFromModal);
    document.getElementById('submitReportBtn')?.addEventListener('click', submitReport);
}

document.addEventListener('DOMContentLoaded', () => {
    initDashboardControls();
    setTheme(localStorage.getItem('theme') || 'dark');
});
