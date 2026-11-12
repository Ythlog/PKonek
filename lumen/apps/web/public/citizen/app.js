/**
 * PKonek Citizen - Frontend Application for Citizens
 * This file contains citizen-specific JavaScript functionality.
 */

// Citizen Application State
const CitizenApp = {
    currentUser: null,
    isAuthenticated: false,
    userRole: 'citizen',
    complaints: [],
    stats: {
        activeComplaints: 0,
        resolvedIssues: 0,
        communitySupport: 0,
        avgResponseTime: '0d 0h'
    },
    currentSection: 'dashboard'
};

// DOM Elements for Citizen Interface
const citizenElements = {
    dashboardStats: null,
    actionCards: null,
    navLinks: null,
    userWelcome: null
};

/**
 * Initialize the citizen application
 */
function initCitizenApp() {
    console.log('PKonek Citizen Frontend Initializing...');
    
    // Cache citizen-specific DOM elements
    cacheCitizenElements();
    
    // Set up citizen event listeners
    setupCitizenEventListeners();
    
    // Load citizen data (simulated)
    loadCitizenData();
    
    // Update citizen UI
    updateCitizenUI();
    
    // Check backend connectivity
    checkCitizenBackend();
}

/**
 * Cache citizen-specific DOM elements
 */
function cacheCitizenElements() {
    citizenElements.dashboardStats = document.querySelectorAll('.stat-card .stat-value');
    citizenElements.actionCards = document.querySelectorAll('.action-card');
    citizenElements.navLinks = document.querySelectorAll('.nav-link');
    citizenElements.userWelcome = document.querySelector('.user-welcome');
    
    console.log('Citizen DOM elements cached');
}

/**
 * Set up citizen event listeners
 */
function setupCitizenEventListeners() {
    // Navigation links
    citizenElements.navLinks.forEach(link => {
        link.addEventListener('click', handleCitizenNavClick);
    });
    
    // Action cards
    citizenElements.actionCards.forEach(card => {
        card.addEventListener('click', handleCitizenActionClick);
    });
    
    // Action buttons inside cards
    document.querySelectorAll('.btn-action').forEach(button => {
        button.addEventListener('click', handleCitizenButtonClick);
    });
    
    // Profile/login buttons
    document.querySelectorAll('[onclick*="handleLogin"]').forEach(button => {
        button.addEventListener('click', handleCitizenLogin);
    });
    
    // Report buttons
    document.querySelectorAll('[onclick*="report"]').forEach(button => {
        button.addEventListener('click', handleCitizenReport);
    });
    
    // Window resize
    window.addEventListener('resize', handleCitizenResize);
}

/**
 * Handle citizen navigation clicks
 */
function handleCitizenNavClick(event) {
    event.preventDefault();
    const targetId = event.target.getAttribute('href').replace('#', '');
    
    // Update current section
    CitizenApp.currentSection = targetId;
    
    // Update active navigation
    updateCitizenNavActive(targetId);
    
    // Scroll to section
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
    }
    
    console.log('Citizen navigated to:', targetId);
    
    // Load section-specific data
    loadSectionData(targetId);
}

/**
 * Handle citizen action card clicks
 */
function handleCitizenActionClick(event) {
    const card = event.currentTarget;
    const action = card.querySelector('.action-title').textContent;
    
    console.log('Citizen action clicked:', action);
    
    // Prevent nested button clicks from triggering both events
    if (event.target.classList.contains('btn-action')) {
        return;
    }
    
    // Handle different actions
    switch(action) {
        case 'Report New Issue':
            navigateToSection('report');
            showCitizenNotification('Opening report form...');
            break;
        case 'View My Complaints':
            navigateToSection('my-complaints');
            showCitizenNotification('Loading your complaints...');
            break;
        case 'Community Issues Map':
            navigateToSection('map');
            showCitizenNotification('Opening community map...');
            break;
        case 'AI Complaint Assistant':
            showCitizenNotification('Chatbot feature coming soon!');
            break;
    }
}

/**
 * Handle citizen button clicks
 */
function handleCitizenButtonClick(event) {
    event.stopPropagation(); // Prevent card click event
    const button = event.target;
    const action = button.textContent;
    
    console.log('Citizen button clicked:', action);
    
    // Handle button actions
    if (action.includes('Report')) {
        startCitizenReport();
    } else if (action.includes('View')) {
        viewCitizenComplaints();
    } else if (action.includes('Open')) {
        openCitizenMap();
    } else if (action.includes('Talk')) {
        openCitizenChatbot();
    }
}

/**
 * Handle citizen login
 */
function handleCitizenLogin(event) {
    event.preventDefault();
    showCitizenNotification('Citizen login/registration will open here', 'info');
    
    // Simulate login modal
    setTimeout(() => {
        CitizenApp.isAuthenticated = true;
        CitizenApp.currentUser = {
            name: 'John Citizen',
            email: 'john@example.com',
            verified: true
        };
        
        updateCitizenUI();
        showCitizenNotification('Welcome back, ' + CitizenApp.currentUser.name + '!', 'success');
    }, 500);
}

/**
 * Handle citizen report
 */
function handleCitizenReport(event) {
    event.preventDefault();
    navigateToSection('report');
    showCitizenNotification('Preparing report form...', 'info');
}

/**
 * Handle citizen window resize
 */
function handleCitizenResize() {
    const isMobile = window.innerWidth <= 768;
    
    // Update for mobile
    if (isMobile) {
        // Add mobile-specific behaviors if needed
        console.log('Mobile view activated');
    }
}

/**
 * Update citizen navigation active state
 */
