// /home/lenovo/code/ltphongssvn/task-management-final/app.js

// Load environment variables from .env file
// This must be the very first line to ensure all subsequent code has access to env variables
require('dotenv').config();

// Core dependencies
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const helmet = require('helmet');
const { csrf, getToken } = require('host-csrf');
const expressLayouts = require('express-ejs-layouts');

// Create Express application instance
const app = express();

// Define port - Render.com provides PORT env variable, fallback to 3000 for local development
const PORT = process.env.PORT || 3000;

// Get the secret that will be used across cookie-parser, sessions, and CSRF
// Using the same secret ensures consistency across all security components
const APP_SECRET = process.env.SESSION_SECRET || 'your-secret-key-change-in-production';

// Security middleware - Helmet sets various HTTP headers to secure the app
// Must be one of the first middleware to ensure all responses get security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Cookie parser middleware - MUST come before session and CSRF middleware
// The secret parameter enables signed cookies, which CSRF protection requires
app.use(cookieParser(APP_SECRET));

// Body parsing middleware - Required before any route that needs to read request body
app.use(express.json()); // Parse JSON bodies (for API requests)
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies (for form submissions)

// Static files middleware - Serve CSS, client-side JS, and images from public directory
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup - Configure EJS as our templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configure express-ejs-layouts
// This must come after setting the view engine
app.use(expressLayouts);
app.set('layout', 'layout'); // default layout file name (layout.ejs)
app.set('layout extractScripts', true); // extract script tags from views
app.set('layout extractStyles', true); // extract style tags from views

// Session configuration - Required for Passport authentication and flash messages
// In production, you should use a session store like connect-mongo instead of memory storage
app.use(session({
    secret: APP_SECRET, // Use the same secret as cookie-parser
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Require HTTPS in production
        httpOnly: true, // Prevent JavaScript access to cookies
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
}));

// Passport middleware - Must come after session middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash messages middleware - Must come after session middleware
app.use(flash());

// CSRF protection middleware - Must come after cookie-parser, session and body parser middleware
// This protects against Cross-Site Request Forgery attacks
let csrf_development_mode = true;
if (app.get('env') === 'production') {
    csrf_development_mode = false;
    app.set('trust proxy', 1); // Required for Render.com deployment
}

// Configure CSRF options
// The cookie configuration here must align with cookie-parser's capabilities
// Skip CSRF in test environment
if (process.env.CSRF_DISABLED === "true") {
    app.use((req, res, next) => {
        res.locals._csrf = "";
        next();
    });
} else {
const csrf_options = {
    development_mode: csrf_development_mode,
    protected_operations: ['POST', 'PUT', 'PATCH', 'DELETE'],
    protected_content_types: ['application/x-www-form-urlencoded', 'multipart/form-data'],
    header_name: 'x-csrf-token',
    cookie_name: csrf_development_mode ? 'x-csrf-token' : '__Host-psifi.x-csrf-token',
    cookie_options: {
        sameSite: 'strict',
        secure: !csrf_development_mode,
        httpOnly: true,
        signed: true // Enable signed cookies for CSRF tokens
    },
    secret: APP_SECRET, // Use the same secret for consistency
    getToken: getToken // Provide the getToken function
};

app.use(csrf(csrf_options));
}

// Make user and flash messages available to all views
// This middleware runs for every request and sets local variables that all views can access
app.use((req, res, next) => {
    res.locals.currentUser = req.user; // Make user available in all views
    res.locals.success = req.flash('success'); // Success messages
    res.locals.error = req.flash('error'); // Error messages
    res.locals.info = req.flash('info'); // Info messages

    // Generate CSRF token using host-csrf's getToken function
    // The getToken function needs the request and response objects
    if (process.env.CSRF_DISABLED !== "true") {
        try {
            res.locals._csrf = getToken(req, res);
        } catch (err) {
            console.error("CSRF token generation error:", err);
            res.locals._csrf = "";
        }
    } else {
        res.locals._csrf = "";
    }
    if (process.env.CSRF_DISABLED !== "true") {
        try {
            res.locals._csrf = getToken(req, res);
        } catch (err) {
            console.error("CSRF token generation error:", err);
            res.locals._csrf = "";
        }
    } else {
        res.locals._csrf = "";
    }

    next();
});

