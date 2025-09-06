import sqlite3
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from datetime import datetime, date
from werkzeug.security import check_password_hash, generate_password_hash
import re

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

def validate_gmail_format(email):
    """Basic Gmail format validation only"""
    if not email.endswith('@gmail.com'):
        return False, "Only Gmail addresses (@gmail.com) are allowed"
    
    # Basic format validation for Gmail
    email_pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@gmail\.com$'
    if not re.match(email_pattern, email):
        return False, "Invalid Gmail address format"
    
    # Check for common invalid patterns
    local_part = email.split('@')[0]
    
    # Gmail rules: can't start or end with dots, can't have consecutive dots
    if local_part.startswith('.') or local_part.endswith('.') or '..' in local_part:
        return False, "Invalid Gmail address format"
    
    # Check minimum length (Gmail requires at least 6 characters before @)
    if len(local_part) < 6:
        return False, "Gmail address must have at least 6 characters before @"
    
    return True, "Valid Gmail address format"

DATABASE = 'users.db'

def init_db():
    with sqlite3.connect(DATABASE) as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT,
            last_name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            display_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        conn.execute('''CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            color TEXT DEFAULT 'blue',
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'active',
            FOREIGN KEY (created_by) REFERENCES users (id)
        )''')
        
        conn.execute('''CREATE TABLE IF NOT EXISTS project_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            user_id INTEGER,
            role TEXT DEFAULT 'member',
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(project_id, user_id)
        )''')
        
        conn.execute('''CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            project_id INTEGER,
            assigned_to INTEGER,
            created_by INTEGER,
            status TEXT DEFAULT 'todo',
            priority TEXT DEFAULT 'medium',
            due_date DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id),
            FOREIGN KEY (assigned_to) REFERENCES users (id),
            FOREIGN KEY (created_by) REFERENCES users (id)
        )''')
        
        conn.execute('''CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            task_id INTEGER,
            user_id INTEGER,
            content TEXT NOT NULL,
            message_type TEXT DEFAULT 'text',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id),
            FOREIGN KEY (task_id) REFERENCES tasks (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )''')
        
        conn.execute('''CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info',
            read BOOLEAN DEFAULT 0,
            project_id INTEGER,
            task_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (project_id) REFERENCES projects (id),
            FOREIGN KEY (task_id) REFERENCES tasks (id)
        )''')
        
        conn.execute('''CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            notifications_enabled BOOLEAN DEFAULT 1,
            email_notifications BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )''')

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

init_db()

@app.route('/')
def home():
    theme = session.get('theme', 'dark')
    user = session.get('user')
    
    if user:
        return redirect(url_for('dashboard'))
    
    return render_template('home.html', theme=theme, user=user)

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        flash('Please log in to access dashboard.', 'error')
        return redirect(url_for('login'))
    
    theme = session.get('theme', 'dark')
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Get user's projects
    projects = conn.execute('''
        SELECT p.*, u.display_name as creator_name, 
               COUNT(DISTINCT t.id) as task_count,
               COUNT(DISTINCT pm.user_id) as member_count
        FROM projects p
        JOIN users u ON p.created_by = u.id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        LEFT JOIN tasks t ON p.id = t.project_id
        WHERE p.id IN (
            SELECT project_id FROM project_members WHERE user_id = ?
        ) OR p.created_by = ?
        GROUP BY p.id, p.name, p.description, p.color, p.created_by, p.created_at, p.updated_at, p.status, u.display_name
        ORDER BY p.updated_at DESC
    ''', (user_data['id'], user_data['id'])).fetchall()
    
    conn.close()
    
    return render_template('dashboard.html', theme=theme, user_data=user_data, projects=projects)

@app.route('/update_profile', methods=['POST'])
def update_profile():
    if 'user' not in session:
        flash('Please log in first.', 'error')
        return redirect(url_for('login'))
    
    new_name = request.form['display_name'].strip()
    if not new_name:
        flash('Display name cannot be empty.', 'error')
        return redirect(url_for('dashboard'))
    
    conn = get_db_connection()
    conn.execute('UPDATE users SET display_name = ? WHERE email = ?', (new_name, session['user']))
    conn.commit()
    conn.close()
    
    flash('Profile updated successfully!', 'success')
    return redirect(url_for('dashboard'))

@app.route('/about')
def about():
    theme = session.get('theme', 'dark')
    return render_template('about.html', theme=theme)

