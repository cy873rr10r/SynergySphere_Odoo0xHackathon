// Toast function
function showToast(message, type='success') {
    const toast = document.getElementById('toast-msg');
    toast.textContent = message;
    toast.className = 'toast fade-in ' + type;
    setTimeout(() => {
        toast.className = 'toast fade-out ' + type;
    }, 1850);
    setTimeout(() => {
        toast.textContent = '';
        toast.className = 'toast';
    }, 2550);
}

// Profile modal functions
function showProfileModal() {
    document.getElementById('profileModal').style.display = 'block';
}

function hideProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

// Project modal functions
function showCreateProjectModal() {
    document.getElementById('createProjectModal').style.display = 'block';
}

function hideCreateProjectModal() {
    document.getElementById('createProjectModal').style.display = 'none';
    document.getElementById('createProjectForm').reset();
}

// Project dropdown menu functionality
function toggleProjectMenu(projectId) {
    const dropdown = document.getElementById(`project-menu-${projectId}`);
    const allDropdowns = document.querySelectorAll('.project-dropdown');
    
    // Close all other dropdowns
    allDropdowns.forEach(d => {
        if (d !== dropdown) {
            d.classList.remove('show');
        }
    });
    
    // Toggle current dropdown
    dropdown.classList.toggle('show');
}

// Simple click handler for closing dropdowns
document.addEventListener('click', function(e) {
    // Close all dropdowns when clicking outside
    if (!e.target.closest('.card-menu')) {
        document.querySelectorAll('.project-dropdown').forEach(d => {
            d.classList.remove('show');
        });
    }
});

// Delete project function
function deleteProject(projectId, projectName) {
    if (!confirm(`Are you sure you want to delete "${projectName}"?\n\nThis will permanently delete:\n• All project tasks\n• All project messages\n• All project members\n\nThis action cannot be undone!`)) {
        return;
    }
    
    fetch('/delete_project', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            project_id: projectId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');
            // Find and remove the project card from the DOM with animation
            const projectCards = document.querySelectorAll('.project-card');
            let targetCard = null;
            
            // Find the correct project card by searching for the project ID in the onclick attribute
            projectCards.forEach(card => {
                const onclickAttr = card.getAttribute('onclick');
                if (onclickAttr && onclickAttr.includes(`project_detail/${projectId}`)) {
                    targetCard = card;
                }
            });
            
            if (targetCard) {
                // Animate the card removal
                targetCard.style.transition = 'all 0.3s ease-out';
                targetCard.style.transform = 'scale(0.8)';
                targetCard.style.opacity = '0';
                targetCard.style.height = targetCard.offsetHeight + 'px';
                
                setTimeout(() => {
                    targetCard.style.height = '0';
                    targetCard.style.padding = '0';
                    targetCard.style.margin = '0';
                }, 150);
                
                setTimeout(() => {
                    targetCard.remove();
                    
                    // Check if no projects left, show empty state
                    const remainingCards = document.querySelectorAll('.project-card');
                    if (remainingCards.length === 0) {
                        // Create and show empty state
                        const projectsGrid = document.querySelector('.projects-grid');
                        projectsGrid.innerHTML = `
                            <div class="empty-state">
                                <div class="empty-icon">📋</div>
                                <h3>No Projects Yet</h3>
                                <p>Create your first project to start collaborating with your team.</p>
                                <button class="btn-primary" onclick="showCreateProjectModal()">Create Project</button>
                            </div>
                        `;
                    }
                }, 450);
            }
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('An error occurred while deleting the project', 'error');
    });
    
    // Close dropdown
    document.getElementById(`project-menu-${projectId}`).classList.remove('show');
}

// NOTIFICATION SYSTEM
let notificationUpdateInterval;

// Initialize notification system
function initNotifications() {
    loadNotificationSettings();
    loadNotifications();
    
    // Update notifications every 30 seconds
    notificationUpdateInterval = setInterval(loadNotifications, 30000);
}

