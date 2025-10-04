// /home/lenovo/code/ltphongssvn/task-management-final/models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the User schema - this is the blueprint for user documents in MongoDB
const UserSchema = new mongoose.Schema({
    // Name field - required for personalization
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true, // Remove whitespace from beginning and end
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },

    // Email field - used as the unique identifier for login
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true, // Ensures no duplicate emails in the database
        lowercase: true, // Convert to lowercase for consistency
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ]
    },

    // Password field - will be hashed before saving
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false // Don't include password in query results by default
    },

    // Track when the user account was created
    createdAt: {
        type: Date,
        default: Date.now
    },

    // Track when the user account was last modified
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    // Schema options
    timestamps: true // Automatically manage createdAt and updatedAt
});

// Index on email for faster queries when finding users by email
// UserSchema.index({ email: 1 });

// Pre-save middleware - runs before saving a user document
// This is where we hash the password before storing it
UserSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return next();
    }

    try {
        // Generate a salt with complexity of 10
        // The salt adds randomness to the hash, making it harder to crack
        const salt = await bcrypt.genSalt(10);

        // Hash the password using the salt
        // This replaces the plain text password with the hashed version
        this.password = await bcrypt.hash(this.password, salt);

        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to compare entered password with hashed password
// This method will be available on all user documents
UserSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        // bcrypt.compare safely compares the plain text password
        // with the hashed password stored in the database
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Instance method to get public profile (without sensitive data)
// Useful when sending user data to the client
UserSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password; // Remove password even if select: false fails
    delete user.__v; // Remove MongoDB version key
    return user;
};

// Static method to find user by email with password included
// Useful for authentication where we need the password for comparison
UserSchema.statics.findByCredentials = async function(email, password) {
    // Find user by email and explicitly include password field
    const user = await this.findOne({ email }).select('+password');

    if (!user) {
        throw new Error('Invalid login credentials');
    }

    // Verify password using the instance method
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
        throw new Error('Invalid login credentials');
    }

    return user;
};

// Create the model from the schema
const User = mongoose.model('User', UserSchema);

module.exports = User;