@app.route('/solutions')
def solutions():
    theme = session.get('theme', 'dark')
    return render_template('solutions.html', theme=theme)

@app.route('/toggle_theme', methods=['POST'])
def toggle_theme():
    current_theme = session.get('theme', 'dark')
    new_theme = 'light' if current_theme == 'dark' else 'dark'
    session['theme'] = new_theme
    return jsonify({'theme': new_theme})

@app.route('/register', methods=['GET', 'POST'])
def register():
    theme = session.get('theme', 'dark')
    if request.method == 'POST':
        fn = request.form['first_name'].strip()
        ln = request.form['last_name'].strip()
        email = request.form['email'].strip().lower()
        password = request.form['password']
        
        if not fn or not ln or not email or not password:
            flash('Please fill out all required fields.', 'error')
            return redirect(url_for('register'))
        
        conn = get_db_connection()
        try:
            display_name = f"{fn} {ln}"
            conn.execute('INSERT INTO users (first_name, last_name, email, password, display_name) VALUES (?, ?, ?, ?, ?)',
                        (fn, ln, email, password, display_name))
            conn.commit()
            flash('Registration complete!', 'success')
            return redirect(url_for('login'))
        except sqlite3.IntegrityError:
            flash('Email already registered.', 'error')
            return redirect(url_for('register'))
        finally:
            conn.close()
    return render_template('register.html', theme=theme)

@app.route('/login', methods=['GET', 'POST'])
def login():
    theme = session.get('theme', 'dark')
    if request.method == 'POST':
        email = request.form['email'].strip().lower()
        password = request.form['password']
        
        if not email or not password:
            flash('Please fill out all required fields.', 'error')
            return redirect(url_for('login'))
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE email = ? AND password = ?', (email, password)).fetchone()
        conn.close()
        
        if user:
            session['user'] = user['email']
            flash('Logged in successfully!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid email or password.', 'error')
            return redirect(url_for('login'))
    return render_template('login.html', theme=theme)

@app.route('/logout')
def logout():
    session.pop('user', None)
    flash('You have logged out.', 'info')
    return redirect(url_for('login'))

