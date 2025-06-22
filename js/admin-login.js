// Admin Login System
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    // Check if already logged in
    if (isLoggedIn()) {
        redirectToAdmin();
        return;
    }

    // Handle login form submission
    loginForm.addEventListener('submit', handleLogin);
});

// Handle login
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    // Simple validation
    if (!username || !password) {
        showLoginAlert('Please fill in all fields', 'error');
        return;
    }
    
    // Check credentials (you can change the username, password is "Talimar@123")
    if (password === 'Talimar@123') {
        // Store login session
        const session = {
            username: username,
            loggedIn: true,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('adminSession', JSON.stringify(session));
        
        showLoginAlert('Login successful! Redirecting...', 'success');
        
        // Redirect to admin panel after short delay
        setTimeout(() => {
            redirectToAdmin();
        }, 1500);
    } else {
        showLoginAlert('Invalid credentials. Please try again.', 'error');
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
    }
}

// Check if user is logged in
function isLoggedIn() {
    const session = JSON.parse(localStorage.getItem('adminSession') || '{}');
    
    if (!session.loggedIn) return false;
    
    // Check if session is not expired (24 hours)
    const sessionTime = new Date(session.timestamp);
    const now = new Date();
    const hoursDiff = (now - sessionTime) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
        // Session expired
        localStorage.removeItem('adminSession');
        return false;
    }
    
    return true;
}

// Redirect to admin panel
function redirectToAdmin() {
    window.location.href = 'admin-panel.html';
}

// Show login alert
function showLoginAlert(message, type) {
    const alertBox = document.getElementById('login-alert');
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.className = `alert ${type}`;
        alertBox.style.display = 'block';
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                alertBox.style.display = 'none';
            }, 3000);
        }
    }
}

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleBtn.className = 'fas fa-eye';
    }
}

// Logout function (can be called from admin panel)
function logout() {
    localStorage.removeItem('adminSession');
    window.location.href = 'admin-login.html';
} 