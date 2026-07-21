// Database obiektu użytkowników (w rzeczywistości byłoby na serwerze)
const USERS = {
    'admin': { password: 'admin123', role: 'admin' },
    'user': { password: 'user123', role: 'user' }
};

// Sprawdzenie czy użytkownik jest zalogowany
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

// Login funkcja
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');

    if (!username || !password) {
        showError(errorDiv, '> ERROR: Invalid credentials!');
        return;
    }

    if (USERS[username] && USERS[username].password === password) {
        // Login udany
        localStorage.setItem('currentUser', username);
        localStorage.setItem('userRole', USERS[username].role);
        window.location.href = 'dashboard.html';
    } else {
        showError(errorDiv, '> ACCESS DENIED!');
        document.getElementById('password').value = '';
    }
}

// Logout funkcja
function logout() {
    if (confirm('>>> EXIT REALM? <<<')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
        window.location.href = 'index.html';
    }
}

// Pokaż błąd
function showError(errorDiv, message) {
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 3000);
}

// Enter key handling
function handleEnter(event) {
    if (event.key === 'Enter') {
        login();
    }
}

// Zainicjuj dashboard
function initDashboard() {
    const currentUser = localStorage.getItem('currentUser');
    const userRole = localStorage.getItem('userRole');

    // Wyświetl informacje o użytkowniku
    const userInfoSpan = document.getElementById('userInfo');
    const roleBadge = userRole === 'admin' ? ' <span class="admin-badge">⚡ ADMIN ⚡</span>' : '';
    userInfoSpan.innerHTML = `Player: <strong>${currentUser}</strong>${roleBadge}`;

    // Pokaż panel admina tylko dla administratorów
    const adminPanel = document.getElementById('adminPanel');
    const adminCol = document.getElementById('adminCol');
    if (userRole === 'admin') {
        adminPanel.style.display = 'block';
        adminCol.style.display = 'table-cell';
    }

    // Załaduj dane
    loadTableData(userRole);
}

// Strona wczytana
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        checkAuth();
    }
});