// Load notification settings
function loadNotificationSettings() {
    fetch('/get_notification_settings')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const toggle = document.getElementById('notificationToggle');
                toggle.checked = data.notifications_enabled;
                
                // Add event listener for toggle
                toggle.addEventListener('change', toggleNotificationSettings);
            }
        })
        .catch(error => console.error('Error loading notification settings:', error));
}

// Toggle notification settings
function toggleNotificationSettings() {
    fetch('/toggle_notifications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const message = data.notifications_enabled ? 'Notifications enabled' : 'Notifications disabled';
            showToast(message, 'success');
        }
    })
    .catch(error => {
        console.error('Error toggling notifications:', error);
        showToast('Error updating notification settings', 'error');
    });
}

// Load notifications
function loadNotifications() {
    fetch('/get_notifications')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateNotificationUI(data.notifications, data.unread_count);
            }
        })
        .catch(error => console.error('Error loading notifications:', error));
}

// Update notification UI
function updateNotificationUI(notifications, unreadCount) {
    const badge = document.getElementById('notificationBadge');
    const notificationList = document.getElementById('notificationList');
    
    // Update badge
    if (unreadCount > 0) {
        badge.style.display = 'flex';
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    } else {
        badge.style.display = 'none';
    }
    
    // Update notification list
    if (notifications.length === 0) {
        notificationList.innerHTML = '<div class="no-notifications">No notifications yet</div>';
    } else {
        notificationList.innerHTML = notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" onclick="markNotificationRead(${notification.id})">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${formatNotificationTime(notification.created_at)}</div>
            </div>
        `).join('');
    }
}

// Toggle notification dropdown
function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    dropdown.classList.toggle('show');
    
    if (dropdown.classList.contains('show')) {
        loadNotifications(); // Refresh when opened
    }
}

// Mark notification as read
function markNotificationRead(notificationId) {
    fetch('/mark_notification_read', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            notification_id: notificationId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadNotifications(); // Refresh notifications
        }
    })
    .catch(error => console.error('Error marking notification as read:', error));
}

// Mark all notifications as read
function markAllNotificationsRead() {
    fetch('/mark_all_notifications_read', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadNotifications(); // Refresh notifications
            showToast('All notifications marked as read', 'success');
        }
    })
    .catch(error => console.error('Error marking all notifications as read:', error));
}

// Format notification time
function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
    } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    }
}

// Close notification dropdown when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.notification-container')) {
        const notificationDropdown = document.getElementById('notificationDropdown');
        if (notificationDropdown) {
            notificationDropdown.classList.remove('show');
        }
    }
});

// Create project form submission
if (document.getElementById('createProjectForm')) {
    document.getElementById('createProjectForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const projectData = {
            name: formData.get('name'),
            description: formData.get('description'),
            color: formData.get('color')
        };
        
        try {
            const response = await fetch('/create_project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(projectData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast(result.message, 'success');
                hideCreateProjectModal();
                // Refresh the page to show the new project and ensure all functionality works
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error creating project:', error);
            showToast('Error creating project. Please try again.', 'error');
        }
    });
}

// Close modals when clicking outside
window.onclick = function(event) {
    const profileModal = document.getElementById('profileModal');
    const createProjectModal = document.getElementById('createProjectModal');
    
    if (event.target === profileModal) {
        hideProfileModal();
    }
    if (event.target === createProjectModal) {
        hideCreateProjectModal();
    }
}

// Profile dropdown functionality
function initializeProfileDropdown() {
    const profileMenuBtn = document.querySelector('.profile-menu-btn');
    const profileDropdown = document.querySelector('.profile-dropdown');
    
    if (profileMenuBtn && profileDropdown) {
        console.log('Profile dropdown initialized');
        
        // Add click event
        profileMenuBtn.addEventListener('click', function(e) {
            console.log('Profile button clicked');
            e.preventDefault();
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
        
        // Add touch event for mobile
        profileMenuBtn.addEventListener('touchend', function(e) {
            console.log('Profile button touched');
            e.preventDefault();
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!profileDropdown.contains(e.target) && !profileMenuBtn.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });
        
        // Close dropdown on touch outside
        document.addEventListener('touchend', function(e) {
            if (!profileDropdown.contains(e.target) && !profileMenuBtn.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });
    } else {
        console.log('Profile dropdown elements not found:', {
            profileMenuBtn: !!profileMenuBtn,
            profileDropdown: !!profileDropdown
        });
    }
}

// Project search functionality
function initializeProjectSearch() {
    // Wait a bit for the DOM to be fully ready
    setTimeout(() => {
        const searchInput = document.querySelector('.search-input');
        
        if (!searchInput) {
            console.log('Search input not found');
            return;
        }
        
        console.log('Search input found, initializing...');
        searchInput.placeholder = 'Search projects...';
        
        // Test function
        searchInput.addEventListener('keyup', function(e) {
            console.log('Search keyup detected:', this.value);
            performSearch(this.value);
        });
        
        searchInput.addEventListener('input', function(e) {
            console.log('Search input detected:', this.value);
            performSearch(this.value);
        });
        
    }, 100);
}

// Separate search function
function performSearch(searchTerm) {
    searchTerm = searchTerm.toLowerCase().trim();
    console.log('Performing search for:', searchTerm);
    
    const projectCards = document.querySelectorAll('.project-card');
    console.log('Found project cards:', projectCards.length);
    
    if (projectCards.length === 0) {
        console.log('No project cards found to search');
        return;
    }
    
    let visibleCount = 0;
    
    projectCards.forEach((card, index) => {
        const titleElement = card.querySelector('.card-title');
        const descElement = card.querySelector('.project-description');
        const tagElements = card.querySelectorAll('.tag');
        
        const projectTitle = titleElement ? titleElement.textContent.toLowerCase() : '';
        const projectDesc = descElement ? descElement.textContent.toLowerCase() : '';
        const projectTags = tagElements ? Array.from(tagElements).map(tag => tag.textContent.toLowerCase()).join(' ') : '';
        
        const searchText = `${projectTitle} ${projectDesc} ${projectTags}`.trim();
        
        console.log(`Card ${index + 1}: Title="${projectTitle}", Desc="${projectDesc}", Tags="${projectTags}"`);
        
        let matches = false;
        if (searchTerm === '' || searchTerm.length === 0) {
            matches = true;
        } else {
            matches = searchText.includes(searchTerm);
        }
        
        console.log(`Search term: "${searchTerm}", Search text: "${searchText}", Matches: ${matches}`);
        
        if (matches) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    console.log(`Total visible cards: ${visibleCount}`);
    
    // Handle empty search results
    const existingEmptyState = document.querySelector('.search-empty-state');
    if (searchTerm !== '' && visibleCount === 0) {
        if (!existingEmptyState) {
            const projectsGrid = document.querySelector('.projects-grid');
            if (projectsGrid) {
                const emptyStateDiv = document.createElement('div');
                emptyStateDiv.className = 'search-empty-state empty-state';
                emptyStateDiv.innerHTML = `
                    <div class="empty-icon">🔍</div>
                    <h3>No Projects Found</h3>
                    <p>No projects match your search for "${searchTerm}"</p>
                    <button class="btn-secondary" onclick="clearSearch()">Clear Search</button>
                `;
                projectsGrid.appendChild(emptyStateDiv);
            }
        }
    } else if (existingEmptyState) {
        existingEmptyState.remove();
    }
}

// Helper function to clear search
function clearSearch() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.value = '';
        performSearch('');
    }
}

// Sidebar collapse functionality
function initializeSidebarCollapse() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const hamburgerBtn = document.getElementById('hamburger-menu');
    
    if (!hamburgerBtn || !sidebar || !mainContent) return;
    
    // Create mobile overlay if it doesn't exist
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }
    
    function toggleSidebar() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Mobile: toggle show class and overlay
            const isVisible = sidebar.classList.contains('show');
            if (isVisible) {
                sidebar.classList.remove('show');
                overlay.classList.remove('show');
                hamburgerBtn.classList.remove('active');
                document.body.style.overflow = '';
            } else {
                sidebar.classList.add('show');
                overlay.classList.add('show');
                hamburgerBtn.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent body scroll
            }
        } else {
            // Desktop: toggle collapsed class
            const isCollapsed = sidebar.classList.contains('collapsed');
            if (isCollapsed) {
                sidebar.classList.remove('collapsed');
                mainContent.classList.remove('sidebar-collapsed');
                hamburgerBtn.classList.remove('active');
                localStorage.setItem('sidebarCollapsed', 'false');
            } else {
                sidebar.classList.add('collapsed');
                mainContent.classList.add('sidebar-collapsed');
                hamburgerBtn.classList.add('active');
                localStorage.setItem('sidebarCollapsed', 'true');
            }
        }
    }
    
    function closeSidebar() {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
        hamburgerBtn.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    hamburgerBtn.addEventListener('click', toggleSidebar);
    
    // Close sidebar when clicking overlay on mobile
    overlay.addEventListener('click', function() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            closeSidebar();
        }
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile && !sidebar.contains(e.target) && !hamburgerBtn.contains(e.target) && !overlay.contains(e.target)) {
            closeSidebar();
        }
    });
    
    // Close sidebar when pressing Escape key on mobile
    document.addEventListener('keydown', function(e) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile && e.key === 'Escape' && sidebar.classList.contains('show')) {
            closeSidebar();
        }
    });
    
    // Close sidebar when clicking nav items on mobile
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                closeSidebar();
            }
        });
    });
    
    // Set initial state based on screen size and localStorage
    function setSidebarState() {
        const isMobile = window.innerWidth <= 768;
        const savedState = localStorage.getItem('sidebarCollapsed');
        
        // Clear all classes first
        sidebar.classList.remove('collapsed', 'show');
        mainContent.classList.remove('sidebar-collapsed');
        hamburgerBtn.classList.remove('active');
        overlay.classList.remove('show');
        document.body.style.overflow = '';
        
        if (isMobile) {
            // Mobile: sidebar hidden by default
            mainContent.classList.add('sidebar-collapsed');
        } else if (savedState === 'true') {
            // Desktop: check saved preference
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
            hamburgerBtn.classList.add('active');
        }
    }
    
    // Initial setup
    setSidebarState();
    
    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            setSidebarState();
            // Force close sidebar on resize to desktop to prevent issues
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) {
                closeSidebar();
            }
        }, 250);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    // Animate sidebar items
    anime({
        targets: '.nav-item',
        translateX: [-20, 0],
        opacity: [0, 1],
        delay: anime.stagger(100),
        duration: 600,
        easing: 'easeOutExpo'
    });

    // Animate project cards
    anime({
        targets: '.project-card',
        scale: [0.8, 1],
        opacity: [0, 1],
        delay: anime.stagger(150, {start: 300}),
        duration: 800,
        easing: 'easeOutExpo'
    });

    // Animate content header
    anime({
        targets: '.content-header',
        translateY: [-30, 0],
        opacity: [0, 1],
        duration: 600,
        easing: 'easeOutExpo'
    });

    // Check for Flask-flashed messages
    const flashMsgEls = document.querySelectorAll('.flash-raw');
    flashMsgEls.forEach(el => {
        showToast(el.textContent, el.dataset.type);
        el.remove();
    });

    // Theme toggle logic
    const toggleBtn = document.getElementById('theme-toggle');
    if(toggleBtn){
        toggleBtn.addEventListener('click', () => {
            fetch('/toggle_theme', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    document.documentElement.setAttribute('data-theme', data.theme);
                    document.body.className = data.theme;
                    
                    // Animate theme change
                    anime({
                        targets: 'body',
                        duration: 300,
                        easing: 'easeInOutQuad'
                    });
                });
        });
    }

    // Add click handlers to nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelector('.nav-item.active')?.classList.remove('active');
            this.classList.add('active');
        });
    });
    
    // Initialize features
    initializeProjectSearch();
    initializeSidebarCollapse();
    initializeProfileDropdown();
    initNotifications();
});