# PROJECT MANAGEMENT ROUTES
@app.route('/create_project', methods=['POST'])
def create_project():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    data = request.get_json()
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    color = data.get('color', 'blue')
    
    if not name:
        return jsonify({'success': False, 'message': 'Project name is required'})
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Create project
    cursor = conn.execute(
        'INSERT INTO projects (name, description, color, created_by) VALUES (?, ?, ?, ?)',
        (name, description, color, user_data['id'])
    )
    project_id = cursor.lastrowid
    
    # Add creator as project member with admin role
    conn.execute(
        'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
        (project_id, user_data['id'], 'admin')
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Project created successfully', 'project_id': project_id})

@app.route('/project/<int:project_id>')
def project_detail(project_id):
    if 'user' not in session:
        flash('Please log in to access projects.', 'error')
        return redirect(url_for('login'))
    
    theme = session.get('theme', 'dark')
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Check if user has access to this project
    project = conn.execute('''
        SELECT p.*, u.display_name as creator_name
        FROM projects p
        JOIN users u ON p.created_by = u.id
        WHERE p.id = ? AND (p.id IN (
            SELECT project_id FROM project_members WHERE user_id = ?
        ) OR p.created_by = ?)
    ''', (project_id, user_data['id'], user_data['id'])).fetchone()
    
    if not project:
        flash('Project not found or access denied.', 'error')
        return redirect(url_for('dashboard'))
    
    # Get project tasks
    tasks = conn.execute('''
        SELECT t.*, u1.display_name as assigned_name, u2.display_name as creator_name
        FROM tasks t
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        LEFT JOIN users u2 ON t.created_by = u2.id
        WHERE t.project_id = ?
        ORDER BY t.created_at DESC
    ''', (project_id,)).fetchall()
    
    # Get project members
    members = conn.execute('''
        SELECT pm.*, u.display_name, u.email, u.first_name, u.last_name
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ?
        ORDER BY pm.joined_at ASC
    ''', (project_id,)).fetchall()
    
    # Get recent messages
    messages = conn.execute('''
        SELECT m.*, u.display_name, u.first_name, u.last_name
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.project_id = ?
        ORDER BY m.created_at DESC
        LIMIT 50
    ''', (project_id,)).fetchall()
    
    conn.close()
    
    return render_template('project_detail.html', theme=theme, user_data=user_data, 
                         project=project, tasks=tasks, members=members, messages=messages)

@app.route('/create_task', methods=['POST'])
def create_task():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    data = request.get_json()
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    project_id = data.get('project_id')
    assigned_to = data.get('assigned_to')
    priority = data.get('priority', 'medium')
    due_date = data.get('due_date')
    
    if not title:
        return jsonify({'success': False, 'message': 'Task title is required'})
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Verify user has access to project
    project_access = conn.execute('''
        SELECT 1 FROM projects p WHERE p.id = ? AND (p.id IN (
            SELECT project_id FROM project_members WHERE user_id = ?
        ) OR p.created_by = ?)
    ''', (project_id, user_data['id'], user_data['id'])).fetchone()
    
    if not project_access:
        conn.close()
        return jsonify({'success': False, 'message': 'Access denied'})
    
    # Create task
    cursor = conn.execute('''
        INSERT INTO tasks (title, description, project_id, assigned_to, created_by, priority, due_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (title, description, project_id, assigned_to, user_data['id'], priority, due_date))
    
    task_id = cursor.lastrowid
    
    # Send notification to assigned user (if assigned to someone else)
    if assigned_to and assigned_to != user_data['id']:
        project_name = conn.execute('SELECT name FROM projects WHERE id = ?', (project_id,)).fetchone()['name']
        create_notification(
            assigned_to,
            'New Task Assigned',
            f'You have been assigned a new task "{title}" in project "{project_name}"',
            'info',
            project_id,
            task_id,
            conn
        )
    
    # Check and update project completion status (adding task makes project active)
    new_project_status = check_and_update_project_completion(project_id, conn)
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True, 
        'message': 'Task created successfully',
        'task_id': task_id
    })

@app.route('/update_task_status', methods=['POST'])
def update_task_status():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    data = request.get_json()
    task_id = data.get('task_id')
    status = data.get('status')
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Verify user has access to this task's project and get project_id
    task_info = conn.execute('''
        SELECT t.id, t.project_id FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = ? AND (p.id IN (
            SELECT project_id FROM project_members WHERE user_id = ?
        ) OR p.created_by = ?)
    ''', (task_id, user_data['id'], user_data['id'])).fetchone()
    
    if not task_info:
        conn.close()
        return jsonify({'success': False, 'message': 'Access denied'})
    
    project_id = task_info['project_id']
    
    # Update task status
    conn.execute(
        'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        (status, task_id)
    )
    
    # Check and update project completion status
    new_project_status = check_and_update_project_completion(project_id, conn)
    
    conn.commit()
    conn.close()
    
    # Prepare response message
    message = 'Task status updated'
    if new_project_status == 'completed':
        message += ' - Project marked as completed! 🎉'
    elif new_project_status == 'active':
        message += ' - Project is now active again'
    
    return jsonify({'success': True, 'message': message})

@app.route('/add_project_member', methods=['POST'])
def add_project_member():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    data = request.get_json()
    project_id = data.get('project_id')
    email = data.get('email', '').strip().lower()
    
    if not email:
        return jsonify({'success': False, 'message': 'Email is required'})
    
    # Validate Gmail address format
    is_valid, validation_message = validate_gmail_format(email)
    if not is_valid:
        return jsonify({'success': False, 'message': validation_message})
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Verify user is admin of this project or project creator
    admin_access = conn.execute('''
        SELECT 1 FROM projects p 
        LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
        WHERE p.id = ? AND (p.created_by = ? OR pm.role = 'admin')
    ''', (user_data['id'], project_id, user_data['id'])).fetchone()
    
    if not admin_access:
        conn.close()
        return jsonify({'success': False, 'message': 'Only project creators and admins can add members'})
    
    # Find or create user
    new_member = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    
    if not new_member:
        # Create a new user profile automatically
        # Extract name from email (before @ symbol)
        email_name = email.split('@')[0]
        # Clean up the name (replace dots, underscores with spaces and capitalize)
        display_name = email_name.replace('.', ' ').replace('_', ' ').title()
        
        # Split into first and last name (best guess)
        name_parts = display_name.split()
        first_name = name_parts[0] if name_parts else 'User'
        last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
        
        # Create user with a default password (they can change it when they log in)
        default_password = 'welcome123'  # In production, you'd generate a secure temporary password
        
        try:
            cursor = conn.execute('''
                INSERT INTO users (first_name, last_name, email, password, display_name) 
                VALUES (?, ?, ?, ?, ?)
            ''', (first_name, last_name, email, default_password, display_name))
            
            new_user_id = cursor.lastrowid
            
            # Initialize user settings for new user
            conn.execute('''
                INSERT INTO user_settings (user_id, notifications_enabled, email_notifications) 
                VALUES (?, 1, 1)
            ''', (new_user_id,))
            
        except sqlite3.IntegrityError:
            # User was created between our check and now
            new_member = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
            new_user_id = new_member['id']
    else:
        new_user_id = new_member['id']
    
    # Check if already a member
    existing_member = conn.execute(
        'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?',
        (project_id, new_user_id)
    ).fetchone()
    
    if existing_member:
        conn.close()
        return jsonify({'success': False, 'message': 'User is already a project member'})
    
    # Get project name before we close the connection
    project_name = conn.execute('SELECT name FROM projects WHERE id = ?', (project_id,)).fetchone()['name']
    
    # Add member to project
    conn.execute(
        'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
        (project_id, new_user_id, 'member')
    )
    
    conn.commit()
    conn.close()
    
    # Send notification to the new member
    if not new_member:
        # New user created
        create_notification(
            new_user_id,
            'Welcome to Synergy!',
            f'You have been added to the project "{project_name}". You can log in with your email and password: welcome123',
            'success',
            project_id
        )
        return jsonify({
            'success': True, 
            'message': f'New user profile created for {email} and added to project. They can log in with email: {email} and password: welcome123'
        })
    else:
        # Existing user added
        create_notification(
            new_user_id,
            'Added to Project',
            f'You have been added to the project "{project_name}"',
            'info',
            project_id
        )
        return jsonify({'success': True, 'message': 'Member added successfully'})

@app.route('/send_message', methods=['POST'])
def send_message():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'No data received'})
        
    project_id = data.get('project_id')
    content = data.get('content', '').strip()
    task_id = data.get('task_id')  # Optional, for task-specific messages
    
    if not project_id:
        return jsonify({'success': False, 'message': 'Project ID is required'})
        
    if not content:
        return jsonify({'success': False, 'message': 'Message content is required'})
    
    try:
        conn = get_db_connection()
        user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
        
        if not user_data:
            conn.close()
            return jsonify({'success': False, 'message': 'User not found'})
        
        # Verify user has access to project
        project_access = conn.execute('''
            SELECT 1 FROM projects p WHERE p.id = ? AND (p.id IN (
                SELECT project_id FROM project_members WHERE user_id = ?
            ) OR p.created_by = ?)
        ''', (project_id, user_data['id'], user_data['id'])).fetchone()
        
        if not project_access:
            conn.close()
            return jsonify({'success': False, 'message': 'Access denied'})
        
        # Send message
        conn.execute('''
            INSERT INTO messages (project_id, task_id, user_id, content)
            VALUES (?, ?, ?, ?)
        ''', (project_id, task_id, user_data['id'], content))
        
        # Send notifications to all project members (except the sender)
        project_members = conn.execute('''
            SELECT DISTINCT u.id, u.display_name
            FROM users u
            JOIN project_members pm ON u.id = pm.user_id
            WHERE pm.project_id = ? AND u.id != ?
        ''', (project_id, user_data['id'])).fetchall()
        
        project_name = conn.execute('SELECT name FROM projects WHERE id = ?', (project_id,)).fetchone()['name']
        sender_name = user_data['display_name'] or f"{user_data['first_name']} {user_data['last_name']}"
        
        
        # Create notifications for all project members
        for member in project_members:
            if task_id:
                # Task-specific message
                task_title = conn.execute('SELECT title FROM tasks WHERE id = ?', (task_id,)).fetchone()['title']
                create_notification(
                    member['id'],
                    'New Message',
                    f'{sender_name} posted a message in task "{task_title}" (Project: {project_name})',
                    'info',
                    project_id,
                    task_id,
                    conn
                )
            else:
                # Project-level message
                create_notification(
                    member['id'],
                    'New Message',
                    f'{sender_name} posted a message in project "{project_name}"',
                    'info',
                    project_id,
                    None,
                    conn
                )
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Message sent successfully'})
        
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        return jsonify({'success': False, 'message': f'Error sending message: {str(e)}'})

@app.route('/my_tasks')
def my_tasks():
    if 'user' not in session:
        flash('Please log in to access your tasks.', 'error')
        return redirect(url_for('login'))
    
    theme = session.get('theme', 'dark')
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Get user's assigned tasks
    tasks = conn.execute('''
        SELECT t.*, p.name as project_name, u.display_name as creator_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.assigned_to = ?
        ORDER BY 
            CASE t.status 
                WHEN 'todo' THEN 1
                WHEN 'in_progress' THEN 2
                WHEN 'done' THEN 3
                ELSE 4
            END,
            t.due_date ASC,
            t.created_at DESC
    ''', (user_data['id'],)).fetchall()
    
    conn.close()
    
    return render_template('my_tasks.html', theme=theme, user_data=user_data, tasks=tasks, date=date)

@app.route('/team')
def team_overview():
    if 'user' not in session:
        flash('Please log in to access team overview.', 'error')
        return redirect(url_for('login'))
    
    theme = session.get('theme', 'dark')
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Get all projects the user has access to
    user_projects = conn.execute('''
        SELECT DISTINCT p.id, p.name
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE p.created_by = ? OR pm.user_id = ?
        ORDER BY p.name
    ''', (user_data['id'], user_data['id'])).fetchall()
    
    # Get all team members from these projects with their task counts (only Gmail users)
    team_members = conn.execute('''
        SELECT DISTINCT 
            u.id,
            u.first_name,
            u.last_name,
            u.display_name,
            u.email,
            COUNT(DISTINCT pm.project_id) as project_count,
            COUNT(DISTINCT CASE WHEN t.status = 'todo' THEN t.id END) as todo_tasks,
            COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
            COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as done_tasks,
            COUNT(DISTINCT t.id) as total_tasks
        FROM users u
        JOIN project_members pm ON u.id = pm.user_id
        JOIN projects p ON pm.project_id = p.id
        LEFT JOIN tasks t ON u.id = t.assigned_to AND t.project_id = p.id
        WHERE p.id IN (
            SELECT DISTINCT p2.id
            FROM projects p2
            LEFT JOIN project_members pm2 ON p2.id = pm2.project_id
            WHERE p2.created_by = ? OR pm2.user_id = ?
        )
        AND u.email LIKE '%@gmail.com'
        GROUP BY u.id, u.first_name, u.last_name, u.display_name, u.email
        ORDER BY u.display_name
    ''', (user_data['id'], user_data['id'])).fetchall()
    
    # Get detailed tasks for each member (recent tasks) - only for Gmail users
    member_tasks = {}
    member_projects = {}
    member_remove_permissions = {}
    
    for member in team_members:
        # Additional check to ensure member has Gmail (double safety)
        if not member['email'].endswith('@gmail.com'):
            continue
            
        tasks = conn.execute('''
            SELECT 
                t.id,
                t.title,
                t.status,
                t.priority,
                t.due_date,
                p.name as project_name,
                p.color as project_color
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            JOIN users u ON t.assigned_to = u.id
            WHERE t.assigned_to = ?
                AND u.email LIKE '%@gmail.com'
                AND p.id IN (
                    SELECT DISTINCT p2.id
                    FROM projects p2
                    LEFT JOIN project_members pm2 ON p2.id = pm2.project_id
                    WHERE p2.created_by = ? OR pm2.user_id = ?
                )
            ORDER BY 
                CASE t.status 
                    WHEN 'todo' THEN 1
                    WHEN 'in_progress' THEN 2
                    WHEN 'done' THEN 3
                    ELSE 4
                END,
                t.due_date ASC,
                t.created_at DESC
            LIMIT 5
        ''', (member['id'], user_data['id'], user_data['id'])).fetchall()
        member_tasks[member['id']] = tasks
        
        # Get projects where this member can be removed by current user
        removable_projects = conn.execute('''
            SELECT DISTINCT p.id, p.name
            FROM projects p
            JOIN project_members pm ON p.id = pm.project_id
            LEFT JOIN project_members pm2 ON p.id = pm2.project_id AND pm2.user_id = ?
            WHERE pm.user_id = ?
                AND p.created_by != ?
                AND (p.created_by = ? OR pm2.role = 'admin')
            ORDER BY p.name
        ''', (user_data['id'], member['id'], member['id'], user_data['id'])).fetchall()
        
        member_remove_permissions[member['id']] = removable_projects
        
        # Get all projects this member belongs to
        projects = conn.execute('''
            SELECT p.id, p.name, p.color
            FROM projects p
            JOIN project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = ?
                AND p.id IN (
                    SELECT DISTINCT p2.id
                    FROM projects p2
                    LEFT JOIN project_members pm2 ON p2.id = pm2.project_id
                    WHERE p2.created_by = ? OR pm2.user_id = ?
                )
            ORDER BY p.name
        ''', (member['id'], user_data['id'], user_data['id'])).fetchall()
        
        member_projects[member['id']] = projects
    
    conn.close()
    
    return render_template('team_overview.html', 
                         theme=theme, 
                         user_data=user_data, 
                         team_members=team_members,
                         member_tasks=member_tasks,
                         member_projects=member_projects,
                         member_remove_permissions=member_remove_permissions,
                         user_projects=user_projects)

@app.route('/update_task_priority', methods=['POST'])
def update_task_priority():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    data = request.get_json()
    task_id = data.get('task_id')
    priority = data.get('priority')
    
    if priority not in ['low', 'medium', 'high']:
        return jsonify({'success': False, 'message': 'Invalid priority level'})
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Verify user has access to this task's project
    task_access = conn.execute('''
        SELECT t.id FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = ? AND (p.id IN (
            SELECT project_id FROM project_members WHERE user_id = ?
        ) OR p.created_by = ?)
    ''', (task_id, user_data['id'], user_data['id'])).fetchone()
    
    if not task_access:
        conn.close()
        return jsonify({'success': False, 'message': 'Access denied'})
    
    # Update task priority
    conn.execute(
        'UPDATE tasks SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        (priority, task_id)
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': f'Task priority updated to {priority}'})

@app.route('/delete_task', methods=['POST'])
def delete_task():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    data = request.get_json()
    task_id = data.get('task_id')
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Verify user has access to this task's project and is either the creator or project admin, get project_id
    task_info = conn.execute('''
        SELECT t.id, t.project_id FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
        WHERE t.id = ? AND (
            t.created_by = ? OR 
            p.created_by = ? OR 
            pm.role = 'admin'
        )
    ''', (user_data['id'], task_id, user_data['id'], user_data['id'])).fetchone()
    
    if not task_info:
        conn.close()
        return jsonify({'success': False, 'message': 'Access denied. Only task creators or project admins can delete tasks.'})
    
    project_id = task_info['project_id']
    
    # Delete related messages first
    conn.execute('DELETE FROM messages WHERE task_id = ?', (task_id,))
    
    # Delete task
    conn.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    
    # Check and update project completion status
    new_project_status = check_and_update_project_completion(project_id, conn)
    
    conn.commit()
    conn.close()
    
    # Prepare response message
    message = 'Task deleted successfully'
    if new_project_status == 'completed':
        message += ' - Project marked as completed! 🎉'
    
    return jsonify({'success': True, 'message': message})

@app.route('/get_task/<int:task_id>')
def get_task(task_id):
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Get task details with access verification
    task = conn.execute('''
        SELECT t.*, p.name as project_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = ? AND (p.id IN (
            SELECT project_id FROM project_members WHERE user_id = ?
        ) OR p.created_by = ?)
    ''', (task_id, user_data['id'], user_data['id'])).fetchone()
    
    if not task:
        conn.close()
        return jsonify({'success': False, 'message': 'Task not found or access denied'})
    
    conn.close()
    
    # Convert row to dictionary
    task_dict = {
        'id': task['id'],
        'title': task['title'],
        'description': task['description'],
        'project_id': task['project_id'],
        'assigned_to': task['assigned_to'],
        'priority': task['priority'],
        'status': task['status'],
        'due_date': task['due_date'],
        'project_name': task['project_name']
    }
    
    return jsonify({'success': True, 'task': task_dict})

@app.route('/update_task', methods=['POST'])
def update_task():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    data = request.get_json()
    task_id = data.get('task_id')
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    assigned_to = data.get('assigned_to')
    priority = data.get('priority', 'medium')
    due_date = data.get('due_date')
    
    if not title:
        return jsonify({'success': False, 'message': 'Task title is required'})
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Verify user has access to this task's project
    task_access = conn.execute('''
        SELECT t.id FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = ? AND (p.id IN (
            SELECT project_id FROM project_members WHERE user_id = ?
        ) OR p.created_by = ?)
    ''', (task_id, user_data['id'], user_data['id'])).fetchone()
    
    if not task_access:
        conn.close()
        return jsonify({'success': False, 'message': 'Access denied'})
    
    # Update task
    conn.execute('''
        UPDATE tasks 
        SET title = ?, description = ?, assigned_to = ?, priority = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (title, description, assigned_to, priority, due_date, task_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Task updated successfully'})

@app.route('/remove_project_member', methods=['POST'])
def remove_project_member():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    data = request.get_json()
    project_id = data.get('project_id')
    member_id = data.get('member_id')
    
    if not project_id or not member_id:
        return jsonify({'success': False, 'message': 'Project ID and Member ID are required'})
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Get member info for better error messages
    member_info = conn.execute('SELECT email, display_name FROM users WHERE id = ?', (member_id,)).fetchone()
    if not member_info:
        conn.close()
        return jsonify({'success': False, 'message': 'Member not found'})
    
    # Verify user is admin of this project or project creator
    admin_access = conn.execute('''
        SELECT 1 FROM projects p 
        LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
        WHERE p.id = ? AND (p.created_by = ? OR pm.role = 'admin')
    ''', (user_data['id'], project_id, user_data['id'])).fetchone()
    
    if not admin_access:
        conn.close()
        return jsonify({'success': False, 'message': 'Only project creators and admins can remove members'})
    
    # Check if member is actually in the project
    member_exists = conn.execute(
        'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?',
        (project_id, member_id)
    ).fetchone()
    
    if not member_exists:
        conn.close()
        return jsonify({'success': False, 'message': 'User is not a member of this project'})
    
    # Prevent removing the project creator
    project_creator = conn.execute('SELECT created_by FROM projects WHERE id = ?', (project_id,)).fetchone()
    if project_creator and project_creator['created_by'] == member_id:
        conn.close()
        return jsonify({'success': False, 'message': 'Cannot remove the project creator'})
    
    # Remove member from project
    conn.execute(
        'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
        (project_id, member_id)
    )
    
    # Optional: Unassign tasks from this member in this project
    conn.execute('''
        UPDATE tasks SET assigned_to = NULL 
        WHERE project_id = ? AND assigned_to = ?
    ''', (project_id, member_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True, 
        'message': f'{member_info["display_name"]} ({member_info["email"]}) has been removed from the project'
    })

@app.route('/delete_project', methods=['POST'])
def delete_project():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    data = request.get_json()
    project_id = data.get('project_id')
    
    if not project_id:
        return jsonify({'success': False, 'message': 'Project ID is required'})
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Get project info for better error messages
    project_info = conn.execute('SELECT name, created_by FROM projects WHERE id = ?', (project_id,)).fetchone()
    if not project_info:
        conn.close()
        return jsonify({'success': False, 'message': 'Project not found'})
    
    # Only allow project creator to delete the project
    if project_info['created_by'] != user_data['id']:
        conn.close()
        return jsonify({'success': False, 'message': 'Only the project creator can delete this project'})
    
    try:
        # Delete in proper order to maintain referential integrity
        
        # 1. Delete messages related to project tasks
        conn.execute('''
            DELETE FROM messages WHERE task_id IN (
                SELECT id FROM tasks WHERE project_id = ?
            )
        ''', (project_id,))
        
        # 2. Delete project-level messages
        conn.execute('DELETE FROM messages WHERE project_id = ? AND task_id IS NULL', (project_id,))
        
        # 3. Delete tasks
        conn.execute('DELETE FROM tasks WHERE project_id = ?', (project_id,))
        
        # 4. Delete project members
        conn.execute('DELETE FROM project_members WHERE project_id = ?', (project_id,))
        
        # 5. Delete the project itself
        conn.execute('DELETE FROM projects WHERE id = ?', (project_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': f'Project "{project_info["name"]}" has been deleted successfully'
        })
        
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({
            'success': False, 
            'message': f'Error deleting project: {str(e)}'
        })

# NOTIFICATION SYSTEM ROUTES
def check_and_update_project_completion(project_id, conn=None):
    """Check if all tasks in a project are completed and update project status"""
    should_close_conn = False
    
    if conn is None:
        conn = get_db_connection()
        should_close_conn = True
    
    try:
        # Get total task count and completed task count
        task_stats = conn.execute('''
            SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed_tasks
            FROM tasks 
            WHERE project_id = ?
        ''', (project_id,)).fetchone()
        
        total_tasks = task_stats['total_tasks']
        completed_tasks = task_stats['completed_tasks']
        
        # Determine new project status
        new_status = 'completed' if total_tasks > 0 and total_tasks == completed_tasks else 'active'
        
        # Update project status
        conn.execute(
            'UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            (new_status, project_id)
        )
        
        if should_close_conn:
            conn.commit()
            conn.close()
        
        return new_status
        
    except Exception as e:
        print(f"Error updating project completion status: {e}")
        if should_close_conn:
            conn.close()
        return None

def create_notification(user_id, title, message, notification_type='info', project_id=None, task_id=None, conn=None):
    """Helper function to create notifications"""
    should_close_conn = False
    
    if conn is None:
        conn = get_db_connection()
        should_close_conn = True
    
    try:
        # Check if user has notifications enabled
        settings = conn.execute('SELECT notifications_enabled FROM user_settings WHERE user_id = ?', (user_id,)).fetchone()
        if settings and not settings['notifications_enabled']:
            if should_close_conn:
                conn.close()
            return False
        
        # Create notification
        conn.execute('''
            INSERT INTO notifications (user_id, title, message, type, project_id, task_id)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, title, message, notification_type, project_id, task_id))
        
        if should_close_conn:
            conn.commit()
            conn.close()
        
        return True
        
    except Exception as e:
        print(f"Error creating notification: {e}")
        if should_close_conn:
            conn.close()
        return False

@app.route('/get_notifications')
def get_notifications():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Get user's notifications (latest 20)
    notifications = conn.execute('''
        SELECT n.*, p.name as project_name, t.title as task_title
        FROM notifications n
        LEFT JOIN projects p ON n.project_id = p.id
        LEFT JOIN tasks t ON n.task_id = t.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 20
    ''', (user_data['id'],)).fetchall()
    
    # Count unread notifications
    unread_count = conn.execute(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0',
        (user_data['id'],)
    ).fetchone()['count']
    
    conn.close()
    
    return jsonify({
        'success': True,
        'notifications': [dict(n) for n in notifications],
        'unread_count': unread_count
    })

@app.route('/mark_notification_read', methods=['POST'])
def mark_notification_read():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    data = request.get_json()
    notification_id = data.get('notification_id')
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Mark notification as read
    conn.execute(
        'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?',
        (notification_id, user_data['id'])
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/mark_all_notifications_read', methods=['POST'])
def mark_all_notifications_read():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Mark all notifications as read
    conn.execute(
        'UPDATE notifications SET read = 1 WHERE user_id = ?',
        (user_data['id'],)
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/toggle_notifications', methods=['POST'])
def toggle_notifications():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Get current settings or create if not exists
    settings = conn.execute('SELECT * FROM user_settings WHERE user_id = ?', (user_data['id'],)).fetchone()
    
    if settings:
        # Toggle notifications
        new_status = not settings['notifications_enabled']
        conn.execute(
            'UPDATE user_settings SET notifications_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            (new_status, user_data['id'])
        )
    else:
        # Create settings with notifications disabled
        new_status = False
        conn.execute(
            'INSERT INTO user_settings (user_id, notifications_enabled) VALUES (?, ?)',
            (user_data['id'], new_status)
        )
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'notifications_enabled': new_status
    })

@app.route('/get_notification_settings')
def get_notification_settings():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first'})
    
    conn = get_db_connection()
    user_data = conn.execute('SELECT * FROM users WHERE email = ?', (session['user'],)).fetchone()
    
    # Get user settings or create default
    settings = conn.execute('SELECT * FROM user_settings WHERE user_id = ?', (user_data['id'],)).fetchone()
    
    if not settings:
        # Create default settings
        conn.execute(
            'INSERT INTO user_settings (user_id, notifications_enabled) VALUES (?, ?)',
            (user_data['id'], True)
        )
        conn.commit()
        notifications_enabled = True
    else:
        notifications_enabled = bool(settings['notifications_enabled'])
    
    conn.close()
    
    return jsonify({
        'success': True,
        'notifications_enabled': notifications_enabled
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)