function updateCitizenNavActive(sectionId) {
    // Remove active class from all links
    citizenElements.navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to current link
    const activeLink = document.querySelector(.nav-link[href="#"]);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

/**
 * Load citizen data (simulated)
 */
function loadCitizenData() {
    console.log('Loading citizen data...');
    
    // Simulate API call for citizen data
    setTimeout(() => {
        // Simulate data
        CitizenApp.stats = {
            activeComplaints: 3,
            resolvedIssues: 12,
            communitySupport: 8,
            avgResponseTime: '2d 6h'
        };
        
        CitizenApp.complaints = [
            { id: 1, title: 'Pothole on Main Street', status: 'In Progress', date: '2024-01-15' },
            { id: 2, title: 'Street Light Out', status: 'Resolved', date: '2024-01-10' },
            { id: 3, title: 'Garbage Collection Delay', status: 'Pending', date: '2024-01-20' }
        ];
        
        updateCitizenStats();
        showCitizenNotification('Citizen data loaded successfully', 'success');
    }, 1000);
}

/**
 * Update citizen statistics display
 */
function updateCitizenStats() {
    if (citizenElements.dashboardStats.length === 4) {
        citizenElements.dashboardStats[0].textContent = CitizenApp.stats.activeComplaints;
        citizenElements.dashboardStats[1].textContent = CitizenApp.stats.resolvedIssues;
        citizenElements.dashboardStats[2].textContent = CitizenApp.stats.communitySupport;
        citizenElements.dashboardStats[3].textContent = CitizenApp.stats.avgResponseTime;
    }
}

/**
 * Load section-specific data
 */
function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'my-complaints':
            loadCitizenComplaints();
            break;
        case 'map':
            loadCommunityMap();
            break;
        case 'profile':
            loadCitizenProfile();
            break;
    }
}

/**
 * Load citizen complaints (simulated)
 */
function loadCitizenComplaints() {
    console.log('Loading citizen complaints...');
    // This would be replaced with actual API call
    showCitizenNotification('Loading your complaint history...', 'info');
}

/**
 * Load community map (simulated)
 */
function loadCommunityMap() {
    console.log('Loading community map...');
    // This would be replaced with actual map initialization
    showCitizenNotification('Initializing community map...', 'info');
}

/**
 * Load citizen profile (simulated)
 */
function loadCitizenProfile() {
    console.log('Loading citizen profile...');
    // This would be replaced with actual profile data load
    if (CitizenApp.isAuthenticated) {
        showCitizenNotification('Profile loaded for ' + CitizenApp.currentUser.name, 'info');
    }
}

/**
 * Update citizen UI
 */
function updateCitizenUI() {
    // Update user welcome message
    if (CitizenApp.isAuthenticated && citizenElements.userWelcome) {
        citizenElements.userWelcome.textContent = Welcome, !;
    }
    
    // Update dashboard based on authentication
    updateDashboardForAuth();
}

/**
 * Update dashboard based on authentication status
 */
function updateDashboardForAuth() {
    const loginBtn = document.querySelector('[onclick*="handleLogin"]');
    if (loginBtn && CitizenApp.isAuthenticated) {
        loginBtn.textContent = 'Logout';
        loginBtn.onclick = handleCitizenLogout;
    }
}

/**
 * Handle citizen logout
 */
function handleCitizenLogout(event) {
    event.preventDefault();
    CitizenApp.isAuthenticated = false;
    CitizenApp.currentUser = null;
    
    updateCitizenUI();
    showCitizenNotification('You have been logged out', 'info');
    
    // Reset login button
    const loginBtn = document.querySelector('[onclick*="handleLogout"]');
    if (loginBtn) {
        loginBtn.textContent = 'Login';
        loginBtn.onclick = handleCitizenLogin;
    }
}

/**
 * Check citizen backend connectivity
 */
function checkCitizenBackend() {
    console.log('Checking citizen backend connectivity...');
    
    // Simulate API health check
    setTimeout(() => {
        showCitizenNotification('Connected to PKonek Citizen API', 'success');
    }, 800);
}

/**
 * Show citizen notification
 */
function showCitizenNotification(message, type = 'info') {
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'citizen-notification';
    notification.textContent = message;
    
    // Style based on type
    const colors = {
        info: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
        success: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
        warning: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
        error: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' }
    };
    
    const color = colors[type] || colors.info;
    
    notification.style.cssText = 
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        background-color: ;
        color: ;
        border-left: 4px solid ;
        animation: citizenSlideIn 0.3s ease;
        max-width: 350px;
        font-weight: 500;
    ;
    
    // Add animation styles if not present
    if (!document.querySelector('#citizen-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'citizen-notification-styles';
        style.textContent = 
            @keyframes citizenSlideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes citizenSlideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        ;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'citizenSlideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Citizen-specific functions
 */
function startCitizenReport() {
    showCitizenNotification('Opening citizen report form...', 'info');
    // Implementation would go here
}

function viewCitizenComplaints() {
    showCitizenNotification('Loading your citizen complaints...', 'info');
    // Implementation would go here
}

function openCitizenMap() {
    showCitizenNotification('Opening citizen community map...', 'info');
    // Implementation would go here
}

function openCitizenChatbot() {
    showCitizenNotification('Citizen AI assistant coming soon!', 'info');
    // Implementation would go here
}

/**
 * Navigation helper
 */
function navigateToSection(sectionId) {
    CitizenApp.currentSection = sectionId;
    updateCitizenNavActive(sectionId);
    
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
    }
}

// Export global functions
window.handleLogin = handleCitizenLogin;
window.navigateToSection = navigateToSection;

// Initialize citizen app when DOM is loaded
document.addEventListener('DOMContentLoaded', initCitizenApp);

// Export for debugging
window.CitizenApp = CitizenApp;
