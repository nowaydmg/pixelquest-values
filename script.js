// Pixel Quest Values — UI layer (uses db.js + appData cache)

let currentSort = { key: 'corruptedPages', direction: 'desc' };
let editingItemId = null;
let uploadedItemImage = null;

const ACHIEVEMENTS = {
    FIRST_TRADE: 'First Trade',
    TRADER_MASTER: 'Trader Master',
    SOCIAL_BUTTERFLY: 'Social Butterfly',
    HELPER: 'Helper',
    COLLECTOR: 'Collector'
};

// --- utilities ---

function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            <div class="toast-title">${sanitizeText(title)}</div>
            <div class="toast-message">${sanitizeText(message)}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
}

function sanitizeText(input) {
    return String(input)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function isSafeString(input) {
    return !/<script|javascript:|onerror|onload|eval\(|Function\(/i.test(String(input));
}

function isAllowedImageSource(source) {
    if (!source) return false;
    return (
        /^https:\/\//i.test(source) ||
        /^data:image\/(png|jpeg|webp);base64,/i.test(source)
    );
}

function getRegisteredUsers() {
    return appData.users.map(u => u.username);
}

function getNotificationsForUser(user) {
    return appData.notifications.filter(n => n.to === user || n.to === 'all');
}

function getPendingReports() {
    return appData.reports.filter(r => r.status === 'pending');
}

function hasAchievement(username, achievementId) {
    return appData.achievements[username]?.includes(achievementId) || false;
}

function isWatched(username, itemName) {
    return appData.watchlist[username]?.includes(itemName) || false;
}

function getUserAvatar(username) {
    const colors = ['#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
    const hash = username.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
    return { background: colors[Math.abs(hash) % colors.length], initial: username.charAt(0).toUpperCase() };
}

function sortItems(items, key, direction) {
    const sorted = [...items];
    sorted.sort((a, b) => {
        let valueA = a[key];
        let valueB = b[key];
        if (['name', 'type', 'tier', 'rarity'].includes(key)) {
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

function populateValueFilters() {
    const fields = [
        ['filterTier', [...new Set(appData.items.map(item => item.tier).filter(Boolean))].sort()],
        ['filterRarity', [...new Set(appData.items.map(item => item.rarity).filter(Boolean))].sort()],
        ['filterType', [...new Set(appData.items.map(item => item.type).filter(Boolean))].sort()]
    ];
    fields.forEach(([id, values]) => {
        const select = document.getElementById(id);
        if (!select) return;
        const selected = select.value;
        const label = select.options[0]?.textContent || 'All';
        select.innerHTML = `<option value="">${label}</option>${values.map(value => `<option value="${sanitizeText(value)}">${sanitizeText(value)}</option>`).join('')}`;
        select.value = values.includes(selected) ? selected : '';
    });
}

// --- main load ---

async function loadTableData(userRole) {
    await refreshAppData();
    const sortedItems = sortItems(appData.items, currentSort.key, currentSort.direction);
    populateValueFilters();
    renderTable(sortedItems, userRole);
    renderValueSuggestions();
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

async function reloadDashboard() {
    await loadTableData(getUserRole());
}

// --- notifications ---

function renderNotifications() {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;
    const notifications = getNotificationsForUser(getCurrentUser());
    notificationList.innerHTML = notifications.length
        ? notifications.map(note => `
            <div class="trade-offer notification-card ${note.seen ? 'seen' : ''}">
                <div class="trade-offer-header">
                    <strong>Notification</strong>
                    <span>${new Date(note.createdAt).toLocaleTimeString('pl-PL')}</span>
                </div>
                <div>${note.text}</div>
                <div class="trade-actions">
                    <button class="btn btn-secondary btn-small" type="button" onclick="clearNotification('${note.id}')">Dismiss</button>
                </div>
            </div>`).join('')
        : '<div class="trade-empty">No notifications.</div>';
}

function renderNotificationsSection() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;
    const notifications = getNotificationsForUser(getCurrentUser());
    if (!notifications.length) {
        notificationsList.innerHTML = '<div class="trade-empty">No notifications yet.</div>';
        return;
    }
    notificationsList.innerHTML = notifications
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(note => `
            <div class="notification-card ${note.seen ? 'seen' : ''}">
                <div class="notification-content">${note.text}</div>
                <div class="notification-time">${new Date(note.createdAt).toLocaleString('pl-PL')}</div>
                <div class="notification-actions">
                    <button class="btn btn-secondary btn-small" type="button" onclick="clearNotification('${note.id}')">Dismiss</button>
                </div>
            </div>`).join('');
}

async function clearNotificationHandler(id) {
    await clearNotification(id);
    await reloadDashboard();
}

// --- suggestions ---

function renderValueSuggestions() {
    const itemSelect = document.getElementById('suggestionItemSelect');
    const list = document.getElementById('suggestionsList');
    if (!itemSelect || !list) return;

    const selected = itemSelect.value;
    itemSelect.innerHTML = appData.items.length
        ? appData.items.map(item => `<option value="${sanitizeText(item.name)}">${sanitizeText(item.name)}</option>`).join('')
        : '<option value="">No items available</option>';
    itemSelect.value = appData.items.some(item => item.name === selected) ? selected : itemSelect.value;

    const reviewer = ['value manager', 'moderator', 'admin', 'owner'].includes(getUserRole());
    const suggestions = appData.valueSuggestions;
    list.innerHTML = suggestions.length ? suggestions.map(suggestion => `
        <div class="trade-offer suggestion-card">
            <div class="trade-offer-header"><strong>${sanitizeText(suggestion.itemName)} → ${sanitizeText(String(suggestion.proposedCp))} CP</strong><span class="report-status ${suggestion.status}">${sanitizeText(suggestion.status)}</span></div>
            <div>${sanitizeText(suggestion.reason)}</div>
            <div class="trade-offer-meta"><span>By ${sanitizeText(suggestion.suggester)}</span><span>${new Date(suggestion.createdAt).toLocaleString('pl-PL')}</span></div>
            ${reviewer && suggestion.status === 'pending' ? `<div class="trade-actions"><button class="btn btn-primary btn-small" type="button" onclick="reviewSuggestion('${suggestion.id}', 'approved')">Approve${['value manager', 'admin', 'owner'].includes(getUserRole()) ? ' & apply' : ''}</button><button class="btn btn-secondary btn-small" type="button" onclick="reviewSuggestion('${suggestion.id}', 'rejected')">Reject</button></div>` : ''}
        </div>`).join('') : '<div class="trade-empty">No suggestions yet. Be the first to help improve the guide.</div>';
}

async function submitValueSuggestion() {
    const itemName = document.getElementById('suggestionItemSelect')?.value;
    const proposedCp = document.getElementById('suggestionCp')?.value;
    const reason = document.getElementById('suggestionReason')?.value.trim();
    if (!itemName || proposedCp === '' || !reason) return showToast('Missing details', 'Choose an item, CP value, and explanation.', 'error');
    try {
        await addValueSuggestion({ itemName, proposedCp: Number(proposedCp), reason });
        document.getElementById('suggestionCp').value = '';
        document.getElementById('suggestionReason').value = '';
        await reloadDashboard();
        showToast('Suggestion sent', 'The value team will review it privately.', 'success');
    } catch (error) {
        showToast('Suggestion not sent', error.message || 'Try again shortly.', 'error');
    }
}

async function reviewSuggestion(id, status) {
    try {
        await reviewValueSuggestion(id, status);
        await reloadDashboard();
        showToast('Suggestion reviewed', status === 'approved' ? 'The suggestion was approved.' : 'The suggestion was rejected.', 'success');
    } catch (error) {
        showToast('Review failed', error.message || 'Try again shortly.', 'error');
    }
}

// --- reports ---

function renderReportTargets() {
    const currentUser = getCurrentUser();
    const reportTargetSelect = document.getElementById('reportTargetSelect');
    if (!reportTargetSelect) return;
    const users = getRegisteredUsers().filter(u => u !== currentUser);
    reportTargetSelect.innerHTML = users.length
        ? users.map(u => `<option value="${u}">${u}</option>`).join('')
        : '<option value="">No players available</option>';
}

async function submitReport() {
    const currentUser = getCurrentUser();
    const target = document.getElementById('reportTargetSelect')?.value;
    const reason = document.getElementById('reportReason')?.value.trim();
    if (!target || !reason) { showToast('Error', 'Select a player and enter a reason.', 'error'); return; }
    if (!isSafeString(target) || !isSafeString(reason)) { showToast('Error', 'Unsafe characters detected.', 'error'); return; }
    try {
        await addReport({ target, reason, reporter: currentUser });
    } catch (error) {
        showToast('Report not sent', error.message || 'Try again shortly.', 'error');
        return;
    }
    document.getElementById('reportReason').value = '';
    await reloadDashboard();
    showToast('Success', 'Report submitted successfully.', 'success');
}

function renderModeratorReports() {
    const reportsList = document.getElementById('moderatorReportsList');
    if (!reportsList) return;
    const reports = getPendingReports();
    reportsList.innerHTML = reports.length
        ? reports.map(report => `
            <div class="trade-offer report-card">
                <div class="trade-offer-header">
                    <strong>Report: ${sanitizeText(report.target)}</strong>
                    <span>${new Date(report.createdAt).toLocaleTimeString('pl-PL')}</span>
                </div>
                <div>${sanitizeText(report.reason)}</div>
                <div class="trade-offer-meta">Reporter: ${sanitizeText(report.reporter)}</div>
                <div class="trade-actions">
                    <button class="btn btn-primary btn-small" type="button" onclick="handleReportOutcome('${report.id}', 'approved')">Approve</button>
                    <button class="btn btn-secondary btn-small" type="button" onclick="handleReportOutcome('${report.id}', 'rejected')">Reject</button>
                </div>
            </div>`).join('')
        : '<div class="trade-empty">No pending reports.</div>';
}

async function handleReportOutcome(id, status) {
    await updateReportStatus(id, status);
    await reloadDashboard();
}

function renderReportSection() {
    const reportList = document.getElementById('reportList');
    if (!reportList) return;
    const currentUser = getCurrentUser();
    const userRole = getUserRole();
    let filtered = appData.reports;
    if (!['moderator', 'admin', 'owner'].includes(userRole)) {
        filtered = appData.reports.filter(r => r.reporter === currentUser);
    }
    reportList.innerHTML = filtered.length
        ? filtered.map(report => `
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
            </div>`).join('')
        : '<div class="trade-empty">No reports available.</div>';
}

// --- leaderboard ---

function renderLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;
    const entries = Object.entries(appData.ratings).map(([username, data]) => ({ username, ...data }));
    entries.sort((a, b) => parseFloat(b.average) - parseFloat(a.average));
    leaderboardList.innerHTML = entries.length
        ? entries.map((entry, index) => {
            const rank = index + 1;
            const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
            const stars = '★'.repeat(Math.round(parseFloat(entry.average)));
            const avatar = getUserAvatar(entry.username);
            const achievements = appData.achievements[entry.username]?.length || 0;
            return `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank ${rankClass}">${rank}</div>
                    <div class="leaderboard-avatar" style="background: ${avatar.background};">${avatar.initial}</div>
                    <div class="leaderboard-player">
                        <span class="leaderboard-name">${sanitizeText(entry.username)}</span>
                        <div class="leaderboard-stats">
                            <span class="leaderboard-achievements">🏆 ${achievements}</span>
                            <span class="leaderboard-trades">📊 ${entry.count} trades</span>
                        </div>
                    </div>
                    <div class="leaderboard-rating">
                        <span class="leaderboard-stars">${stars}</span>
                        <span class="leaderboard-score">${entry.average}</span>
                        <span class="leaderboard-count">(${entry.count})</span>
                    </div>
                </div>`;
        }).join('')
        : '<div class="trade-empty">No ratings yet. Complete trades to get rated!</div>';
}

// --- messages ---

function renderMessages() {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;
    const currentUser = getCurrentUser();
    const conversations = {};
    appData.messages.forEach(msg => {
        const otherUser = msg.from === currentUser ? msg.to : msg.from;
        if (!conversations[otherUser]) conversations[otherUser] = [];
        conversations[otherUser].push(msg);
    });
    const keys = Object.keys(conversations).sort((a, b) => {
        const lastA = conversations[a][conversations[a].length - 1].createdAt;
        const lastB = conversations[b][conversations[b].length - 1].createdAt;
        return new Date(lastB) - new Date(lastA);
    });
    messagesList.innerHTML = keys.length
        ? keys.map(username => {
            const msgs = conversations[username];
            const lastMessage = msgs[msgs.length - 1];
            const preview = sanitizeText(lastMessage.text).substring(0, 50) + (lastMessage.text.length > 50 ? '...' : '');
            const avatar = getUserAvatar(username);
            return `
                <div class="conversation-item" onclick="openConversation('${username.replace(/'/g, "\\'")}')">
                    <div class="conversation-avatar" style="background: ${avatar.background};">${avatar.initial}</div>
                    <div class="conversation-content">
                        <div class="conversation-header">
                            <strong>${sanitizeText(username)}</strong>
                            <span class="conversation-time">${new Date(lastMessage.createdAt).toLocaleString('pl-PL')}</span>
                        </div>
                        <div class="conversation-preview">${preview}</div>
                    </div>
                </div>`;
        }).join('')
        : '<div class="trade-empty">No messages yet.</div>';
}

function openConversation(username) {
    const messagesList = document.getElementById('messagesList');
    const currentUser = getCurrentUser();
    const conversation = appData.messages
        .filter(msg => (msg.from === currentUser && msg.to === username) || (msg.from === username && msg.to === currentUser))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    messagesList.innerHTML = `
        <div class="conversation-view">
            <div class="conversation-back">
                <button class="btn btn-secondary btn-small" onclick="renderMessages()">← Back</button>
                <strong>Conversation with ${sanitizeText(username)}</strong>
            </div>
            <div class="conversation-messages">
                ${conversation.map(msg => `
                    <div class="dm-message ${msg.from === currentUser ? 'mine' : ''}">
                        <div class="dm-message-meta">${msg.from === currentUser ? 'You' : sanitizeText(msg.from)}</div>
                        <div>${sanitizeText(msg.text)}</div>
                        <div class="dm-message-time">${new Date(msg.createdAt).toLocaleString('pl-PL')}</div>
                    </div>`).join('')}
            </div>
            <div class="conversation-reply">
                <textarea id="quickReplyMessage" rows="2" placeholder="Quick reply..."></textarea>
                <button class="btn btn-primary" onclick="quickReply('${username.replace(/'/g, "\\'")}')">Send</button>
            </div>
        </div>`;
}

async function quickReply(username) {
    const text = document.getElementById('quickReplyMessage')?.value.trim();
    if (!text) { showToast('Error', 'Write a message first.', 'error'); return; }
    const currentUser = getCurrentUser();
    await addMessage({ from: currentUser, to: username, text: sanitizeText(text) });
    await reloadDashboard();
    openConversation(username);
    showToast('Success', 'Message sent!', 'success');
}

// --- admin ---

function renderAdminPanel() {
    const currentUser = getCurrentUser();
    const userSelect = document.getElementById('adminUserSelect');
    const bannedList = document.getElementById('bannedIpList');
    const userSummary = document.getElementById('adminUserSummary');
    const userDatabase = document.getElementById('adminUserDatabase');

    const users = appData.users.filter(u => u.username !== currentUser);
    if (userSelect) {
        userSelect.innerHTML = users.length
            ? users.map(u => `<option value="${u.username}">${u.username} (${u.role})</option>`).join('')
            : '<option value="">No players available</option>';
    }
    if (userSummary) {
        const selected = userSelect?.value || users[0]?.username;
        const user = users.find(u => u.username === selected);
        userSummary.innerHTML = user
            ? `<strong>IP:</strong> ${user.ip}<br><strong>Warnings:</strong> ${user.warnings}<br><strong>Banned:</strong> ${user.banned ? 'Yes' : 'No'}`
            : '<em>Select a player to view details.</em>';
    }
    if (bannedList) {
        bannedList.innerHTML = appData.bannedIps.length
            ? appData.bannedIps.map(ip => `<div class="ban-row"><span>${ip}</span><button type="button" class="btn btn-secondary btn-small" onclick="handleUnbanIp('${ip}')">Unban</button></div>`).join('')
            : '<div class="empty-state">No banned IPs.</div>';
    }
    if (userDatabase) {
        userDatabase.innerHTML = users.length ? users.map(user => `
            <div class="role-row user-database-row">
                <div><strong>${sanitizeText(user.username)}</strong><small>${sanitizeText(user.role)} · ${user.warnings || 0} warning(s)</small></div>
                <div class="table-actions">
                    <span class="report-status ${user.banned ? 'rejected' : 'approved'}">${user.banned ? 'banned' : 'active'}</span>
                    <button class="btn btn-secondary btn-small" type="button" onclick="handleAdminWarnUser('${sanitizeText(user.username)}')">Warn</button>
                    <button class="btn btn-${user.banned ? 'secondary' : 'danger'} btn-small" type="button" onclick="toggleUserBan('${sanitizeText(user.username)}', ${user.banned ? 'true' : 'false'})">${user.banned ? 'Unban' : 'Ban'}</button>
                </div>
            </div>`).join('') : '<div class="trade-empty">No saved accounts yet.</div>';
    }
}

async function handleUnbanIp(ip) {
    await removeBannedIp(ip);
    await reloadDashboard();
    showToast('Success', `${ip} has been unbanned.`, 'success');
}

async function handleAdminWarn() {
    const username = document.getElementById('adminUserSelect')?.value;
    if (!username) { showToast('Error', 'Select a player to warn.', 'error'); return; }
    const user = appData.users.find(u => u.username === username);
    if (user) {
        await updateUserWarnings(username, (user.warnings || 0) + 1);
        await reloadDashboard();
        showToast('Success', `${username} has been warned.`, 'success');
    }
}

function renderRoleManager() {
    const currentUser = getCurrentUser();
    const userSelect = document.getElementById('roleUserSelect');
    const roleList = document.getElementById('roleManagerList');
    if (!userSelect || !roleList) return;
    const users = appData.users;
    userSelect.innerHTML = users.filter(u => u.username !== currentUser).map(u => `<option value="${u.username}">${u.username}</option>`).join('') || '<option value="">No players available</option>';
    roleList.innerHTML = users.map(u => `<div class="role-row"><span>${u.username}</span><span class="role-badge">${u.role}</span></div>`).join('');
}

async function handleAssignRole() {
    const username = document.getElementById('roleUserSelect')?.value;
    const role = document.getElementById('roleSelect')?.value;
    const userRole = getUserRole();
    if (!username || !role) { showToast('Error', 'Select a player and role first.', 'error'); return; }
    if (role === 'owner' && userRole !== 'owner') { showToast('Error', 'Only owner can assign owner role.', 'error'); return; }
    const ok = await updateUserRole(username, role);
    if (ok) {
        await reloadDashboard();
        showToast('Success', `Updated ${username} to ${role}.`, 'success');
    } else {
        showToast('Error', 'Failed to update role.', 'error');
    }
}

// --- account ---

function renderAccount() {
    const accountContent = document.getElementById('accountContent');
    if (!accountContent) return;

    const currentUser = getCurrentUser();
    const userRole = getUserRole();
    const userRating = appData.ratings[currentUser] || { average: '0.0', count: 0 };
    const offers = appData.tradeOffers.filter(o => o.seller === currentUser);
    const requests = appData.tradeRequests.filter(r => r.requester === currentUser);
    const profile = appData.users.find(u => u.username === currentUser);
    const userId = profile?.id?.slice(0, 8) || '--------';
    const registered = profile?.createdAt || new Date().toISOString();

    const avatarHtml = isAllowedImageSource(profile?.avatarUrl)
        ? `<img src="${sanitizeText(profile.avatarUrl)}" alt="${sanitizeText(currentUser)} avatar" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : `<div class="avatar-placeholder">${sanitizeText(currentUser.charAt(0).toUpperCase())}</div>`;

    accountContent.innerHTML = `
        <div class="account-grid">
            <div class="account-card profile-header">
                <div class="profile-avatar">${avatarHtml}</div>
                <div class="profile-info">
                    <h2>${sanitizeText(currentUser)}</h2>
                    <span class="role-badge">${userRole}</span>
                    <p>${sanitizeText(profile?.bio || 'No player bio yet.')}</p>
                </div>
            </div>
            <div class="account-card">
                <h3>Profile Info</h3>
                <div class="profile-stats-grid">
                    <div class="stat-item"><span class="stat-label">UserID</span><span class="stat-value">#${userId}</span></div>
                    <div class="stat-item"><span class="stat-label">Registered</span><span class="stat-value">${new Date(registered).toLocaleDateString('pl-PL')}</span></div>
                    <div class="stat-item"><span class="stat-label">Rating</span><span class="stat-value">${userRating.average} ★</span></div>
                </div>
            </div>
            <div class="account-card profile-editor">
                <h3>Customize profile</h3>
                <div class="form-grid">
                    <input id="profileAvatarUrl" type="url" placeholder="HTTPS avatar image URL" value="${sanitizeText(profile?.avatarUrl && /^https:\/\//i.test(profile.avatarUrl) ? profile.avatarUrl : '')}">
                    <input id="profileAvatarUpload" type="file" accept="image/png,image/jpeg,image/webp">
                    <div id="profileAvatarPreview" style="margin:8px 0;">
                        ${isAllowedImageSource(profile?.avatarUrl) ? `<img src="${sanitizeText(profile.avatarUrl)}" style="width:64px;height:64px;object-fit:cover;border-radius:50%;" alt="Current avatar">` : ''}
                    </div>
                    <textarea id="profileBio" rows="3" maxlength="300" placeholder="Tell other traders a little about yourself...">${sanitizeText(profile?.bio || '')}</textarea>
                    <div class="form-actions"><button id="saveProfileBtn" class="btn btn-primary" type="button">Save profile</button></div>
                </div>
            </div>
            <div class="account-card">
                <h3>Your Trade Offers (${offers.length})</h3>
                <div class="account-list">${offers.length ? offers.map(o => `<div class="account-item"><strong>${sanitizeText(o.itemName)}</strong><span>${sanitizeText(o.price || 'Open')}</span></div>`).join('') : '<div class="trade-empty">No active offers</div>'}</div>
            </div>
            <div class="account-card">
                <h3>Your Trade Requests (${requests.length})</h3>
                <div class="account-list">${requests.length ? requests.map(r => `<div class="account-item"><strong>${sanitizeText(r.itemName)}</strong><span>Qty: ${r.quantity}</span></div>`).join('') : '<div class="trade-empty">No active requests</div>'}</div>
            </div>
            <div class="account-card">
                <h3>Achievements</h3>
                <div class="account-list">${Object.values(ACHIEVEMENTS).map(a => `<div class="account-item ${hasAchievement(currentUser, a) ? 'achievement-unlocked' : 'achievement-locked'}"><strong>${a}</strong>${hasAchievement(currentUser, a) ? ' ✓' : ' 🔒'}</div>`).join('')}</div>
            </div>
        </div>`;
}

// Przechowuje tymczasowo nowe base64 przed zapisem
let pendingAvatarDataUrl = null;

async function saveProfile() {
    const urlInput = document.getElementById('profileAvatarUrl')?.value.trim() || '';
    const bio = document.getElementById('profileBio')?.value.trim() || '';

    // Priorytet: plik wgrany przez użytkownika > URL wpisany ręcznie
    let avatarUrl = pendingAvatarDataUrl || urlInput;

    // Jeśli URL jest wpisany ręcznie, musi zaczynać się od https://
    if (!pendingAvatarDataUrl && urlInput && !/^https:\/\//i.test(urlInput)) {
        showToast('Invalid URL', 'Avatar URL must start with https://', 'error');
        return;
    }

    try {
        await updateMyProfile({ avatarUrl, bio });
        pendingAvatarDataUrl = null;
        await reloadDashboard();
        showToast('Profile updated', 'Your avatar and bio are now visible to other players.', 'success');
    } catch (error) {
        showToast('Profile not saved', error.message || 'Please check the avatar URL.', 'error');
    }
}

function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        showToast('Avatar not accepted', 'Choose a PNG, JPG, or WebP image.', 'error');
        event.target.value = '';
        return;
    }

    if (file.size > 8 * 1024 * 1024) {
        showToast('File too large', 'Maximum avatar size is 8 MB.', 'error');
        event.target.value = '';
        return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
        const size = 256;
        const scale = Math.min(size / image.width, size / image.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

        pendingAvatarDataUrl = canvas.toDataURL('image/webp', 0.82);
        URL.revokeObjectURL(objectUrl);

        // Pokaż podgląd
        const preview = document.getElementById('profileAvatarPreview');
        if (preview) {
            preview.innerHTML = `<img src="${pendingAvatarDataUrl}" style="width:64px;height:64px;object-fit:cover;border-radius:50%;" alt="Avatar preview">`;
        }

        showToast('Avatar ready', 'Click Save profile to publish your new avatar.', 'info');
    };

    image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        showToast('Image error', 'Could not read the selected image.', 'error');
    };

    image.src = objectUrl;
}

async function handleAdminWarnUser(username) {
    const user = appData.users.find(entry => entry.username === username);
    if (!user) return;
    await updateUserWarnings(username, (user.warnings || 0) + 1);
    await reloadDashboard();
    showToast('Warning added', `${username} now has ${(user.warnings || 0) + 1} warning(s).`, 'success');
}

async function toggleUserBan(username, currentlyBanned) {
    if (!confirm(`${currentlyBanned ? 'Unban' : 'Ban'} ${username}?`)) return;
    const ok = currentlyBanned ? await unbanUser(username) : await banUser(username);
    if (!ok) { showToast('Action failed', 'Could not update this account.', 'error'); return; }
    await reloadDashboard();
    showToast(currentlyBanned ? 'User unbanned' : 'User banned', `${username}'s account was updated.`, 'success');
}

// --- items table ---

function getIconHtml(item) {
    if (!item.icon) return '<span class="item-icon">✦</span>';
    if (isAllowedImageSource(item.icon)) {
        return `<img class="item-image" src="${item.icon}" alt="${sanitizeText(item.name)}">`;
    }
    return `<span class="item-icon">${sanitizeText(item.icon)}</span>`;
}

function renderTable(items, userRole) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No items available yet.</td></tr>';
        return;
    }
    items.forEach(item => {
        const row = document.createElement('tr');
        const rarityClass = `rarity-${(item.rarity || 'common').toLowerCase()}`;
        let actionsCell = '';
        if (['value manager', 'admin', 'owner'].includes(userRole)) {
            actionsCell = `<td><div class="table-actions"><button onclick="startEditItem('${item.id}')" class="btn-table btn-edit">Edit</button><button onclick="deleteItem('${item.id}')" class="btn-table btn-delete">Delete</button></div></td>`;
        }
        row.dataset.searchText = `${item.name} ${item.icon || ''} ${item.type || ''} ${item.rarity || ''} ${item.tier || ''}`.toLowerCase();
        row.dataset.tier = item.tier || '';
        row.dataset.rarity = item.rarity || '';
        row.dataset.type = item.type || '';
        row.dataset.cp = String(item.corruptedPages ?? '');
        row.innerHTML = `
            <td>${getIconHtml(item)}</td>
            <td>${sanitizeText(item.name)}</td>
            <td>${sanitizeText(String(item.corruptedPages ?? '—'))}</td>
            <td>${sanitizeText(item.tier || '—')}</td>
            <td class="${rarityClass}">${sanitizeText(item.rarity)}</td>
            <td>${sanitizeText(item.type)}</td>
            ${actionsCell}`;
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
    editingItemId = null;
    const saveBtn = document.getElementById('saveItemBtn');
    if (saveBtn) { saveBtn.textContent = 'Add item'; saveBtn.disabled = false; }
}

function resizeImageFile(file, options = {}) {
    const { maxWidth = 512, maxHeight = 512, quality = 0.82 } = options;
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            try {
                const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
                const width = Math.max(1, Math.round(image.width * scale));
                const height = Math.max(1, Math.round(image.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Canvas not supported.');
                ctx.drawImage(image, 0, 0, width, height);
                URL.revokeObjectURL(objectUrl);
                resolve(canvas.toDataURL('image/webp', quality));
            } catch (err) {
                URL.revokeObjectURL(objectUrl);
                reject(err);
            }
        };
        image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not read image.')); };
        image.src = objectUrl;
    });
}

async function handleItemImageUpload(event) {
    const file = event.target.files?.[0];
    const preview = document.getElementById('itemImagePreview');
    uploadedItemImage = null;
    if (preview) preview.innerHTML = '';
    if (!file) return;

    const accepted = ['image/png', 'image/jpeg', 'image/webp'];
    if (!accepted.includes(file.type)) {
        event.target.value = '';
        showToast('Invalid file', 'Choose a PNG, JPG, or WebP image.', 'error');
        return;
    }
    if (file.size > 8 * 1024 * 1024) {
        event.target.value = '';
        showToast('File too large', 'Maximum image size is 8 MB.', 'error');
        return;
    }

    try {
        uploadedItemImage = await resizeImageFile(file, { maxWidth: 512, maxHeight: 512, quality: 0.8 });
        if (preview) preview.innerHTML = `<img src="${uploadedItemImage}" alt="Item preview" style="max-width:120px;max-height:120px;border-radius:8px;">`;
    } catch (err) {
        event.target.value = '';
        uploadedItemImage = null;
        showToast('Image error', err.message || 'Could not process image.', 'error');
    }
}

async function saveItem() {
    const saveBtn = document.getElementById('saveItemBtn');
    const wasEditing = Boolean(editingItemId);

    const icon = document.getElementById('itemIcon')?.value.trim() || '';
    const name = document.getElementById('itemName')?.value.trim() || '';
    const corruptedPages = document.getElementById('itemCorruptedPages')?.value.trim() || '';
    const tier = document.getElementById('itemTier')?.value.trim() || '';
    const rarity = document.getElementById('itemRarity')?.value || 'Common';
    const type = document.getElementById('itemType')?.value.trim() || '';

    if (!name || !type) {
        showToast('Missing fields', 'Fill in the Item name and Type fields.', 'error');
        return;
    }

    const payload = {
        icon: uploadedItemImage || icon || '✦',
        name,
        corruptedPages: corruptedPages === '' ? null : Number(corruptedPages),
        tier,
        rarity,
        type
    };

    try {
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = wasEditing ? 'Saving...' : 'Adding...'; }

        let result;
        if (wasEditing) {
            result = await updateItem(editingItemId, payload);
        } else {
            result = await addItem(payload);
        }

        if (!result) throw new Error('No response from server.');

        resetForm();
        await reloadDashboard();
        showToast('Success', wasEditing ? 'Item updated.' : 'Item added.', 'success');
    } catch (error) {
        console.error('saveItem error:', error);
        showToast('Save failed', error.message || 'Check your connection.', 'error');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = wasEditing ? 'Save changes' : 'Add item'; }
    }
}

function startEditItem(id) {
    const item = appData.items.find(i => i.id === id);
    if (!item) return;
    editingItemId = id;
    document.getElementById('itemIcon').value = item.icon && !isAllowedImageSource(item.icon) ? item.icon : '';
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemCorruptedPages').value = item.corruptedPages ?? '';
    document.getElementById('itemTier').value = item.tier || '';
    document.getElementById('itemType').value = item.type || '';
    document.getElementById('itemRarity').value = item.rarity || 'Common';
    uploadedItemImage = isAllowedImageSource(item.icon) ? item.icon : null;
    const preview = document.getElementById('itemImagePreview');
    if (preview) preview.innerHTML = uploadedItemImage ? `<img src="${uploadedItemImage}" alt="Preview" style="max-width:120px;max-height:120px;border-radius:8px;">` : '';
    const saveBtn = document.getElementById('saveItemBtn');
    if (saveBtn) saveBtn.textContent = 'Save changes';

    // Przewiń do formularza
    document.getElementById('admin-control-section')?.scrollIntoView({ behavior: 'smooth' });
}

async function deleteItem(id) {
    if (!confirm('>>> REMOVE ITEM? <<<')) return;
    await deleteItemById(id);
    if (editingItemId === id) resetForm();
    await reloadDashboard();
    showToast('Success', 'Item removed.', 'success');
}

function toggleSort(key) {
    if (currentSort.key === key) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.key = key;
        currentSort.direction = 'asc';
    }
    loadTableData(getUserRole());
}

function filterTable() {
    const query = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
    const tier = document.getElementById('filterTier')?.value || '';
    const rarity = document.getElementById('filterRarity')?.value || '';
    const type = document.getElementById('filterType')?.value || '';
    const minCp = Number(document.getElementById('filterMinCp')?.value || 0);
    const maxInput = document.getElementById('filterMaxCp')?.value;
    const maxCp = maxInput === '' || maxInput === undefined ? Infinity : Number(maxInput);
    document.querySelectorAll('#pricesTable tbody tr').forEach(row => {
        const cp = Number(row.dataset.cp || 0);
        const matches = (row.dataset.searchText || '').includes(query)
            && (!tier || row.dataset.tier === tier)
            && (!rarity || row.dataset.rarity === rarity)
            && (!type || row.dataset.type === type)
            && cp >= minCp && cp <= maxCp;
        row.style.display = matches ? '' : 'none';
    });
}

// --- trade ---

function renderTradePlace() {
    const items = appData.items;
    const tradeItemSelect = document.getElementById('tradeItemSelect');
    const requestItemSelect = document.getElementById('requestItemSelect');
    const offerList = document.getElementById('tradeOffersList');
    const requestList = document.getElementById('tradeRequestsList');
    if (!tradeItemSelect || !offerList) return;

    const currentUser = getCurrentUser();
    const options = items.length ? items.map(i => `<option value="${i.name}">${i.name}</option>`).join('') : '<option value="">No items yet</option>';
    tradeItemSelect.innerHTML = options;
    if (requestItemSelect) requestItemSelect.innerHTML = options;

    const offers = [...appData.tradeOffers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    offerList.innerHTML = offers.length ? offers.map(offer => {
        const item = items.find(i => i.name === offer.itemName);
        const isOwner = currentUser === offer.seller;
        const seller = sanitizeText(offer.seller);
        const actions = isOwner
            ? `<span class="trade-tag">Your offer</span><button class="btn btn-secondary btn-small" type="button" onclick="deleteTradeOfferHandler('${offer.id}')">Delete</button>`
            : `<button class="btn btn-primary btn-small" type="button" onclick="acceptTradeOffer('${offer.id}')">Accept</button><button class="btn btn-secondary btn-small" type="button" onclick="rejectTradeOffer('${offer.id}')">Reject</button><button class="btn btn-secondary btn-small" type="button" onclick="startDm('${seller.replace(/'/g, "\\'")}')">DM</button>`;
        return `
            <div class="trade-offer">
                <div class="trade-offer-header">
                    <div class="trade-item-preview">
                        ${item?.icon ? `<span class="item-icon">${item.icon}</span>` : ''}
                        <div class="item-info"><strong>${sanitizeText(offer.itemName)}</strong><span class="item-rarity">${item?.rarity || ''}</span></div>
                    </div>
                    <span>${sanitizeText(offer.price || 'Open to trade')}</span>
                </div>
                <p>${sanitizeText(offer.message || 'No extra note.')}</p>
                <div class="trade-offer-meta"><span>Seller: ${seller}</span><span>${new Date(offer.createdAt).toLocaleString('pl-PL')}</span></div>
                <div class="trade-actions">${actions}</div>
            </div>`;
    }).join('') : '<div class="trade-empty">No active offers yet.</div>';

    if (requestList) {
        const requests = [...appData.tradeRequests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        requestList.innerHTML = requests.length ? requests.map(req => {
            const isOwner = currentUser === req.requester;
            const requester = sanitizeText(req.requester);
            const actions = isOwner
                ? `<span class="trade-tag">Your request</span><button class="btn btn-secondary btn-small" type="button" onclick="deleteTradeRequestHandler('${req.id}')">Delete</button>`
                : `<button class="btn btn-primary btn-small" type="button" onclick="startDm('${requester.replace(/'/g, "\\'")}')">DM</button>`;
            return `
                <div class="trade-offer">
                    <div class="trade-offer-header"><strong>${sanitizeText(req.itemName)}</strong><span>Qty: ${req.quantity}</span></div>
                    <p>${sanitizeText(req.message || 'No extra note.')}</p>
                    <div class="trade-offer-meta"><span>CP: ${req.cp || 'Any'}</span><span>Requester: ${requester}</span><span>${new Date(req.createdAt).toLocaleString('pl-PL')}</span></div>
                    <div class="trade-actions">${actions}</div>
                </div>`;
        }).join('') : '<div class="trade-empty">No active requests yet.</div>';
    }
}

async function createTradeOffer() {
    const currentUser = getCurrentUser();
    const itemName = document.getElementById('tradeItemSelect')?.value;
    const price = document.getElementById('tradePrice')?.value.trim();
    const message = document.getElementById('tradeMessage')?.value.trim();
    if (!itemName) { showToast('Error', 'Select an item before listing it.', 'error'); return; }
    try {
        await addTradeOffer({ seller: currentUser, itemName, price, message });
    } catch (error) {
        showToast('Offer not listed', error.message || 'Try again shortly.', 'error');
        return;
    }
    document.getElementById('tradePrice').value = '';
    document.getElementById('tradeMessage').value = '';
    await reloadDashboard();
    showToast('Success', 'Trade offer listed!', 'success');
}

async function createTradeRequest() {
    const currentUser = getCurrentUser();
    const itemName = document.getElementById('requestItemSelect')?.value;
    const cp = document.getElementById('requestCp')?.value.trim();
    const quantity = document.getElementById('requestQuantity')?.value.trim();
    const message = document.getElementById('requestMessage')?.value.trim();
    if (!itemName) { showToast('Error', 'Select an item before listing request.', 'error'); return; }
    try {
        await addTradeRequest({ requester: currentUser, itemName, cp: cp ? parseInt(cp, 10) : null, quantity: quantity ? parseInt(quantity, 10) : 1, message });
    } catch (error) {
        showToast('Request not listed', error.message || 'Try again shortly.', 'error');
        return;
    }
    document.getElementById('requestCp').value = '';
    document.getElementById('requestQuantity').value = '1';
    document.getElementById('requestMessage').value = '';
    await reloadDashboard();
    showToast('Success', 'Trade request listed!', 'success');
}

async function acceptTradeOffer(id) {
    const currentUser = getCurrentUser();
    const offer = appData.tradeOffers.find(o => o.id === id);
    if (!offer) { showToast('Error', 'Offer not found.', 'error'); return; }
    await deleteTradeOffer(id);
    await addTransaction({ offerId: id, buyer: currentUser, seller: offer.seller, item: offer.itemName, price: offer.price });
    await addAchievement(currentUser, ACHIEVEMENTS.FIRST_TRADE);
    await reloadDashboard();
    showToast('Success', 'Trade accepted!', 'success');
    setTimeout(async () => {
        const rating = prompt(`Rate ${offer.seller} (1-5 stars):`, '5');
        if (rating && !isNaN(rating) && rating >= 1 && rating <= 5) {
            await addPlayerRating(offer.seller, parseInt(rating, 10), currentUser);
            await reloadDashboard();
            showToast('Thanks', `You rated ${offer.seller} ${rating} stars!`, 'success');
        }
    }, 500);
}

async function rejectTradeOffer(id) {
    await deleteTradeOffer(id);
    await reloadDashboard();
    showToast('Info', 'Trade offer rejected.', 'info');
}

async function deleteTradeOfferHandler(id) {
    await deleteTradeOffer(id);
    await reloadDashboard();
    showToast('Success', 'Offer deleted.', 'success');
}

async function deleteTradeRequestHandler(id) {
    await deleteTradeRequest(id);
    await reloadDashboard();
    showToast('Success', 'Request deleted.', 'success');
}

// --- DM modal ---

function startDm(recipient) {
    const modal = document.getElementById('dmModal');
    document.getElementById('dmModalRecipient').value = recipient;
    document.getElementById('dmModalRecipientDisplay').textContent = `To: ${recipient}`;
    document.getElementById('dmModalMessage').value = '';
    if (modal) { modal.style.display = 'flex'; document.getElementById('dmModalMessage').focus(); }
}

function closeDmModal() {
    const modal = document.getElementById('dmModal');
    if (modal) modal.style.display = 'none';
}

async function sendDmFromModal() {
    const recipient = document.getElementById('dmModalRecipient')?.value;
    const text = document.getElementById('dmModalMessage')?.value.trim();
    if (!recipient || !text) { showToast('Error', 'Write a message first.', 'error'); return; }
    const currentUser = getCurrentUser();
    await addMessage({ from: currentUser, to: recipient, text: sanitizeText(text) });
    closeDmModal();
    await reloadDashboard();
    showToast('Success', 'Message sent!', 'success');
}

// --- misc UI ---

function updateLastUpdate() {
    const el = document.getElementById('lastUpdate');
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleDateString('pl-PL') + ' ' + now.toLocaleTimeString('pl-PL');
    }
}

function setTheme(theme) {
    const resolved = theme === 'light' ? 'light' : 'dark';
    document.body.classList.toggle('theme-light', resolved === 'light');
    localStorage.setItem('theme', resolved);
    const button = document.getElementById('themeToggle');
    if (button) button.textContent = resolved === 'light' ? '🌙 Dark' : '☀️ Light';
}

function switchSection(sectionName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.section === sectionName));
    document.querySelectorAll('.section-content').forEach(s => { s.style.display = 'none'; });
    const target = document.getElementById(`${sectionName}-section`);
    if (target) target.style.display = 'block';
}

function filterMessages() {
    const query = document.getElementById('messagesSearchInput')?.value.trim().toLowerCase();
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
}

function filterNotifications() {
    const query = document.getElementById('notificationsSearchInput')?.value.trim().toLowerCase();
    document.querySelectorAll('.notification-card').forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
}

function filterOffers() {
    const query = document.getElementById('offersSearchInput')?.value.trim().toLowerCase();
    document.querySelectorAll('#tradeOffersList .trade-offer').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
}

function filterRequests() {
    const query = document.getElementById('requestsSearchInput')?.value.trim().toLowerCase();
    document.querySelectorAll('#tradeRequestsList .trade-offer').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
}

async function handleBanUserIp() {
    const username = document.getElementById('adminUserSelect')?.value;
    if (!username) { showToast('Error', 'Select a player first.', 'error'); return; }
    const user = appData.users.find(u => u.username === username);
    if (!user?.ip) { showToast('Error', 'No IP on record for this user.', 'error'); return; }
    await addBannedIp(user.ip);
    await banUser(username);
    await reloadDashboard();
    showToast('Success', `${username} (${user.ip}) has been banned.`, 'success');
}

function initDashboardControls() {
    document.querySelectorAll('.sort-btn').forEach(btn => btn.addEventListener('click', () => toggleSort(btn.dataset.sort)));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchSection(btn.dataset.section)));
    document.getElementById('themeToggle')?.addEventListener('click', () => {
        setTheme(document.body.classList.contains('theme-light') ? 'dark' : 'light');
    });
    document.getElementById('saveItemBtn')?.addEventListener('click', saveItem);
    document.getElementById('cancelEditBtn')?.addEventListener('click', resetForm);
    document.getElementById('itemImageUpload')?.addEventListener('change', handleItemImageUpload);
    document.getElementById('createTradeOfferBtn')?.addEventListener('click', createTradeOffer);
    document.getElementById('createTradeRequestBtn')?.addEventListener('click', createTradeRequest);
    document.getElementById('assignRoleBtn')?.addEventListener('click', handleAssignRole);
    document.getElementById('dmModalSendBtn')?.addEventListener('click', sendDmFromModal);
    document.getElementById('submitReportBtn')?.addEventListener('click', submitReport);
    document.getElementById('submitSuggestionBtn')?.addEventListener('click', submitValueSuggestion);
    document.getElementById('accountContent')?.addEventListener('click', event => {
        if (event.target.id === 'saveProfileBtn') saveProfile();
    });
    document.getElementById('accountContent')?.addEventListener('change', event => {
        if (event.target.id === 'profileAvatarUpload') handleAvatarUpload(event);
    });
    document.getElementById('adminWarnBtn')?.addEventListener('click', handleAdminWarn);
    document.getElementById('adminBanIpBtn')?.addEventListener('click', handleBanUserIp);
    document.getElementById('adminUserSelect')?.addEventListener('change', renderAdminPanel);
}

