// Configuration
const CONFIG = {
    API_BASE_URL: 'https://bc89-41-121-114-146.ngrok-free.app/api',
    DEMO_MODE: true,
    DEMO_EMAIL: 'admin@example.com',
    DEMO_SUBJECT: 'Project Update - Q4 Planning'
};

// Global state
let authToken = null;
let currentUser = null;
let isOfficeReady = false;

// DOM Elements
const elements = {
    loginContainer: null,
    mainContainer: null,
    loginForm: null,
    loginBtn: null,
    loginSpinner: null,
    loginError: null,
    logoutBtn: null,
    senderEmail: null,
    emailSubject: null,
    contactLoading: null,
    contactDetails: null,
    contactError: null,
    noContactInfo: null,
    refreshBtn: null,
    retryBtn: null,
    toastContainer: null
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    initializeOffice();
    setupEventListeners();
    checkAuthState();
});

// Initialize DOM element references
function initializeElements() {
    Object.keys(elements).forEach(key => {
        elements[key] = document.getElementById(key.replace(/([A-Z])/g, match => 
            key === 'toastContainer' ? match : match.toLowerCase()
        ));
    });
    
    // Handle camelCase to kebab-case conversion for IDs
    elements.loginContainer = document.getElementById('loginContainer');
    elements.mainContainer = document.getElementById('mainContainer');
    elements.loginForm = document.getElementById('loginForm');
    elements.loginBtn = document.getElementById('loginBtn');
    elements.loginSpinner = document.getElementById('loginSpinner');
    elements.loginError = document.getElementById('loginError');
    elements.logoutBtn = document.getElementById('logoutBtn');
    elements.senderEmail = document.getElementById('senderEmail');
    elements.emailSubject = document.getElementById('emailSubject');
    elements.contactLoading = document.getElementById('contactLoading');
    elements.contactDetails = document.getElementById('contactDetails');
    elements.contactError = document.getElementById('contactError');
    elements.noContactInfo = document.getElementById('noContactInfo');
    elements.refreshBtn = document.getElementById('refreshBtn');
    elements.retryBtn = document.getElementById('retryBtn');
    elements.toastContainer = document.getElementById('toastContainer');
}

// Initialize Office.js
function initializeOffice() {
    if (typeof Office !== 'undefined') {
        Office.onReady((info) => {
            if (info.host === Office.HostType.Outlook) {
                isOfficeReady = true;
                console.log('Office.js initialized successfully');
            } else {
                console.warn('Office host is not Outlook, using demo mode');
                CONFIG.DEMO_MODE = true;
            }
        });
    } else {
        console.log('Office.js not available, using demo mode');
        CONFIG.DEMO_MODE = true;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout button
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Refresh button
    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', refreshContactInfo);
    }
    
    // Retry button
    if (elements.retryBtn) {
        elements.retryBtn.addEventListener('click', refreshContactInfo);
    }
}

// Check authentication state
function checkAuthState() {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showMainContainer();
    } else {
        showLoginContainer();
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    setLoginLoading(true);
    hideError();
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            
            // Save to localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showToast('Login successful!', 'success');
            showMainContainer();
        } else {
            showError(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Connection error. Please check your internet connection.');
    } finally {
        setLoginLoading(false);
    }
}

// Handle logout
function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    showToast('Logged out successfully', 'info');
    showLoginContainer();
}

// Set login loading state
function setLoginLoading(loading) {
    if (elements.loginBtn && elements.loginSpinner) {
        const btnText = elements.loginBtn.querySelector('.btn-text');
        
        if (loading) {
            elements.loginBtn.disabled = true;
            elements.loginSpinner.style.display = 'inline-block';
            if (btnText) btnText.textContent = 'Signing In...';
        } else {
            elements.loginBtn.disabled = false;
            elements.loginSpinner.style.display = 'none';
            if (btnText) btnText.textContent = 'Sign In';
        }
    }
}

// Show/hide containers
function showLoginContainer() {
    if (elements.loginContainer && elements.mainContainer) {
        elements.loginContainer.classList.remove('hidden');
        elements.mainContainer.classList.add('hidden');
    }
}

function showMainContainer() {
    if (elements.loginContainer && elements.mainContainer) {
        elements.loginContainer.classList.add('hidden');
        elements.mainContainer.classList.remove('hidden');
        loadEmailContext();
        loadContactInfo();
    }
}

