// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabHeaders = document.querySelectorAll('.tab-header');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Remove active class from all headers and contents
            tabHeaders.forEach(h => h.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked header and corresponding content
            this.classList.add('active');
            document.getElementById(tabName + '-tab').classList.add('active');
        });
    });
});

// Modal functions
function showCreateTaskModal() {
    document.getElementById('createTaskModal').style.display = 'block';
}

function hideCreateTaskModal() {
    const modal = document.getElementById('createTaskModal');
    const form = document.getElementById('createTaskForm');
    const modalTitle = modal.querySelector('.modal-header h3');
    const submitButton = modal.querySelector('.btn-save');
    
    modal.style.display = 'none';
    form.reset();
    
    // Reset modal to create mode
    modalTitle.textContent = 'Create New Task';
    submitButton.textContent = 'Create Task';
    delete form.dataset.editingTaskId;
}

function showAddMemberModal() {
    document.getElementById('addMemberModal').style.display = 'block';
}

function hideAddMemberModal() {
    document.getElementById('addMemberModal').style.display = 'none';
    document.getElementById('addMemberForm').reset();
}

// Task Context Menu
function showTaskMenu(event, taskId) {
    event.preventDefault();
    event.stopPropagation();
    
    currentTaskId = taskId;
    const contextMenu = document.getElementById('taskContextMenu');
    
    if (!contextMenu) return;
    
    // Position the menu
    const rect = event.target.getBoundingClientRect();
    
    contextMenu.style.left = `${rect.right + window.scrollX - 180}px`;
    contextMenu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    contextMenu.style.display = 'block';
    
    // Adjust position if menu goes off screen
    setTimeout(() => {
        const menuRect = contextMenu.getBoundingClientRect();
        
        if (menuRect.right > window.innerWidth) {
            contextMenu.style.left = `${rect.left + window.scrollX - 180}px`;
        }
        
        if (menuRect.bottom > window.innerHeight) {
            contextMenu.style.top = `${rect.top + window.scrollY - menuRect.height - 5}px`;
        }
    }, 0);
}

function hideTaskMenu() {
    const contextMenu = document.getElementById('taskContextMenu');
    
    if (contextMenu) {
        contextMenu.style.display = 'none';
    }
    currentTaskId = null;
}

function initializeTaskContextMenu() {
    const contextMenu = document.getElementById('taskContextMenu');
    
    if (!contextMenu) return;
    
    // Handle menu item clicks
    contextMenu.addEventListener('click', function(e) {
        const menuItem = e.target.closest('.task-menu-item');
        if (!menuItem || !currentTaskId) return;
        
        const action = menuItem.getAttribute('data-action');
        handleTaskMenuAction(action, currentTaskId);
        hideTaskMenu();
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!contextMenu.contains(e.target) && !e.target.closest('.task-menu')) {
            hideTaskMenu();
        }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideTaskMenu();
        }
    });
}


function handleTaskMenuAction(action, taskId) {
    switch (action) {
        case 'edit':
            editTask(taskId);
            break;
        case 'move-todo':
            updateTaskStatus(taskId, 'todo');
            break;
        case 'move-progress':
            updateTaskStatus(taskId, 'in_progress');
            break;
        case 'move-done':
            updateTaskStatus(taskId, 'done');
            break;
        case 'delete':
            deleteTask(taskId);
            break;
        default:
            console.log('Unknown action:', action);
    }
}

// Task form submission (handles both create and edit)
if (document.getElementById('createTaskForm')) {
    document.getElementById('createTaskForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const isEditing = this.dataset.editingTaskId;
        
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            project_id: formData.get('project_id'),
            assigned_to: formData.get('assigned_to') || null,
            priority: formData.get('priority'),
            due_date: formData.get('due_date') || null
        };
        
        // Add task_id for editing
        if (isEditing) {
            taskData.task_id = parseInt(isEditing);
        }
        
        try {
            const url = isEditing ? '/update_task' : '/create_task';
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast(result.message, 'success');
                hideCreateTaskModal();
                
                if (isEditing) {
                    // For editing, refresh to show changes
                    window.location.reload();
                } else {
                    // For new tasks, refresh the page to show changes
                    window.location.reload();
                }
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error saving task:', error);
            showToast('Error saving task. Please try again.', 'error');
        }
    });
}

