// /home/lenovo/code/ltphongssvn/task-management-final/config/passport.js

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

// Configure the local strategy for Passport
// This tells Passport how to authenticate users with email and password
passport.use(new LocalStrategy(
    {
        // By default, LocalStrategy expects 'username' and 'password'
        // We're using email instead of username, so we need to specify this
        usernameField: 'email',
        passwordField: 'password'
    },
    async (email, password, done) => {
        try {
            // Attempt to find the user and validate their credentials
            // This uses the static method we defined in the User model
            const user = await User.findByCredentials(email, password);

            // If authentication succeeds, pass the user to done()
            // The first argument (null) indicates no error occurred
            return done(null, user);

        } catch (error) {
            // If authentication fails, pass false instead of a user
            // This tells Passport the authentication was unsuccessful
            // We don't pass the error as the first argument because
            // authentication failure isn't a system error
            return done(null, false, { message: error.message });
        }
    }
));

// Serialize user for the session
// This determines what data from the user object should be stored in the session
// We only store the user's ID to keep the session lightweight
passport.serializeUser((user, done) => {
    // Store only the user ID in the session
    // This keeps session data minimal and secure
    done(null, user._id);
});

// Deserialize user from the session
// This retrieves the full user object based on the ID stored in the session
passport.deserializeUser(async (id, done) => {
    try {
        // Find the user by their ID
        // We don't need the password for session-based requests
        const user = await User.findById(id);

        if (!user) {
            // If user no longer exists, clear them from session
            return done(null, false);
        }

        // Pass the user object to req.user
        done(null, user);

    } catch (error) {
        // Pass any database errors to Passport
        done(error, null);
    }
});

// Export the configured passport instance
// This isn't strictly necessary since passport is a singleton,
// but it makes the dependency explicit
module.exports = passport;