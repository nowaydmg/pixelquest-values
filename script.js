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
        alert('> ERROR: Select a player and enter a reason.');
        return;
    }

    if (!isSafeString(target) || !isSafeString(reason)) {
        alert('> ERROR: Unsafe characters detected.');
        return;
    }

    if (!canPerformAction('submitReport', 4, 60_000)) {
        alert('> WAIT: Too many reports recently.');
        return;
    }

    recordAction('submitReport');
    addReport(target, reason, currentUser);
    addNotification('all', `${currentUser} submitted a report against ${target}.`);
    document.getElementById('reportReason').value = '';
    renderReportTargets();
    alert('Report submitted successfully.');
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
}

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
        alert('> ERROR: Fill name and type fields!');
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
    const dmRecipient = document.getElementById('dmRecipient');
    const offerList = document.getElementById('tradeOffersList');
    const dmList = document.getElementById('dmMessagesList');

    if (!tradeItemSelect || !dmRecipient || !offerList || !dmList) {
        return;
    }

    const currentUser = getCurrentUser();
    tradeItemSelect.innerHTML = items.length
        ? items.map((item) => `<option value="${item.name}">${item.name}</option>`).join('')
        : '<option value="">No items yet</option>';

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

    if (!itemName) {
        alert('> ERROR: Select an item before listing it.');
        return;
    }

    if (!isSafeString(itemName) || !isSafeString(message) || !isSafeString(price)) {
        alert('> ERROR: Unsafe characters detected.');
        return;
    }

    if (!canPerformAction('tradeOffer', 5, 60_000)) {
        alert('> WAIT: Too many trade actions recently. Please wait a moment.');
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
}

function acceptTradeOffer(id) {
    const currentUser = getCurrentUser();
    if (!canPerformAction('tradeResponse', 4, 60_000)) {
        alert('> WAIT: Too many offer responses.');
        return;
    }
    recordAction('tradeResponse');

    const offers = getTradeOffers();
    const offer = offers.find((offer) => offer.id === id);
    if (!offer) {
        alert('> ERROR: Offer not found.');
        return;
    }

    const updatedOffers = offers.filter((offerItem) => offerItem.id !== id);
    saveTradeOffers(updatedOffers);
    addNotification(offer.seller, `${currentUser} accepted your offer for ${offer.itemName}.`);
    addNotification(currentUser, `You accepted ${offer.seller}'s offer for ${offer.itemName}.`);
    renderTradePlace();
}

function rejectTradeOffer(id) {
    const currentUser = getCurrentUser();
    if (!canPerformAction('tradeResponse', 6, 60_000)) {
        alert('> WAIT: Too many offer responses.');
        return;
    }
    recordAction('tradeResponse');

    const offers = getTradeOffers();
    const offer = offers.find((offer) => offer.id === id);
    if (!offer) {
        alert('> ERROR: Offer not found.');
        return;
    }

    const updatedOffers = offers.filter((offerItem) => offerItem.id !== id);
    saveTradeOffers(updatedOffers);
    addNotification(offer.seller, `${currentUser} rejected your offer for ${offer.itemName}.`);
    renderTradePlace();
}

function startDm(recipient) {
    const dmRecipient = document.getElementById('dmRecipient');
    if (dmRecipient) {
        dmRecipient.value = recipient;
        renderTradePlace();
        const dmMessage = document.getElementById('dmMessage');
        if (dmMessage) {
            dmMessage.focus();
        }
    }
}

function sendDirectMessage() {
    const currentUser = getCurrentUser();
    const recipient = document.getElementById('dmRecipient')?.value;
    const text = document.getElementById('dmMessage')?.value.trim();

    if (!recipient || !text) {
        alert('> ERROR: Choose a player and write a message.');
        return;
    }

    if (!isSafeString(text) || !isSafeString(recipient)) {
        alert('> ERROR: Unsafe content detected.');
        return;
    }

    if (!canPerformAction('directMessage', 8, 60_000)) {
        alert('> WAIT: Too many messages recently.');
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

function initDashboardControls() {
    document.querySelectorAll('.sort-btn').forEach((button) => {
        button.addEventListener('click', () => toggleSort(button.dataset.sort));
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
    document.getElementById('sendDmBtn')?.addEventListener('click', sendDirectMessage);
    document.getElementById('dmRecipient')?.addEventListener('change', renderTradePlace);
    document.getElementById('submitReportBtn')?.addEventListener('click', submitReport);
}

document.addEventListener('DOMContentLoaded', () => {
    initDashboardControls();
    setTheme(localStorage.getItem('theme') || 'dark');
});