// Load email context
async function loadEmailContext() {
    if (CONFIG.DEMO_MODE) {
        updateEmailDisplay(CONFIG.DEMO_EMAIL, CONFIG.DEMO_SUBJECT);
        loadContactInfo(CONFIG.DEMO_EMAIL);
    } else {
        try {
            Office.context.mailbox.item.from.getAsync((result) => {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                    const senderEmail = result.value.emailAddress;
                    Office.context.mailbox.item.subject.getAsync((subjectResult) => {
                        if (subjectResult.status === Office.AsyncResultStatus.Succeeded) {
                            updateEmailDisplay(senderEmail, subjectResult.value);
                        } else {
                            console.error('Failed to get subject:', subjectResult.error);
                            updateEmailDisplay(senderEmail, 'Unable to retrieve subject');
                        }
                        loadContactInfo(senderEmail);
                    });
                } else {
                    console.error('Failed to get sender email:', result.error);
                    updateEmailDisplay('Unable to retrieve sender', 'Unable to retrieve subject');
                }
            });
        } catch (error) {
            console.error('Error loading email context:', error);
            updateEmailDisplay('Error loading sender', 'Error loading subject');
        }
    }
}

// Update email display
function updateEmailDisplay(email, subject) {
    if (elements.senderEmail) {
        elements.senderEmail.textContent = email;
    }
    if (elements.emailSubject) {
        elements.emailSubject.textContent = subject || 'No subject';
    }
}