// Add member form submission
if (document.getElementById('addMemberForm')) {
    document.getElementById('addMemberForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const memberData = {
            project_id: formData.get('project_id'),
            email: formData.get('email')
        };
        
        try {
            const response = await fetch('/add_project_member', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(memberData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Show appropriate message based on whether it's a new user
                if (result.message.includes('New user profile created')) {
                    showToast(result.message, 'success', 8000); // Show longer for important info
                } else {
                    showToast(result.message, 'success');
                }
                hideAddMemberModal();
                // Refresh the page to show the new member
                setTimeout(() => {
                    window.location.reload();
                }, 1000); // Small delay to let user read the message
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error adding member:', error);
            showToast('Error adding member. Please try again.', 'error');
        }
    });
}

// Message form submission
if (document.getElementById('messageForm')) {
    document.getElementById('messageForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const messageData = {
            project_id: formData.get('project_id'),
            content: formData.get('content')
        };
        
        try {
            const response = await fetch('/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messageData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Clear the input
                const contentInput = e.target.querySelector('input[name="content"]');
                const content = contentInput.value;
                contentInput.value = '';
                
                // Add message to the DOM immediately
                addMessageToDOM(content);
                
                // Switch to messages tab
                switchToMessagesTab();
                
                // Show success message
                showToast(result.message, 'success');
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Error sending message. Please try again.', 'error');
        }
    });
}

