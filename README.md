# Task Management Application

## Overview

A full-stack web application for personal task management built with Node.js, Express, MongoDB, and EJS. This application provides secure user authentication and comprehensive task management capabilities with search and filtering functionality.

## Features

- **User Authentication**: Secure registration and login system with bcrypt password hashing
- **Task Management**: Complete CRUD operations for tasks
- **Advanced Search**: Search tasks by title or description
- **Filtering System**: Filter tasks by status, priority, and tags
- **Sorting Options**: Multiple sort orders including priority, due date, and creation date
- **Security**: CSRF protection, XSS prevention, and secure session management
- **Responsive Design**: Clean, modern interface that works on all devices

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- Git

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with local strategy
- **View Engine**: EJS with express-ejs-layouts
- **Security**: Helmet, express-validator, bcryptjs, host-csrf
- **Session Management**: express-session with secure cookies
- **Development**: nodemon

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ltphongssvn/task-management-final.git
cd task-management-final
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
NODE_ENV=development
PORT=3000
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret_key
```

4. Start the application:
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Application environment | development or production |
| PORT | Server port | 3000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/task-management |
| SESSION_SECRET | Secret key for sessions | random 32+ character string |

## Project Structure

```
task-management-final/
├── app.js              # Main application file
├── models/             # Database models
│   ├── User.js
│   └── Task.js
├── views/              # EJS templates
│   ├── layout.ejs
│   ├── auth/
│   └── tasks/
├── controllers/        # Business logic
│   ├── authController.js
│   └── taskController.js
├── routes/             # Route definitions
│   ├── auth.js
│   └── tasks.js
├── middleware/         # Custom middleware
│   └── auth.js
├── config/             # Configuration files
│   └── passport.js
├── public/             # Static assets
└── utils/              # Helper functions
```

## API Endpoints

### Authentication
- `GET /auth/register` - Registration page
- `POST /auth/register` - Process registration
- `GET /auth/login` - Login page
- `POST /auth/login` - Process login
- `GET /auth/logout` - Logout user

### Tasks (Protected Routes)
- `GET /tasks` - List all user tasks with filters
- `GET /tasks/new` - New task form
- `POST /tasks` - Create new task
- `GET /tasks/edit/:id` - Edit task form
- `POST /tasks/update/:id` - Update task
- `POST /tasks/delete/:id` - Delete task

## Deployment

This application is configured for deployment on Render.com. 

## Author

Thanh Phong Le

## License

ISC
