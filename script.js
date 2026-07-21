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

function getRegisteredUsers() {
    return appData.users.map((u) => u.username);
}

function getNotificationsForUser(user) {
    return appData.notifications.filter((n) => n.to === user || n.to === 'all');
}

function getPendingReports() {
    return appData.reports.filter((r) => r.status === 'pending');
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

// --- main load ---

async function loadTableData(userRole) {
    await refreshAppData();
    const sortedItems = sortItems(appData.items, currentSort.key, currentSort.direction);
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

async function reloadDashboard() {
    await loadTableData(getUserRole());
}

// --- notifications ---

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
        .map((note) => `
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

// --- reports ---

function renderReportTargets() {
    const currentUser = getCurrentUser();
    const reportTargetSelect = document.getElementById('reportTargetSelect');
    if (!reportTargetSelect) return;

    const users = getRegisteredUsers().filter((u) => u !== currentUser);
    reportTargetSelect.innerHTML = users.length
        ? users.map((u) => `<option value="${u}">${u}</option>`).join('')
        : '<option value="">No players available</option>';
}

async function submitReport() {
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

    await addReport({ target, reason, reporter: currentUser });
    await addNotification('all', `${currentUser} submitted a report against ${target}.`);
    document.getElementById('reportReason').value = '';
    await reloadDashboard();
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
                    <button class="btn btn-primary btn-small" type="button" onclick="handleReportOutcome('${report.id}', 'approved')">Approve</button>
                    <button class="btn btn-secondary btn-small" type="button" onclick="handleReportOutcome('${report.id}', 'rejected')">Reject</button>
                </div>
            </div>`).join('')
        : '<div class="trade-empty">No pending reports.</div>';
}

async function handleReportOutcome(id, status) {
    await updateReportStatus(id, status);
    const report = appData.reports.find((r) => r.id === id);
    if (report) {
        await addNotification(report.reporter, `Your report against ${report.target} was ${status}.`);
        await addNotification('all', `Report against ${report.target} was ${status}.`);
    }
    await reloadDashboard();
}

function renderReportSection() {
    const reportList = document.getElementById('reportList');
    if (!reportList) return;

    const currentUser = getCurrentUser();
    const userRole = getUserRole();
    let filtered = appData.reports;
    if (!['moderator', 'admin', 'owner'].includes(userRole)) {
        filtered = appData.reports.filter((r) => r.reporter === currentUser);
    }

    reportList.innerHTML = filtered.length
        ? filtered.map((report) => `
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
    appData.messages.forEach((msg) => {
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
        ? keys.map((username) => {
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
        .filter((msg) => (msg.from === currentUser && msg.to === username) || (msg.from === username && msg.to === currentUser))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

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
    await addNotification(username, `New DM from ${currentUser}.`);
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

    const users = appData.users.filter((u) => u.username !== currentUser);
    if (userSelect) {
        userSelect.innerHTML = users.length
            ? users.map((u) => `<option value="${u.username}">${u.username} (${u.role})</option>`).join('')
            : '<option value="">No players available</option>';
    }

    if (userSummary) {
        const selected = userSelect?.value || users[0]?.username;
        const user = users.find((u) => u.username === selected);
        userSummary.innerHTML = user
            ? `<strong>IP:</strong> ${user.ip}<br><strong>Warnings:</strong> ${user.warnings}<br><strong>Banned:</strong> ${user.banned ? 'Yes' : 'No'}`
            : '<em>Select a player to view details.</em>';
    }

    if (bannedList) {
        bannedList.innerHTML = appData.bannedIps.length
            ? appData.bannedIps.map((ip) => `<div class="ban-row"><span>${ip}</span><button type="button" class="btn btn-secondary btn-small" onclick="handleUnbanIp('${ip}')">Unban</button></div>`).join('')
            : '<div class="empty-state">No banned IPs.</div>';
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

    const user = appData.users.find((u) => u.username === username);
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
    userSelect.innerHTML = users.filter((u) => u.username !== currentUser).map((u) => `<option value="${u.username}">${u.username}</option>`).join('') || '<option value="">No players available</option>';
    roleList.innerHTML = users.map((u) => `<div class="role-row"><span>${u.username}</span><span class="role-badge">${u.role}</span></div>`).join('');
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
    const offers = appData.tradeOffers.filter((o) => o.seller === currentUser);
    const requests = appData.tradeRequests.filter((r) => r.requester === currentUser);
    const profile = appData.users.find((u) => u.username === currentUser);
    const userId = profile?.id?.slice(0, 8) || '--------';
    const registered = profile?.createdAt || new Date().toISOString();

    accountContent.innerHTML = `
        <div class="account-grid">
            <div class="account-card profile-header">
                <div class="profile-avatar"><div class="avatar-placeholder">${sanitizeText(currentUser.charAt(0).toUpperCase())}</div></div>
                <div class="profile-info">
                    <h2>${sanitizeText(currentUser)}</h2>
                    <span class="role-badge">${userRole}</span>
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
            <div class="account-card">
                <h3>Your Trade Offers (${offers.length})</h3>
                <div class="account-list">${offers.length ? offers.map((o) => `<div class="account-item"><strong>${sanitizeText(o.itemName)}</strong><span>${sanitizeText(o.price || 'Open')}</span></div>`).join('') : '<div class="trade-empty">No active offers</div>'}</div>
            </div>
            <div class="account-card">
                <h3>Your Trade Requests (${requests.length})</h3>
                <div class="account-list">${requests.length ? requests.map((r) => `<div class="account-item"><strong>${sanitizeText(r.itemName)}</strong><span>Qty: ${r.quantity}</span></div>`).join('') : '<div class="trade-empty">No active requests</div>'}</div>
            </div>
            <div class="account-card">
                <h3>Achievements</h3>
                <div class="account-list">${Object.values(ACHIEVEMENTS).map((a) => `<div class="account-item ${hasAchievement(currentUser, a) ? 'achievement-unlocked' : 'achievement-locked'}"><strong>${a}</strong>${hasAchievement(currentUser, a) ? ' ✓' : ' 🔒'}</div>`).join('')}</div>
            </div>
        </div>`;
}

// --- items table ---

function getIconHtml(item) {
    if (!item.icon) return '<span class="item-icon">✦</span>';
    if (/^https?:\/\//i.test(item.icon) || /^data:image\//i.test(item.icon)) {
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

    items.forEach((item) => {
        const row = document.createElement('tr');
        const rarityClass = `rarity-${(item.rarity || 'common').toLowerCase()}`;
        let actionsCell = '';
        if (userRole === 'admin' || userRole === 'owner') {
            actionsCell = `<td><div class="table-actions"><button onclick="startEditItem('${item.id}')" class="btn-table btn-edit">Edit</button><button onclick="deleteItem('${item.id}')" class="btn-table btn-delete">Delete</button></div></td>`;
        }
        row.dataset.searchText = `${item.name} ${item.icon || ''} ${item.type || ''} ${item.rarity || ''} ${item.tier || ''}`.toLowerCase();
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
    document.getElementById('saveItemBtn').textContent = 'Add item';
}

async function saveItem() {
    const icon = document.getElementById('itemIcon').value.trim();
    const name = document.getElementById('itemName').value.trim();
    const corruptedPages = document.getElementById('itemCorruptedPages').value.trim();
    const tier = document.getElementById('itemTier').value.trim();
    const rarity = document.getElementById('itemRarity').value;
    const type = document.getElementById('itemType').value.trim();

    if (!name || !type) { showToast('Error', 'Fill name and type fields!', 'error'); return; }

    const payload = {
        icon: uploadedItemImage || icon,
        name,
        corruptedPages: corruptedPages ? parseInt(corruptedPages, 10) : undefined,
        tier,
        rarity,
        type
    };

    if (editingItemId) {
        await updateItem(editingItemId, payload);
    } else {
        await addItem(payload);
    }

    resetForm();
    await reloadDashboard();
    showToast('Success', 'Item saved!', 'success');
}

function startEditItem(id) {
    const item = appData.items.find((i) => i.id === id);
    if (!item) return;

    editingItemId = id;
    document.getElementById('itemIcon').value = item.icon && !String(item.icon).startsWith('data:') ? item.icon : '';
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemCorruptedPages').value = item.corruptedPages ?? '';
    document.getElementById('itemTier').value = item.tier || '';
    document.getElementById('itemType').value = item.type || '';
    document.getElementById('itemRarity').value = item.rarity || 'Common';
    uploadedItemImage = item.icon && String(item.icon).startsWith('data:') ? item.icon : null;
    document.getElementById('itemImagePreview').innerHTML = uploadedItemImage ? `<img src="${uploadedItemImage}" alt="Preview">` : '';
    document.getElementById('saveItemBtn').textContent = 'Save changes';
}

async function deleteItem(id) {
    if (!confirm('>>> REMOVE ITEM? <<<')) return;
    await deleteItemById(id);
    if (editingItemId === id) resetForm();
    await reloadDashboard();
    showToast('Success', 'Item removed successfully', 'success');
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
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    document.querySelectorAll('#pricesTable tbody tr').forEach((row) => {
        row.style.display = (row.dataset.searchText || '').includes(query) ? '' : 'none';
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
    const options = items.length ? items.map((i) => `<option value="${i.name}">${i.name}</option>`).join('') : '<option value="">No items yet</option>';
    tradeItemSelect.innerHTML = options;
    if (requestItemSelect) requestItemSelect.innerHTML = options;

    const offers = [...appData.tradeOffers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    offerList.innerHTML = offers.length ? offers.map((offer) => {
        const item = items.find((i) => i.name === offer.itemName);
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
        requestList.innerHTML = requests.length ? requests.map((req) => {
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

    await addTradeOffer({ seller: currentUser, itemName, price, message });
    await addNotification('all', `${currentUser} posted a new trade offer for ${itemName}.`);
    document.getElementById('tradePrice').value = '';
    document.getElementById('tradeMessage').value = '';
    await reloadDashboard();
    showToast('Success', 'Trade offer listed successfully!', 'success');
}

async function createTradeRequest() {
    const currentUser = getCurrentUser();
    const itemName = document.getElementById('requestItemSelect')?.value;
    const cp = document.getElementById('requestCp')?.value.trim();
    const quantity = document.getElementById('requestQuantity')?.value.trim();
    const message = document.getElementById('requestMessage')?.value.trim();

    if (!itemName) { showToast('Error', 'Select an item before listing request.', 'error'); return; }

    await addTradeRequest({
        requester: currentUser,
        itemName,
        cp: cp ? parseInt(cp, 10) : null,
        quantity: quantity ? parseInt(quantity, 10) : 1,
        message
    });
    await addNotification('all', `${currentUser} posted a new trade request for ${itemName}.`);
    document.getElementById('requestCp').value = '';
    document.getElementById('requestQuantity').value = '1';
    document.getElementById('requestMessage').value = '';
    await reloadDashboard();
    showToast('Success', 'Trade request listed successfully!', 'success');
}

async function acceptTradeOffer(id) {
    const currentUser = getCurrentUser();
    const offer = appData.tradeOffers.find((o) => o.id === id);
    if (!offer) { showToast('Error', 'Offer not found.', 'error'); return; }

    await deleteTradeOffer(id);
    await addTransaction({ offerId: id, buyer: currentUser, seller: offer.seller, item: offer.itemName, price: offer.price });
    await addNotification(offer.seller, `${currentUser} accepted your offer for ${offer.itemName}.`);
    await addNotification(currentUser, `You accepted ${offer.seller}'s offer for ${offer.itemName}.`);
    await addAchievement(currentUser, ACHIEVEMENTS.FIRST_TRADE);
    await reloadDashboard();
    showToast('Success', 'Trade offer accepted!', 'success');

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
    const currentUser = getCurrentUser();
    const offer = appData.tradeOffers.find((o) => o.id === id);
    if (!offer) return;

    await deleteTradeOffer(id);
    await addNotification(offer.seller, `${currentUser} rejected your offer for ${offer.itemName}.`);
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
    await addNotification(recipient, `New DM from ${currentUser}.`);
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

function handleItemImageUpload(event) {
    const file = event.target.files?.[0];
    const preview = document.getElementById('itemImagePreview');
    if (!file || !preview) { uploadedItemImage = null; if (preview) preview.innerHTML = ''; return; }
    const reader = new FileReader();
    reader.onload = () => { uploadedItemImage = reader.result; preview.innerHTML = `<img src="${uploadedItemImage}" alt="Preview">`; };
    reader.readAsDataURL(file);
}

function switchSection(sectionName) {
    document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.section === sectionName));
    document.querySelectorAll('.section-content').forEach((s) => { s.style.display = 'none'; });
    const target = document.getElementById(`${sectionName}-section`);
    if (target) target.style.display = 'block';
}

function filterMessages() {
    const query = document.getElementById('messagesSearchInput')?.value.trim().toLowerCase();
    document.querySelectorAll('.conversation-item').forEach((item) => {
        item.style.display = item.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
}

function filterNotifications() {
    const query = document.getElementById('notificationsSearchInput')?.value.trim().toLowerCase();
    document.querySelectorAll('.notification-card').forEach((card) => {
        card.style.display = card.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
}

function filterOffers() {
    const query = document.getElementById('offersSearchInput')?.value.trim().toLowerCase();
    document.querySelectorAll('#tradeOffersList .trade-offer').forEach((item) => {
        item.style.display = item.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
}

function filterRequests() {
    const query = document.getElementById('requestsSearchInput')?.value.trim().toLowerCase();
    document.querySelectorAll('#tradeRequestsList .trade-offer').forEach((item) => {
        item.style.display = item.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
}

async function handleBanUserIp() {
    const username = document.getElementById('adminUserSelect')?.value;
    if (!username) { showToast('Error', 'Select a player first.', 'error'); return; }

    const user = appData.users.find((u) => u.username === username);
    if (!user?.ip) { showToast('Error', 'No IP on record for this user.', 'error'); return; }

    await addBannedIp(user.ip);
    await banUser(username);
    await reloadDashboard();
    showToast('Success', `${username} (${user.ip}) has been banned.`, 'success');
}

function initDashboardControls() {
    document.querySelectorAll('.sort-btn').forEach((btn) => btn.addEventListener('click', () => toggleSort(btn.dataset.sort)));
    document.querySelectorAll('.nav-btn').forEach((btn) => btn.addEventListener('click', () => switchSection(btn.dataset.section)));
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
    document.getElementById('adminWarnBtn')?.addEventListener('click', handleAdminWarn);
    document.getElementById('adminBanIpBtn')?.addEventListener('click', handleBanUserIp);
}

document.addEventListener('DOMContentLoaded', () => {
    initDashboardControls();
    setTheme(localStorage.getItem('theme') || 'dark');
});

// Window exports for onclick handlers
window.loadTableData = loadTableData;
window.clearNotification = clearNotificationHandler;
window.handleReportOutcome = handleReportOutcome;
window.submitReport = submitReport;
window.renderMessages = renderMessages;
window.openConversation = openConversation;
window.quickReply = quickReply;
window.handleUnbanIp = handleUnbanIp;
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