// Function to add message to DOM
function addMessageToDOM(content) {
    const messagesList = document.getElementById('messagesList');
    const currentUser = getCurrentUserInfo();
    
    // Create new message element
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-item new-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <div class="avatar-circle">${currentUser.initials}</div>
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${currentUser.displayName}</span>
                <span class="message-time">Just now</span>
            </div>
            <div class="message-text">${content}</div>
        </div>
    `;
    
    // Insert at the top of the messages list
    messagesList.insertBefore(messageDiv, messagesList.firstChild);
    
    // Remove animation class after animation completes
    setTimeout(() => {
        messageDiv.classList.remove('new-message');
    }, 300);
    
    // Scroll to show the new message
    messagesList.scrollTop = 0;
}

// Function to get current user info from the page
function getCurrentUserInfo() {
    const profileName = document.querySelector('.profile-name');
    const profileEmail = document.querySelector('.profile-email');
    const avatarCircle = document.querySelector('.profile-avatar .avatar-circle');
    
    return {
        displayName: profileName ? profileName.textContent.trim() : 'You',
        email: profileEmail ? profileEmail.textContent.trim() : '',
        initials: avatarCircle ? avatarCircle.textContent.trim() : 'U'
    };
}

// Function to switch to messages tab
function switchToMessagesTab() {
    const messagesTabHeader = document.querySelector('.tab-header[data-tab="messages"]');
    const messagesTabContent = document.getElementById('messages-tab');
    
    if (messagesTabHeader && messagesTabContent) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-header').forEach(header => header.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to messages tab
        messagesTabHeader.classList.add('active');
        messagesTabContent.classList.add('active');
    }
}

// Drag and Drop Functionality
let draggedTask = null;
let currentTaskId = null;

// Add event listeners for drag and drop
document.addEventListener('DOMContentLoaded', function() {
    initializeDragAndDrop();
    initializeTaskContextMenu();
});

function initializeDragAndDrop() {
    const taskCards = document.querySelectorAll('.task-card');
    const taskLists = document.querySelectorAll('.task-list');
    
    // Add event listeners to task cards
    taskCards.forEach(card => {
        // Ensure draggable attribute is set
        card.setAttribute('draggable', 'true');
        
        // Add listeners (modern approach with once: false)
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
    
    // Add event listeners to task lists
    taskLists.forEach(list => {
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('drop', handleDrop);
        list.addEventListener('dragenter', handleDragEnter);
        list.addEventListener('dragleave', handleDragLeave);
    });
}


function handleDragStart(e) {
    draggedTask = this;
    this.classList.add('dragging');
    
    // Store task data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
    e.dataTransfer.setData('text/plain', this.getAttribute('data-task-id'));
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedTask = null;
    
    // Remove drag over effects
    document.querySelectorAll('.task-list').forEach(list => {
        list.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedTask !== this && draggedTask) {
        const taskId = draggedTask.getAttribute('data-task-id');
        const newStatus = this.getAttribute('data-status');
        const currentStatus = draggedTask.getAttribute('data-task-status');
        
        if (newStatus !== currentStatus) {
            updateTaskStatus(taskId, newStatus);
        }
    }
    
    this.classList.remove('drag-over');
    return false;
}

// Update task status function
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
            // Refresh the page to show the updated task
            window.location.reload();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating task status:', error);
        showToast('Error updating task. Please try again.', 'error');
    }
}

// Auto-scroll messages to bottom
if (document.getElementById('messagesList')) {
    const messagesList = document.getElementById('messagesList');
    messagesList.scrollTop = messagesList.scrollHeight;
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const createTaskModal = document.getElementById('createTaskModal');
    const addMemberModal = document.getElementById('addMemberModal');
    
    if (event.target === createTaskModal) {
        hideCreateTaskModal();
    }
    if (event.target === addMemberModal) {
        hideAddMemberModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to submit forms
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeElement = document.activeElement;
        
        // If in message input, submit message
        if (activeElement && activeElement.classList.contains('message-input')) {
            const form = activeElement.closest('form');
            if (form) {
                form.requestSubmit();
            }
        }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        hideCreateTaskModal();
        hideAddMemberModal();
        hideTaskMenu();
    }
});

// Task priority update function
async function updateTaskPriority(taskId, priority) {
    try {
        const response = await fetch('/update_task_priority', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                task_id: taskId,
                priority: priority
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            // Refresh to show updated priority
            window.location.reload();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating task priority:', error);
        showToast('Error updating task priority. Please try again.', 'error');
    }
}

// Task deletion function
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('/delete_task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                task_id: taskId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            // Remove task from UI immediately
            const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskCard) {
                taskCard.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => {
                    taskCard.remove();
                    // Update task counts
                    updateTaskCounts();
                }, 300);
            }
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        showToast('Error deleting task. Please try again.', 'error');
    }
}

// Task editing function
async function editTask(taskId) {
    try {
        // Fetch task details
        const response = await fetch(`/get_task/${taskId}`);
        const result = await response.json();
        
        if (result.success) {
            // Populate the modal with task data
            populateTaskModal(result.task);
            // Show the modal in edit mode
            showEditTaskModal();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error fetching task details:', error);
        showToast('Error loading task details. Please try again.', 'error');
    }
}

// Populate task modal with existing data
function populateTaskModal(task) {
    const form = document.getElementById('createTaskForm');
    if (!form) return;
    
    // Set form values
    form.querySelector('input[name="title"]').value = task.title || '';
    form.querySelector('textarea[name="description"]').value = task.description || '';
    form.querySelector('select[name="assigned_to"]').value = task.assigned_to || '';
    form.querySelector('select[name="priority"]').value = task.priority || 'medium';
    form.querySelector('input[name="due_date"]').value = task.due_date || '';
    
    // Store task ID for updating
    form.dataset.editingTaskId = task.id;
}

// Show modal in edit mode
function showEditTaskModal() {
    const modal = document.getElementById('createTaskModal');
    const modalTitle = modal.querySelector('.modal-header h3');
    const submitButton = modal.querySelector('.btn-save');
    
    // Update modal title and button text
    modalTitle.textContent = 'Edit Task';
    submitButton.textContent = 'Update Task';
    
    // Show the modal
    modal.style.display = 'block';
}

// Update task counts in column headers
function updateTaskCounts() {
    const columns = document.querySelectorAll('.task-column');
    
    columns.forEach(column => {
        const taskCount = column.querySelectorAll('.task-card').length;
        const countElement = column.querySelector('.task-count');
        if (countElement) {
            countElement.textContent = taskCount;
        }
    });
}
