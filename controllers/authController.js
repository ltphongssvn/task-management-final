// /home/lenovo/code/ltphongssvn/task-management-final/controllers/authController.js

const passport = require('passport');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { getToken } = require('host-csrf'); // Import getToken from host-csrf

// Display the registration form
// GET /auth/register
exports.getRegister = (req, res) => {
    res.render('auth/register', {
        title: 'Register - Task Management',
        _csrf: process.env.CSRF_DISABLED === "true" ? "" : getToken(req, res) // Use getToken instead of req.csrfToken()
    });
};

// Process registration form submission
// POST /auth/register
exports.postRegister = [
    // Validation middleware chain
    // These run in sequence before the main handler
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .escape(), // Escape HTML to prevent XSS

    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail() // Standardize email format
        .toLowerCase(),

    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/\d/)
        .withMessage('Password must contain at least one number'),

    body('confirmPassword')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match'),

    // Main handler function
    async (req, res) => {
        try {
            // Check for validation errors
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                // If there are validation errors, re-render the form with errors
                return res.status(400).render('auth/register', {
                    title: 'Register - Task Management',
                    errors: errors.array(),
                    formData: req.body, // Send back the form data for user convenience
                    _csrf: process.env.CSRF_DISABLED === "true" ? "" : getToken(req, res) // Use getToken
                });
            }

            const { name, email, password } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({ email });

            if (existingUser) {
                req.flash('error', 'An account with this email already exists');
                return res.redirect('/auth/register');
            }

            // Create new user
            const user = new User({
                name,
                email,
                password // Will be hashed by the pre-save middleware
            });

            // Save user to database
            await user.save();

            // Log the user in automatically after registration
            req.login(user, (err) => {
                if (err) {
                    console.error('Auto-login after registration failed:', err);
                    req.flash('success', 'Registration successful! Please log in.');
                    return res.redirect('/auth/login');
                }

                req.flash('success', `Welcome to Task Management, ${user.name}!`);
                res.redirect('/tasks');
            });

        } catch (error) {
            console.error('Registration error:', error);
            req.flash('error', 'Registration failed. Please try again.');
            res.redirect('/auth/register');
        }
    }
];

// Display the login form
// GET /auth/login
exports.getLogin = (req, res) => {
    res.render('auth/login', {
        title: 'Login - Task Management',
        _csrf: process.env.CSRF_DISABLED === "true" ? "" : getToken(req, res)
    });
};

// Process login form submission
// POST /auth/login
exports.postLogin = [
    // Validation middleware
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail()
        .toLowerCase(),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),

    // Main handler
    (req, res, next) => {
        // Check for validation errors
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).render('auth/login', {
                title: 'Login - Task Management',
                errors: errors.array(),
                formData: req.body,
                _csrf: process.env.CSRF_DISABLED === "true" ? "" : getToken(req, res) // Use getToken
            });
        }

        // Use Passport to authenticate
        passport.authenticate('local', (err, user, info) => {
            if (err) {
                console.error('Login error:', err);
                req.flash('error', 'An error occurred during login');
                return res.redirect('/auth/login');
            }

            if (!user) {
                // Authentication failed
                req.flash('error', info.message || 'Invalid email or password');
                return res.redirect('/auth/login');
            }

            // Log the user in
            req.login(user, (loginErr) => {
                if (loginErr) {
                    console.error('Session creation error:', loginErr);
                    req.flash('error', 'Login failed. Please try again.');
                    return res.redirect('/auth/login');
                }

                // Successful login
                req.flash('success', `Welcome back, ${user.name}!`);

                // Redirect to the page they were trying to access, or to tasks
                const redirectUrl = req.session.returnTo || '/tasks';
                delete req.session.returnTo; // Clean up the session
                res.redirect(redirectUrl);
            });
        })(req, res, next);
    }
];

// Process logout
// GET /auth/logout
exports.logout = (req, res) => {
    const userName = req.user ? req.user.name : 'User';

    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            req.flash('error', 'Logout failed. Please try again.');
            return res.redirect('/tasks');
        }

        // Destroy the session completely
        req.session.destroy((sessionErr) => {
            if (sessionErr) {
                console.error('Session destruction error:', sessionErr);
            }

            // Clear the session cookie
            res.clearCookie('connect.sid');

            // Redirect with a success message
            // Note: Flash message won't work here since we destroyed the session
            // So we'll handle the message differently on the home page
            res.redirect('/?loggedOut=true');
        });
    });
};