document.addEventListener('DOMContentLoaded', () => {
    initDashboardControls();
    setTheme(localStorage.getItem('theme') || 'dark');
});

// Window exports
window.loadTableData = loadTableData;
window.clearNotification = clearNotificationHandler;
window.handleReportOutcome = handleReportOutcome;
window.submitReport = submitReport;
window.reviewSuggestion = reviewSuggestion;
window.renderMessages = renderMessages;
window.openConversation = openConversation;
window.quickReply = quickReply;
window.handleUnbanIp = handleUnbanIp;
window.handleAdminWarnUser = handleAdminWarnUser;
window.toggleUserBan = toggleUserBan;
window.handleAssignRole = handleAssignRole;
window.startEditItem = startEditItem;
window.deleteItem = deleteItem;
window.createTradeOffer = createTradeOffer;
window.createTradeRequest = createTradeRequest;
window.acceptTradeOffer = acceptTradeOffer;
window.rejectTradeOffer = rejectTradeOffer;
window.deleteTradeOfferHandler = deleteTradeOfferHandler;
window.deleteTradeRequestHandler = deleteTradeRequestHandler;
window.startDm = startDm;
window.closeDmModal = closeDmModal;
window.sendDmFromModal = sendDmFromModal;
window.filterMessages = filterMessages;
window.filterNotifications = filterNotifications;
window.filterOffers = filterOffers;
window.filterRequests = filterRequests;
