const INITIAL_USERS = {};

let USERS = { ...INITIAL_USERS };

function ensureUsersLoaded() {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const stored = window.localStorage.getItem('registeredUsers');
            if (stored) {
                const parsed = JSON.parse(stored);
                USERS = { ...INITIAL_USERS, ...sanitizeUsers(parsed) };
                return USERS;
            }
        } catch (error) {
            console.warn('Unable to read users from storage', error);
        }
    }

    if (typeof globalThis !== 'undefined' && globalThis.__pixelQuestUsers) {
        USERS = { ...INITIAL_USERS, ...globalThis.__pixelQuestUsers };
        return USERS;
    }

    USERS = { ...INITIAL_USERS };
    return USERS;
}

function saveUsers() {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            window.localStorage.setItem('registeredUsers', JSON.stringify(USERS));
        } catch (error) {
            console.warn('Unable to save users to storage', error);
        }
    }

    if (typeof globalThis !== 'undefined') {
        globalThis.__pixelQuestUsers = USERS;
    }
}

function getUserRole(username) {
    const users = ensureUsersLoaded();
    return users[username]?.role || 'user';
}

function sanitizeUsers(users) {
    const sanitized = {};
    Object.entries(users || {}).forEach(([username, data]) => {
        if (!username || typeof username !== 'string' || !isValidUsername(username)) {
            return;
        }

        const role = data?.role || 'user';
        const password = typeof data?.password === 'string' ? data.password : '';
        const ip = typeof data?.ip === 'string' ? data.ip : `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
        const warnings = Number.isFinite(Number(data?.warnings)) ? Number(data.warnings) : 0;
        const banned = Boolean(data?.banned);

        sanitized[username] = {
            password,
            role,
            ip,
            warnings,
            banned
        };
    });
    return sanitized;
}

function isValidUsername(username) {
    return /^[a-zA-Z0-9_-]{3,20}$/.test(String(username));
}

function isValidPassword(password) {
    return typeof password === 'string' && password.length >= 4 && password.length <= 32;
}

function getLoginAttempts() {
    try {
        const stored = window.localStorage.getItem('loginAttempts');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        return [];
    }
}

function saveLoginAttempts(attempts) {
    window.localStorage.setItem('loginAttempts', JSON.stringify(attempts));
}

function cleanLoginAttempts() {
    const cutoff = Date.now() - 60_000;
    const attempts = getLoginAttempts().filter((attempt) => attempt.timestamp >= cutoff);
    saveLoginAttempts(attempts);
    return attempts;
}

function recordLoginAttempt(ip) {
    const attempts = cleanLoginAttempts();
    attempts.push({ ip, timestamp: Date.now() });
    saveLoginAttempts(attempts);
}

function isLoginBlocked(ip) {
    const attempts = cleanLoginAttempts().filter((attempt) => attempt.ip === ip);
    return attempts.length >= 6;
}

function requireRole(allowedRoles) {
    const currentRole = localStorage.getItem('userRole') || 'user';
    return allowedRoles.includes(currentRole);
}

function getSessionIp() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return '0.0.0.0';
    }

    let ip = window.localStorage.getItem('sessionIp');
    if (!ip) {
        ip = `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
        window.localStorage.setItem('sessionIp', ip);
    }

    return ip;
}

function getUserData(username) {
    const users = ensureUsersLoaded();
    return users[username] ? { username, ...users[username] } : null;
}

function updateUser(username, updates) {
    const users = ensureUsersLoaded();
    if (!users[username]) {
        return false;
    }
    users[username] = { ...users[username], ...updates };
    USERS = users;
    saveUsers();
    return true;
}

function getAllUsers() {
    const users = ensureUsersLoaded();
    return Object.entries(users).map(([username, data]) => ({
        username,
        role: data.role || 'user',
        ip: data.ip || 'unknown',
        warnings: data.warnings || 0,
        banned: Boolean(data.banned)
    }));
}

function setUserRole(username, role) {
    return updateUser(username, { role });
}

function showRoleMessage(message, type = 'success') {
    const messageBox = document.getElementById('roleAssignmentMessage');
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = `auth-message ${type}`;
    } else {
        alert(message);
    }
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

function handleAssignRole() {
    const username = document.getElementById('roleUserSelect')?.value;
    const role = document.getElementById('roleSelect')?.value;
    const currentUser = localStorage.getItem('currentUser');
    const userRole = localStorage.getItem('userRole');

    if (!username || !role) {
        showRoleMessage('Select a player and role first.', 'error');
        return;
    }

    if (role === 'owner' && userRole !== 'owner') {
        showRoleMessage('Only owner can assign owner role.', 'error');
        return;
    }

    if (setUserRole(username, role)) {
        showRoleMessage(`Updated ${username} to ${role}.`, 'success');
        renderRoleManager();
    } else {
        showRoleMessage('Unable to update user role.', 'error');
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

function saveBannedIps(ips) {
    window.localStorage.setItem('bannedIps', JSON.stringify(Array.from(new Set(ips))));
}

function banIp(ip) {
    const ips = getBannedIps();
    if (!ips.includes(ip)) {
        ips.push(ip);
        saveBannedIps(ips);
    }
}

function unbanIp(ip) {
    const ips = getBannedIps().filter((entry) => entry !== ip);
    saveBannedIps(ips);
}

function isIpBanned(ip) {
    return getBannedIps().includes(ip);
}

function warnUser(username) {
    const user = getUserData(username);
    if (!user) {
        return false;
    }
    return updateUser(username, { warnings: (user.warnings || 0) + 1 });
}

function renderAdminPanel() {
    const currentUser = localStorage.getItem('currentUser');
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

function renderModeratorPanel() {
    const currentUser = localStorage.getItem('currentUser');
    const userSelect = document.getElementById('moderatorUserSelect');
    const warningsSummary = document.getElementById('moderatorWarningsList');

    const users = getAllUsers().filter((user) => user.username !== currentUser);
    if (userSelect) {
        userSelect.innerHTML = users
            .map((user) => `<option value="${user.username}">${user.username}</option>`)
            .join('') || '<option value="">No players available</option>';
    }

    if (warningsSummary) {
        warningsSummary.innerHTML = users
            .map((user) => `<div class="warn-row"><span>${user.username}</span><span>Warnings: ${user.warnings}</span></div>`)
            .join('') || '<div class="empty-state">No users available.</div>';
    }
}

function renderValueManagerPanel() {
    const itemSelect = document.getElementById('valueItemSelect');
    const itemSummary = document.getElementById('valueItemSummary');
    const items = getItems();

    if (itemSelect) {
        itemSelect.innerHTML = items
            .map((item, index) => `<option value="${index}">${item.name} (${item.corruptedPages || 0} CP)</option>`)
            .join('') || '<option value="">No items available</option>';
    }

    if (itemSummary) {
        const selectedIndex = Number(itemSelect?.value || 0);
        const item = items[selectedIndex];
        itemSummary.innerHTML = item
            ? `<strong>${item.name}</strong><br>Current CP: ${item.corruptedPages || 0}`
            : '<em>Select an item to edit corrupted pages.</em>';
    }
}

function handleBanIp(selectedIp) {
    if (!selectedIp) {
        showRoleMessage('No IP selected to ban.', 'error');
        return;
    }
    banIp(selectedIp);
    showRoleMessage(`${selectedIp} has been banned.`, 'success');
    renderAdminPanel();
}

function handleUnbanIp(ip) {
    unbanIp(ip);
    showRoleMessage(`${ip} has been unbanned.`, 'success');
    renderAdminPanel();
}

function handleAdminWarn() {
    const username = document.getElementById('adminUserSelect')?.value;
    if (!username) {
        showRoleMessage('Select a player to warn.', 'error');
        return;
    }
    if (warnUser(username)) {
        showRoleMessage(`${username} has been warned.`, 'success');
        renderAdminPanel();
    } else {
        showRoleMessage('Unable to warn this player.', 'error');
    }
}

function handleModeratorWarn() {
    const username = document.getElementById('moderatorUserSelect')?.value;
    if (!username) {
        alert('Select a player to warn.');
        return;
    }
    if (warnUser(username)) {
        renderModeratorPanel();
        alert(`${username} has been warned.`);
    }
}

function handleUpdateCorruptedPages() {
    const itemIndex = Number(document.getElementById('valueItemSelect')?.value);
    const newCp = Number(document.getElementById('valueItemCp')?.value);

    if (!Number.isFinite(newCp)) {
        alert('Enter a valid corrupted pages value.');
        return;
    }

    const items = getItems();
    if (!items[itemIndex]) {
        alert('Select a valid item.');
        return;
    }

    items[itemIndex].corruptedPages = newCp;
    saveItems(items);
    renderValueManagerPanel();
    loadTableData(localStorage.getItem('userRole') || 'user');
    alert(`${items[itemIndex].name} corrupted pages updated to ${newCp}.`);
}

function registerUser(username, password, confirmPassword) {
    const cleanUsername = (username || '').trim();
    const cleanPassword = password || '';
    const cleanConfirm = confirmPassword || '';

    if (!cleanUsername || !cleanPassword) {
        return { success: false, message: '> ERROR: Fill all fields!' };
    }

    if (!isValidUsername(cleanUsername)) {
        return { success: false, message: '> ERROR: Username must be 3-20 letters, numbers, underscores or dashes.' };
    }

    if (!isValidPassword(cleanPassword)) {
        return { success: false, message: '> ERROR: Password must be 4-32 characters.' };
    }

    if (cleanPassword !== cleanConfirm) {
        return { success: false, message: '> ERROR: Passwords do not match!' };
    }

    const users = ensureUsersLoaded();
    if (users[cleanUsername]) {
        return { success: false, message: '> ERROR: This player already exists!' };
    }

    users[cleanUsername] = {
        password: cleanPassword,
        role: 'user',
        ip: getSessionIp(),
        warnings: 0,
        banned: false
    };
    USERS = users;
    saveUsers();

    return { success: true, message: `> SUCCESS: Welcome, ${cleanUsername}!` };
}

function loginUser(username, password) {
    const users = ensureUsersLoaded();
    return Boolean(users[username] && users[username].password === password);
}

function showAuthMessage(message, type = 'error') {
    const messageBox = document.getElementById('authMessage');
    if (!messageBox) {
        return;
    }

    messageBox.textContent = message;
    messageBox.className = `auth-message ${type}`;
}

function login() {
    const username = document.getElementById('loginUsername')?.value.trim() || document.getElementById('username')?.value.trim();
    const password = document.getElementById('loginPassword')?.value || document.getElementById('password')?.value || '';

    if (!username || !password) {
        showAuthMessage('> ERROR: Invalid credentials!');
        return;
    }

    const sessionIp = getSessionIp();
    if (isLoginBlocked(sessionIp) || isIpBanned(sessionIp)) {
        showAuthMessage('> ACCESS DENIED: Too many login attempts or IP blocked.');
        return;
    }

    if (loginUser(username, password)) {
        const role = getUserRole(username);
        const user = getUserData(username);

        if (user?.banned || isIpBanned(user?.ip)) {
            showAuthMessage('> ACCESS DENIED: Account or IP is banned.');
            return;
        }

        if (!user?.password || password !== user.password) {
            recordLoginAttempt(sessionIp);
            showAuthMessage('> ACCESS DENIED!');
            const passwordField = document.getElementById('loginPassword') || document.getElementById('password');
            if (passwordField) {
                passwordField.value = '';
            }
            return;
        }

        localStorage.setItem('currentUser', username);
        localStorage.setItem('userRole', role);
        localStorage.setItem('currentUserIp', sessionIp);
        window.location.href = 'dashboard.html';
    } else {
        recordLoginAttempt(sessionIp);
        showAuthMessage('> ACCESS DENIED!');
        const passwordField = document.getElementById('loginPassword') || document.getElementById('password');
        if (passwordField) {
            passwordField.value = '';
        }
    }
}

function register() {
    const username = document.getElementById('registerUsername')?.value.trim();
    const password = document.getElementById('registerPassword')?.value || '';
    const confirmPassword = document.getElementById('registerConfirmPassword')?.value || '';

    const result = registerUser(username, password, confirmPassword);

    if (result.success) {
        showAuthMessage(result.message, 'success');
        document.getElementById('registerForm')?.reset();
        setAuthMode('login');
        const loginUsername = document.getElementById('loginUsername');
        if (loginUsername) {
            loginUsername.value = username;
        }
    } else {
        showAuthMessage(result.message, 'error');
    }
}

function handleLoginSubmit(event) {
    event.preventDefault();
    login();
}

function handleRegisterSubmit(event) {
    event.preventDefault();
    register();
}

function setAuthMode(mode) {
    document.querySelectorAll('.toggle-btn').forEach((button) => {
        button.classList.toggle('active', button.dataset.mode === mode);
    });

    document.querySelectorAll('.auth-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === `${mode}Form`);
    });
}

function handleEnter(event) {
    if (event.key === 'Enter') {
        login();
    }
}

function checkAuth() {
    const currentUser = localStorage.getItem('currentUser');

    if (window.location.pathname.includes('dashboard.html')) {
        if (!currentUser) {
            window.location.href = 'index.html';
        } else {
            initDashboard();
        }
    }
}

function logout() {
    if (confirm('>>> EXIT REALM? <<<')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
        window.location.href = 'index.html';
    }
}

function initDashboard() {
    const currentUser = localStorage.getItem('currentUser');
    const userRole = localStorage.getItem('userRole');

    const userInfoSpan = document.getElementById('userInfo');
    let roleBadge = '';
    if (userRole === 'admin') {
        roleBadge = ' <span class="admin-badge">⚡ ADMIN ⚡</span>'; 
    } else if (userRole === 'owner') {
        roleBadge = ' <span class="admin-badge">🌟 OWNER 🌟</span>';
    }
    userInfoSpan.innerHTML = `Player: <strong>${currentUser}</strong>${roleBadge}`;

    const adminCol = document.getElementById('adminCol');
    const reportNavBtn = document.getElementById('reportNavBtn');
    const adminControlNavBtn = document.getElementById('adminControlNavBtn');
    const adminModerationNavBtn = document.getElementById('adminModerationNavBtn');
    const roleManagerNavBtn = document.getElementById('roleManagerNavBtn');

    if (userRole === 'admin' || userRole === 'owner') {
        if (adminCol) adminCol.style.display = 'table-cell';
        if (reportNavBtn) reportNavBtn.style.display = 'inline-block';
        if (adminControlNavBtn) adminControlNavBtn.style.display = 'inline-block';
        if (adminModerationNavBtn) adminModerationNavBtn.style.display = 'inline-block';
        if (roleManagerNavBtn) roleManagerNavBtn.style.display = 'inline-block';
    }

    const adminUserSelect = document.getElementById('adminUserSelect');
    adminUserSelect?.addEventListener('change', renderAdminPanel);
    document.getElementById('adminWarnBtn')?.addEventListener('click', handleAdminWarn);
    document.getElementById('adminBanIpBtn')?.addEventListener('click', () => {
        const selectedName = adminUserSelect?.value;
        const selectedUser = getUserData(selectedName);
        if (selectedUser?.ip) {
            handleBanIp(selectedUser.ip);
        } else {
            showRoleMessage('No IP available for the selected user.', 'error');
        }
    });

    document.getElementById('assignRoleBtn')?.addEventListener('click', handleAssignRole);

    loadTableData(userRole);
}

function initializeAuth() {
    ensureUsersLoaded();

    document.querySelectorAll('.toggle-btn').forEach((button) => {
        button.addEventListener('click', () => setAuthMode(button.dataset.mode));
    });

    document.getElementById('loginForm')?.addEventListener('submit', handleLoginSubmit);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegisterSubmit);

    if (window.location.pathname.includes('dashboard.html')) {
        checkAuth();
    } else if (localStorage.getItem('currentUser')) {
        window.location.href = 'dashboard.html';
    }
}

document.addEventListener('DOMContentLoaded', initializeAuth);

if (typeof window !== 'undefined') {
    window.login = login;
    window.register = register;
    window.handleLoginSubmit = handleLoginSubmit;
    window.handleRegisterSubmit = handleRegisterSubmit;
    window.handleEnter = handleEnter;
    window.setAuthMode = setAuthMode;
    window.logout = logout;
    window.handleAssignRole = handleAssignRole;
    window.handleBanIp = handleBanIp;
    window.handleUnbanIp = handleUnbanIp;
    window.handleAdminWarn = handleAdminWarn;
    window.handleModeratorWarn = handleModeratorWarn;
    window.handleUpdateCorruptedPages = handleUpdateCorruptedPages;
    window.renderAdminPanel = renderAdminPanel;
    window.renderModeratorPanel = renderModeratorPanel;
    window.renderValueManagerPanel = renderValueManagerPanel;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { registerUser, loginUser };
}
