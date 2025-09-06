# SynergySphere - Advanced Team Collaboration Platform

## Overview

SynergySphere is a comprehensive project management and team collaboration platform designed to streamline team workflows, improve communication, and boost productivity. Built with Flask and SQLite, it offers a modern, responsive interface that works seamlessly across desktop and mobile devices.

## Features

### ✨ Core Functionality
- **User Authentication**: Secure registration and login system
- **Project Management**: Create and organize projects with customizable themes
- **Task Management**: Kanban-style task boards with drag-and-drop functionality
- **Team Collaboration**: Add team members and manage project access
- **Real-time Messaging**: Project-specific threaded discussions
- **Personal Dashboard**: Individual task tracking and project overview

### 🎨 User Interface
- **Dark/Light Theme**: Toggle between themes for comfortable viewing
- **Responsive Design**: Mobile-first design that adapts to all screen sizes
- **Intuitive Navigation**: Clean, modern interface with smooth animations
- **Accessibility**: Keyboard shortcuts and screen reader friendly

### 📱 Mobile Ready
- **Touch-friendly**: Optimized for mobile interactions
- **Responsive Layouts**: Adapts to different screen sizes
- **Mobile Navigation**: Collapsible sidebar for mobile devices

## Getting Started

### Prerequisites
- Python 3.7+
- Flask
- SQLite3

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SynergySphere
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

4. **Access the application**
   Open your browser and navigate to `http://127.0.0.1:5000`

### First Steps

1. **Register an account** - Create your user profile
2. **Create a project** - Click the "+ New Project" button on the dashboard
3. **Add team members** - Invite colleagues by their email addresses
4. **Create tasks** - Add tasks with assignments, priorities, and due dates
5. **Start collaborating** - Use the messaging system for project discussions

## Usage Guide

### Project Management

#### Creating a Project
1. Click "+ New Project" on the dashboard
2. Enter project name and description
3. Choose a color theme
4. Click "Create Project"

#### Managing Tasks
- **Create Tasks**: Click "Add Task" in the project view
- **Update Status**: Click on task cards to cycle through statuses (To Do → In Progress → Done)
- **Assign Tasks**: Select team members when creating tasks
- **Set Priorities**: Choose High, Medium, or Low priority levels
- **Due Dates**: Set deadlines for tasks

#### Team Management
- **Add Members**: Use the "Add Member" button and enter email addresses
- **Role Management**: Project creators have admin privileges
- **Access Control**: Only project members can view and edit projects

### Communication

#### Project Messages
- **Send Messages**: Use the Messages tab in project view
- **Real-time Updates**: Messages appear instantly
- **Context**: Keep discussions organized by project

### Personal Productivity

#### My Tasks Page
- **View All Tasks**: See all tasks assigned to you across projects
- **Quick Updates**: Change task status with checkboxes
- **Priority Sorting**: Tasks sorted by status, due date, and priority
- **Project Context**: See which project each task belongs to

### Keyboard Shortcuts

#### General
- `Escape` - Close open modals
- `Ctrl/Cmd + Enter` - Submit message in chat

#### My Tasks Page
- `Ctrl/Cmd + 1` - Set task to "To Do"
- `Ctrl/Cmd + 2` - Set task to "In Progress"
- `Ctrl/Cmd + 3` - Set task to "Done"

## Technical Details

### Architecture
- **Backend**: Flask (Python web framework)
- **Database**: SQLite with relational design
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: CSS Grid, Flexbox, CSS Variables
- **Icons**: Unicode emojis for universal compatibility

### Database Schema
- **users**: User accounts and profiles
- **projects**: Project information and metadata
- **project_members**: Project membership and roles
- **tasks**: Task details, assignments, and status
- **messages**: Project-specific communication

### Security Features
- Session-based authentication
- SQL injection prevention with parameterized queries
- CSRF protection for form submissions
- Input validation and sanitization

## Mobile Experience

### Responsive Design
- **Breakpoints**: Optimized for mobile (480px), tablet (768px), and desktop
- **Touch Targets**: Adequate sizing for touch interactions
- **Navigation**: Collapsible sidebar for mobile devices
- **Typography**: Scalable text for different screen sizes

### Mobile-Specific Features
- **Swipe Gestures**: Intuitive task status updates
- **Touch-friendly Forms**: Large input fields and buttons
- **Optimized Modals**: Full-screen modals on small devices

## Customization

### Themes
- **Dark Theme**: Default dark theme for reduced eye strain
- **Light Theme**: Clean light theme for bright environments
- **Auto-toggle**: Easy switching between themes

### Project Colors
- **Blue**: Default project theme
- **Green**: Nature-inspired theme
- **Orange**: Energetic theme
- **Purple**: Creative theme

## API Endpoints

### Project Management
- `POST /create_project` - Create new project
- `GET /project/<id>` - View project details
- `POST /create_task` - Create new task
- `POST /update_task_status` - Update task status
- `POST /add_project_member` - Add team member
- `POST /send_message` - Send project message

### User Management
- `POST /register` - User registration
- `POST /login` - User authentication
- `POST /update_profile` - Update user profile
- `GET /my_tasks` - Personal task view

## Future Enhancements

### Planned Features
- **File Attachments**: Upload and share files in projects
- **Time Tracking**: Track time spent on tasks
- **Gantt Charts**: Visual project timeline management
- **Notifications**: Real-time push notifications
- **Advanced Analytics**: Project progress and team performance metrics
- **Integration**: Connect with external tools (Git, Slack, etc.)

### Technical Improvements
- **Real-time Updates**: WebSocket integration for live updates
- **Caching**: Redis integration for improved performance
- **API**: RESTful API for third-party integrations
- **Testing**: Comprehensive unit and integration tests

## Contributing

We welcome contributions! Please feel free to submit issues, feature requests, or pull requests.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For support, feature requests, or bug reports, please create an issue in the project repository.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**SynergySphere** - Empowering teams to work smarter, not harder. 🚀