// Load contact information
async function loadContactInfo(senderEmail = null) {
    const email = senderEmail || getCurrentSenderEmail();
    if (!email) {
        showNoContactInfo('Unable to determine sender email');
        return;
    }
    
    showContactLoading();
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/contacts/enrich`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.contact) {
                displayContactInfo(data.contact);
            } else {
                showNoContactInfo('No additional information available for this contact');
            }
        } else if (response.status === 401) {
            showToast('Session expired. Please login again.', 'error');
            handleLogout();
        } else {
            showContactError(data.message || 'Failed to load contact information');
        }
    } catch (error) {
        console.error('Contact info error:', error);
        showContactError('Connection error. Please check your internet connection.');
    }
}

// Get current sender email
function getCurrentSenderEmail() {
    if (CONFIG.DEMO_MODE) {
        return CONFIG.DEMO_EMAIL;
    }
    
    // In real implementation, this would extract from Office.js
    return elements.senderEmail?.textContent || null;
}

// Display contact information
function displayContactInfo(contact) {
    hideAllContactStates();
    
    if (elements.contactDetails) {
        // Update contact card
        const initials = getInitials(contact.full_Name || contact.name || '');
        const initialsEl = document.getElementById('contactInitials');
        const nameEl = document.getElementById('contactName');
        const titleEl = document.getElementById('contactTitle');
        const deptEl = document.getElementById('contactDepartment');
        const phoneEl = document.getElementById('contactPhone');
        const emailEl = document.getElementById('contactEmail');
        
        if (initialsEl) initialsEl.textContent = initials;
        if (nameEl) nameEl.textContent = contact.full_Name || contact.name || 'Unknown';
        if (titleEl) titleEl.textContent = contact.jobTitle || contact.title || 'No title available';
        if (deptEl) deptEl.textContent = contact.department || 'Not specified';
        if (phoneEl) phoneEl.textContent = contact.phoneNumber || contact.phone || 'Not available';
        if (emailEl) emailEl.textContent = contact.email || 'Not available';
        
        elements.contactDetails.classList.remove('hidden');
    }
}

// Show contact loading state
function showContactLoading() {
    hideAllContactStates();
    if (elements.contactLoading) {
        elements.contactLoading.classList.remove('hidden');
    }
}

// Show contact error
function showContactError(message) {
    hideAllContactStates();
    if (elements.contactError) {
        const errorMessageEl = document.getElementById('contactErrorMessage');
        if (errorMessageEl) {
            errorMessageEl.textContent = message;
        }
        elements.contactError.classList.remove('hidden');
    }
}

// Show no contact info
function showNoContactInfo(message) {
    hideAllContactStates();
    if (elements.noContactInfo) {
        const messageEl = elements.noContactInfo.querySelector('p');
        if (messageEl) {
            messageEl.textContent = message;
        }
        elements.noContactInfo.classList.remove('hidden');
    }
}

// Hide all contact states
function hideAllContactStates() {
    const states = [elements.contactLoading, elements.contactDetails, elements.contactError, elements.noContactInfo];
    states.forEach(el => {
        if (el) el.classList.add('hidden');
    });
}

// Refresh contact information
function refreshContactInfo() {
    loadContactInfo();
}

// Utility functions
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2) || '?';
}

function showError(message) {
    if (elements.loginError) {
        elements.loginError.textContent = message;
        elements.loginError.classList.add('show');
    }
}

function hideError() {
    if (elements.loginError) {
        elements.loginError.classList.remove('show');
    }
}

// Toast notification system
function showToast(message, type = 'info') {
    if (!elements.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span>${getToastIcon(type)}</span>
            <span>${message}</span>
        </div>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }, 4000);
}

function getToastIcon(type) {
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    return icons[type] || icons.info;
}

// Add slideOut animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Handle network errors and token expiration
async function makeAuthenticatedRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            ...options.headers
        }
    };
    
    const response = await fetch(url, { ...options, headers: defaultOptions.headers });
    
    if (response.status === 401) {
        showToast('Session expired. Please login again.', 'error');
        handleLogout();
        throw new Error('Authentication required');
    }
    
    return response;
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+R or Cmd+R to refresh contact info (when logged in)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && authToken) {
        e.preventDefault();
        refreshContactInfo();
        showToast('Contact information refreshed', 'info');
    }
    
    // Escape to logout (when logged in)
    if (e.key === 'Escape' && authToken) {
        const confirmLogout = confirm('Are you sure you want to logout?');
        if (confirmLogout) {
            handleLogout();
        }
    }
});

// Handle connection status
window.addEventListener('online', function() {
    showToast('Connection restored', 'success');
    if (authToken) {
        refreshContactInfo();
    }
});

window.addEventListener('offline', function() {
    showToast('Connection lost. Some features may not work.', 'warning');
});

// Initialize connection status check
function checkConnectionStatus() {
    if (!navigator.onLine) {
        showToast('You appear to be offline. Some features may not work.', 'warning');
    }
}

// Call connection check after DOM is loaded
setTimeout(checkConnectionStatus, 1000);

// Periodic token validation (every 5 minutes)
setInterval(async function() {
    if (authToken) {
        try {
            const response = await makeAuthenticatedRequest(`${CONFIG.API_BASE_URL}/auth/validate`);
            if (!response.ok) {
                throw new Error('Token validation failed');
            }
        } catch (error) {
            console.log('Token validation failed, user will be logged out on next action');
        }
    }
}, 5 * 60 * 1000);

// Enhanced error handling for fetch requests
function handleFetchError(error) {
    console.error('Fetch error:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return 'Network error. Please check your connection.';
    }
    
    if (error.message.includes('401')) {
        return 'Authentication failed. Please login again.';
    }
    
    if (error.message.includes('403')) {
        return 'Access denied. Please check your permissions.';
    }
    
    if (error.message.includes('404')) {
        return 'Service not found. Please contact support.';
    }
    
    if (error.message.includes('500')) {
        return 'Server error. Please try again later.';
    }
    
    return 'An unexpected error occurred. Please try again.';
}

// Form validation helpers
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password && password.length >= 6;
}

// Enhanced login validation
function validateLoginForm(email, password) {
    if (!email || !password) {
        return 'Please fill in all fields';
    }
    
    if (!validateEmail(email)) {
        return 'Please enter a valid email address';
    }
    
    if (!validatePassword(password)) {
        return 'Password must be at least 6 characters long';
    }
    
    return null;
}

// Update the login handler to use enhanced validation
async function handleLoginEnhanced(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    const validationError = validateLoginForm(email, password);
    if (validationError) {
        showError(validationError);
        return;
    }
    
    setLoginLoading(true);
    hideError();
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showToast(`Welcome back, ${currentUser.name || currentUser.email}!`, 'success');
            showMainContainer();
        } else {
            showError(data.message || 'Login failed');
        }
    } catch (error) {
        const errorMessage = handleFetchError(error);
        showError(errorMessage);
    } finally {
        setLoginLoading(false);
    }
}

// Replace the original login handler
if (elements.loginForm) {
    elements.loginForm.removeEventListener('submit', handleLogin);
    elements.loginForm.addEventListener('submit', handleLoginEnhanced);
}

// Debug helpers (remove in production)
if (CONFIG.DEMO_MODE) {
    window.debugApp = {
        getAuthToken: () => authToken,
        getCurrentUser: () => currentUser,
        getConfig: () => CONFIG,
        simulateOfflineMode: () => {
            window.dispatchEvent(new Event('offline'));
        },
        simulateOnlineMode: () => {
            window.dispatchEvent(new Event('online'));
        },
        clearStorage: () => {
            localStorage.clear();
            location.reload();
        }
    };
    
    console.log('Debug helpers available: window.debugApp');
    console.log('Demo mode active - using sample data');
}