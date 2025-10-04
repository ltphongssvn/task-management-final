// /home/lenovo/code/ltphongssvn/task-management-final/middleware/auth.js

// Middleware to ensure user is authenticated
exports.ensureAuthenticated = (req, res, next) => {
    // Passport adds isAuthenticated() method to request object
    if (req.isAuthenticated()) {
        // User is logged in, proceed to the next middleware/route handler
        return next();
    }

    // User is not logged in
    // Store the URL they were trying to access
    req.session.returnTo = req.originalUrl;

    // Flash a message and redirect to login
    req.flash('error', 'Please log in to access this page');
    res.redirect('/auth/login');
};

// Middleware to ensure user is NOT authenticated (for login/register pages)
exports.ensureNotAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        // User is not logged in, allow access to login/register pages
        return next();
    }

    // User is already logged in, redirect to tasks
    req.flash('info', 'You are already logged in');
    res.redirect('/tasks');
};

// Middleware to check if user owns a resource
// This will be used later for task ownership verification
exports.ensureOwnership = (Model) => {
    return async (req, res, next) => {
        try {
            const resource = await Model.findById(req.params.id);

            if (!resource) {
                req.flash('error', 'Resource not found');
                return res.redirect('/tasks');
            }

            // Check if the current user owns this resource
            if (!resource.createdBy.equals(req.user._id)) {
                req.flash('error', 'You do not have permission to access this resource');
                return res.redirect('/tasks');
            }

            // User owns the resource, attach it to request and proceed
            req.resource = resource;
            next();

        } catch (error) {
            console.error('Ownership check error:', error);
            req.flash('error', 'An error occurred');
            res.redirect('/tasks');
        }
    };
};