// MongoDB connection with Mongoose
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/task-management';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Successfully connected to MongoDB');
        console.log('Database:', mongoose.connection.name);
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit if we can't connect to database
    });

// Load Passport configuration
// This must come after MongoDB connection is established
require('./config/passport');

// Import routes - All route files are loaded here
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
// const indexRoutes = require('./routes/index'); // Could be added for static pages

// Register routes - Map route files to URL paths
app.use('/auth', authRoutes); // All auth routes will be prefixed with /auth
app.use('/tasks', taskRoutes); // All task routes will be prefixed with /tasks
// app.use('/', indexRoutes); // Root level routes could go here

// Root route - Landing page for non-authenticated users
app.get('/', (req, res) => {
    // Check if user just logged out (from the logout redirect)
    const loggedOut = req.query.loggedOut === 'true';

    // If user is already logged in, redirect to tasks
    if (req.isAuthenticated()) {
        return res.redirect('/tasks');
    }

    res.send(`
    <html>
    <head>
        <title>Task Management Application</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0;
            }
            .container {
                background: white;
                padding: 3rem;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
            }
            h1 { color: #333; margin-bottom: 1rem; }
            p { color: #666; margin-bottom: 2rem; }
            .status { 
                background: #f0f0f0; 
                padding: 1rem; 
                border-radius: 8px; 
                margin: 1.5rem 0;
            }
            .success-message {
                background: #d4edda;
                color: #155724;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1.5rem;
            }
            a {
                display: inline-block;
                padding: 0.75rem 2rem;
                margin: 0.5rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                transition: transform 0.2s;
            }
            a:hover { transform: translateY(-2px); }
        </style>
        <link rel="stylesheet" href="/css/style.css">
    </head>
    <body>
        <div class="container">
            ${loggedOut ? '<div class="success-message">You have been successfully logged out.</div>' : ''}
            <h1>📝 Task Management Application</h1>
            <p>Organize your tasks efficiently and boost your productivity!</p>
            <div class="status">
                <strong>System Status:</strong><br>
                Server: ✅ Running<br>
                Database: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Not Connected'}<br>
                Environment: ${app.get('env')}
            </div>
            <div>
                <a href="/auth/register">Get Started</a>
                <a href="/auth/login">Sign In</a>
            </div>
        </div>
    </body>
    </html>
  `);
});

// 404 Error Handler - This catches any requests that don't match defined routes
// This must come after all valid routes are defined
app.use((req, res, next) => {
    const err = new Error('Page Not Found');
    err.status = 404;
    next(err); // Pass error to the next error handler
});

// General Error Handler - This must be the last middleware
// The four parameters (err, req, res, next) tell Express this is an error handler
app.use((err, req, res, next) => {
    // Set locals, only providing error details in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // Log the error for debugging
    console.error('Error:', err);

    // Set response status
    res.status(err.status || 500);

    // For now, send a simple error response
    // Later, you could create an error.ejs view for a better error page
    res.send(`
    <html>
    <head>
        <title>Error ${err.status || 500}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0;
            }
            .error-container {
                background: white;
                padding: 3rem;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
            }
            h1 { color: #e53e3e; margin-bottom: 1rem; }
            p { color: #666; margin-bottom: 2rem; }
            a {
                display: inline-block;
                padding: 0.75rem 2rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                transition: transform 0.2s;
            }
            a:hover { transform: translateY(-2px); }
            pre {
                background: #f7f7f7;
                padding: 1rem;
                border-radius: 8px;
                text-align: left;
                overflow-x: auto;
                font-size: 0.85rem;
                color: #333;
            }
        </style>
        <link rel="stylesheet" href="/css/style.css">
    </head>
    <body>
        <div class="error-container">
            <h1>Error ${err.status || 500}</h1>
            <p>${err.message}</p>
            ${req.app.get('env') === 'development' && err.stack ? `<pre>${err.stack}</pre>` : ''}
            <a href="/">Go Home</a>
        </div>
    </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Task Management Application`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Server is running on port ${PORT}`);
    console.log(`Local URL: http://localhost:${PORT}`);
    console.log(`Environment: ${app.get('env')}`);
    console.log(`${'='.repeat(50)}\n`);
});

// Export app for potential testing
module.exports = app;