// Task status update function
async function updateTaskStatus(taskId, status) {
    try {
        const response = await fetch('/update_task_status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                task_id: taskId,
                status: status
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            // Update the task item visually
            const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskItem) {
                // Update status class
                taskItem.className = taskItem.className.replace(/status-\w+/, `status-${status}`);
                
                // Update checkbox state
                const checkbox = taskItem.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = status === 'done';
                }
                
                // Update status button text
                const statusBtn = taskItem.querySelector('.status-btn');
                if (statusBtn) {
                    const statusText = {
                        'todo': '📝 To Do',
                        'in_progress': '🔄 In Progress',
                        'done': '✅ Done'
                    };
                    statusBtn.textContent = statusText[status] || statusText['todo'];
                }
                
                // Update task title styling for completed tasks
                const taskTitle = taskItem.querySelector('.task-title');
                if (taskTitle) {
                    if (status === 'done') {
                        taskTitle.style.textDecoration = 'line-through';
                        taskItem.style.opacity = '0.7';
                    } else {
                        taskTitle.style.textDecoration = 'none';
                        taskItem.style.opacity = '1';
                    }
                }
            }
            
            // Update header stats
            updateTaskStats();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating task status:', error);
        showToast('Error updating task. Please try again.', 'error');
    }
}

// Show status menu
let currentTaskId = null;
let statusMenu = null;

function showStatusMenu(taskId, currentStatus) {
    currentTaskId = taskId;
    
    // Remove existing menu
    if (statusMenu) {
        statusMenu.remove();
    }
    
    // Create status menu
    statusMenu = document.getElementById('statusMenu');
    if (!statusMenu) return;
    
    // Position the menu
    const statusBtn = event.target;
    const rect = statusBtn.getBoundingClientRect();
    
    statusMenu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    statusMenu.style.left = `${rect.left + window.scrollX}px`;
    statusMenu.style.display = 'block';
    
    // Update active status option
    const statusOptions = statusMenu.querySelectorAll('.status-option');
    statusOptions.forEach(option => {
        option.classList.remove('active');
        if (option.getAttribute('data-status') === currentStatus) {
            option.classList.add('active');
        }
    });
}

// Status menu click handlers
document.addEventListener('DOMContentLoaded', function() {
    const statusOptions = document.querySelectorAll('.status-option');
    
    statusOptions.forEach(option => {
        option.addEventListener('click', function() {
            const newStatus = this.getAttribute('data-status');
            if (currentTaskId && newStatus) {
                updateTaskStatus(currentTaskId, newStatus);
                hideStatusMenu();
            }
        });
    });
});

// Hide status menu
function hideStatusMenu() {
    const statusMenu = document.getElementById('statusMenu');
    if (statusMenu) {
        statusMenu.style.display = 'none';
    }
    currentTaskId = null;
}

// Update task statistics in header
function updateTaskStats() {
    const taskItems = document.querySelectorAll('.task-item');
    
    let todoCount = 0;
    let inProgressCount = 0;
    let doneCount = 0;
    
    taskItems.forEach(item => {
        if (item.classList.contains('status-todo')) {
            todoCount++;
        } else if (item.classList.contains('status-in_progress')) {
            inProgressCount++;
        } else if (item.classList.contains('status-done')) {
            doneCount++;
        }
    });
    
    // Update stat numbers
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length >= 3) {
        statNumbers[0].textContent = todoCount;
        statNumbers[1].textContent = inProgressCount;
        statNumbers[2].textContent = doneCount;
    }
}

// Click outside to close status menu
document.addEventListener('click', function(e) {
    const statusMenu = document.getElementById('statusMenu');
    const statusBtn = e.target.closest('.status-btn');
    
    if (statusMenu && statusMenu.style.display === 'block' && !statusBtn && !statusMenu.contains(e.target)) {
        hideStatusMenu();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape to close status menu
    if (e.key === 'Escape') {
        hideStatusMenu();
    }
    
    // Quick status updates with keyboard shortcuts
    if (e.target.closest('.task-item')) {
        const taskItem = e.target.closest('.task-item');
        const taskId = taskItem.getAttribute('data-task-id');
        
        if (taskId) {
            switch (e.key) {
                case '1':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        updateTaskStatus(taskId, 'todo');
                    }
                    break;
                case '2':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        updateTaskStatus(taskId, 'in_progress');
                    }
                    break;
                case '3':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        updateTaskStatus(taskId, 'done');
                    }
                    break;
            }
        }
    }
});

// Task item interactions
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects and click handlers
    const taskItems = document.querySelectorAll('.task-item');
    
    taskItems.forEach(item => {
        // Focus on task item when clicked (for keyboard shortcuts)
        item.addEventListener('click', function(e) {
            // Don't focus if clicking on interactive elements
            if (!e.target.closest('input, button, .status-btn')) {
                this.setAttribute('tabindex', '0');
                this.focus();
            }
        });
        
        // Make task items keyboard accessible
        item.setAttribute('tabindex', '0');
        
        item.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                const checkbox = this.querySelector('input[type="checkbox"]');
                if (checkbox && e.target === this) {
                    e.preventDefault();
                    checkbox.click();
                }
            }
        });
    });
});

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Update initial stats
    updateTaskStats();
    
    // Add smooth animations to task items
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach((item, index) => {
        item.style.animationDelay = `${index * 50}ms`;
        item.classList.add('fade-in-up');
    });
});

// CSS animation class (add to CSS if not already present)
const style = document.createElement('style');
style.textContent = `
    .fade-in-up {
        animation: fadeInUp 0.3s ease-out forwards;
        opacity: 0;
        transform: translateY(20px);
    }
    
    @keyframes fadeInUp {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
