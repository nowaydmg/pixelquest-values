const INITIAL_USERS = {
    admin: { password: 'admin123', role: 'admin' },
    user: { password: 'user123', role: 'user' },
    holybalenciagas: { password: 'X7#kP9$mQ2@vL8&nR4%tW6^eY0!uZ3*xB5-cV9', role: 'admin' }
};

let USERS = { ...INITIAL_USERS };

function ensureUsersLoaded() {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const stored = window.localStorage.getItem('registeredUsers');
            if (stored) {
                const parsed = JSON.parse(stored);
                USERS = { ...INITIAL_USERS, ...parsed };
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

function registerUser(username, password, confirmPassword) {
    const cleanUsername = (username || '').trim();
    const cleanPassword = password || '';
    const cleanConfirm = confirmPassword || '';

    if (!cleanUsername || !cleanPassword) {
        return { success: false, message: '> ERROR: Fill all fields!' };
    }

    if (cleanPassword.length < 4) {
        return { success: false, message: '> ERROR: Password must be at least 4 characters!' };
    }

    if (cleanPassword !== cleanConfirm) {
        return { success: false, message: '> ERROR: Passwords do not match!' };
    }

    const users = ensureUsersLoaded();
    if (users[cleanUsername]) {
        return { success: false, message: '> ERROR: This player already exists!' };
    }

    users[cleanUsername] = { password: cleanPassword, role: 'user' };
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

    if (loginUser(username, password)) {
        const role = getUserRole(username);
        localStorage.setItem('currentUser', username);
        localStorage.setItem('userRole', role);
        window.location.href = 'dashboard.html';
    } else {
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
    const roleBadge = userRole === 'admin' ? ' <span class="admin-badge">⚡ ADMIN ⚡</span>' : '';
    userInfoSpan.innerHTML = `Player: <strong>${currentUser}</strong>${roleBadge}`;

    const adminPanel = document.getElementById('adminPanel');
    const adminCol = document.getElementById('adminCol');
    if (userRole === 'admin') {
        adminPanel.style.display = 'block';
        adminCol.style.display = 'table-cell';
    }

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
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { registerUser, loginUser };
}
