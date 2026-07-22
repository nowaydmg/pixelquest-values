// Auth System — uses backend API with HTTP-only cookies and CSRF protection (no localStorage)
let currentUser = null;
let csrfToken = null;

function getAuthHeaders() {
    return { 'Content-Type': 'application/json' };
}

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

async function api(method, path, body) {
    const opts = { method, headers: getAuthHeaders(), credentials: 'include' };
    if (body) {
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

async function signUp(username, password) {
    try {
        await getCsrfToken();
        const data = await api('POST', '/api/auth/register', { username, password });
        if (data.error) return { success: false, message: `> ERROR: ${data.error}` };
        return { success: true, message: `> SUCCESS: Welcome, ${username}! You can log in now.` };
    } catch (err) {
        return { success: false, message: `> ERROR: ${err.message}` };
    }
}

async function signIn(username, password) {
    try {
        await getCsrfToken();
        const data = await api('POST', '/api/auth/login', { username, password });
        if (data.error) return { success: false, message: `> ERROR: ${data.error}` };
        if (data.user?.banned) return { success: false, message: '> ACCESS DENIED: Account is banned.' };

        currentUser = data.user;
        return { success: true, message: `> SUCCESS: Welcome back, ${data.user.username}!` };
    } catch (err) {
        return { success: false, message: `> ERROR: ${err.message}` };
    }
}

async function signOut() {
    try {
        await api('POST', '/api/auth/logout');
    } catch (err) {
        console.error('Logout error:', err);
    }
    currentUser = null;
    // NAPRAWIONE: używamy czystego URL bez .html
    window.location.href = '/';
}

function getCurrentUser() {
    return currentUser?.username;
}

function getCurrentUserId() {
    return currentUser?.id;
}

function getUserRole() {
    return currentUser?.role || 'user';
}

async function registerUser(username, password, confirmPassword) {
    if (!username || !password) return { success: false, message: '> ERROR: Fill all fields!' };
    if (password !== confirmPassword) return { success: false, message: '> ERROR: Passwords do not match!' };
    if (password.length < 6) return { success: false, message: '> ERROR: Password must be at least 6 characters!' };
    return signUp(username, password);
}

async function loginUser(username, password) {
    return signIn(username, password);
}

function showAuthMessage(message, type = 'error') {
    const messageBox = document.getElementById('authMessage');
    if (!messageBox) return;
    messageBox.textContent = message;
    messageBox.className = `auth-message ${type}`;
}

async function login() {
    const username = document.getElementById('loginUsername')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    if (!username || !password) { showAuthMessage('> ERROR: Invalid credentials!'); return; }

    const result = await loginUser(username, password);
    if (result.success) {
        showAuthMessage(result.message, 'success');
        // NAPRAWIONE: używamy czystego URL bez .html
        setTimeout(() => { window.location.href = '/dashboard'; }, 800);
    } else {
        showAuthMessage(result.message);
        const passwordField = document.getElementById('loginPassword');
        if (passwordField) passwordField.value = '';
    }
}

async function register() {
    const username = document.getElementById('registerUsername')?.value.trim();
    const password = document.getElementById('registerPassword')?.value || '';
    const confirmPassword = document.getElementById('registerConfirmPassword')?.value || '';
    const result = await registerUser(username, password, confirmPassword);
    if (result.success) {
        showAuthMessage(result.message, 'success');
        document.getElementById('registerForm')?.reset();
        setAuthMode('login');
        const loginUsername = document.getElementById('loginUsername');
        if (loginUsername) loginUsername.value = username;
    } else {
        showAuthMessage(result.message);
    }
}

function handleLoginSubmit(event) { event.preventDefault(); login(); }
function handleRegisterSubmit(event) { event.preventDefault(); register(); }

function setAuthMode(mode) {
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    document.querySelectorAll('.auth-panel').forEach(panel => panel.classList.toggle('active', panel.id === `${mode}Form`));
}

function handleEnter(event) { if (event.key === 'Enter') login(); }

async function checkAuth() {
    // NAPRAWIONE: sprawdzamy /dashboard zamiast dashboard.html
    const isDashboard = window.location.pathname === '/dashboard' || 
                        window.location.pathname === '/dashboard.html' ||
                        window.location.pathname.endsWith('/dashboard');

    if (isDashboard) {
        try {
            const data = await api('GET', '/api/auth/session');
            if (data.error || !data.user) { signOut(); return; }
            currentUser = data.user;
            await initDashboard();
        } catch {
            signOut();
        }
    } else {
        try {
            const data = await api('GET', '/api/auth/session');
            if (data.user && !data.error) {
                // NAPRAWIONE: używamy czystego URL bez .html
                window.location.href = '/dashboard';
            }
        } catch {
            // Not authenticated, stay on login page
        }
    }
}

function logout() {
    if (confirm('>>> EXIT REALM? <<<')) signOut();
}

async function initDashboard() {
    const username = getCurrentUser();
    const role = getUserRole();

    const userInfoSpan = document.getElementById('userInfo');
    let roleBadge = '';
    if (role && role !== 'user') {
        const roleClass = role.replace(/\s+/g, '-');
        roleBadge = ` <span class="role-badge role-${roleClass}">${role.toUpperCase()}</span>`;
    }
    if (userInfoSpan) userInfoSpan.innerHTML = `Player: <strong>${username}</strong>${roleBadge}`;

    const adminCol = document.getElementById('adminCol');
    const reportNavBtn = document.getElementById('reportNavBtn');
    const adminControlNavBtn = document.getElementById('adminControlNavBtn');
    const adminModerationNavBtn = document.getElementById('adminModerationNavBtn');
    const roleManagerNavBtn = document.getElementById('roleManagerNavBtn');

    if (['value manager', 'admin', 'owner'].includes(role)) {
        if (adminCol) adminCol.style.display = 'table-cell';
        if (adminControlNavBtn) adminControlNavBtn.style.display = 'inline-block';
    }

    if (['moderator', 'admin', 'owner'].includes(role)) {
        if (reportNavBtn) reportNavBtn.style.display = 'inline-block';
    }

    if (role === 'admin' || role === 'owner') {
        if (adminModerationNavBtn) adminModerationNavBtn.style.display = 'inline-block';
        if (roleManagerNavBtn) roleManagerNavBtn.style.display = 'inline-block';
    }

    if (typeof loadTableData === 'function') await loadTableData(role);
}

async function initializeAuth() {
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.addEventListener('click', () => setAuthMode(btn.dataset.mode)));
    document.getElementById('loginForm')?.addEventListener('submit', handleLoginSubmit);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegisterSubmit);
    await checkAuth();
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
    window.getCurrentUser = getCurrentUser;
    window.getUserRole = getUserRole;
    window.getCurrentUserId = getCurrentUserId;
}
