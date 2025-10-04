// /home/lenovo/code/ltphongssvn/task-management-final/models/Task.js

const mongoose = require('mongoose');

// Define the Task schema - this structures task documents in MongoDB
const TaskSchema = new mongoose.Schema({
    // Title of the task - the main identifier users will see
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
        minlength: [3, 'Task title must be at least 3 characters long'],
        maxlength: [100, 'Task title cannot exceed 100 characters']
    },

    // Detailed description of what needs to be done
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
        default: '' // Optional field with empty default
    },

    // Current status of the task using an enum for consistency
    status: {
        type: String,
        enum: {
            values: ['pending', 'in-progress', 'completed'],
            message: '{VALUE} is not a valid status'
        },
        default: 'pending',
        lowercase: true // Ensure consistency in storage
    },

    // Priority level from 1 (lowest) to 5 (highest)
    priority: {
        type: Number,
        min: [1, 'Priority must be at least 1'],
        max: [5, 'Priority cannot exceed 5'],
        default: 3, // Medium priority by default
        validate: {
            validator: Number.isInteger,
            message: 'Priority must be a whole number'
        }
    },

    // When the task should be completed by
    dueDate: {
        type: Date,
        validate: {
            validator: function(value) {
                // Allow null for no due date, or ensure date is in the future
                return value === null || value >= new Date();
            },
            message: 'Due date must be in the future'
        }
    },

    // Quick boolean flag for completion status
    // Redundant with status field but useful for quick filtering
    isCompleted: {
        type: Boolean,
        default: false
    },

    // Tags for categorizing and searching tasks
    tags: {
        type: [String], // Array of strings
        default: [],
        validate: {
            validator: function(tags) {
                // Ensure no more than 10 tags per task
                return tags.length <= 10;
            },
            message: 'A task cannot have more than 10 tags'
        }
    },

    // Reference to the user who created this task
    // This creates the relationship between User and Task models
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // References the User model
        required: [true, 'Task must have an owner'],
        immutable: true // Cannot be changed after creation
    }
}, {
    // Schema options
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Compound index for efficient queries by user and status
TaskSchema.index({ createdBy: 1, status: 1 });

// Index for searching by due date
TaskSchema.index({ dueDate: 1 });

// Index for searching completed tasks
TaskSchema.index({ isCompleted: 1 });

// Pre-save middleware to sync isCompleted with status
TaskSchema.pre('save', function(next) {
    // Automatically set isCompleted based on status
    this.isCompleted = this.status === 'completed';
    next();
});

// Instance method to mark task as completed
TaskSchema.methods.markCompleted = function() {
    this.status = 'completed';
    this.isCompleted = true;
    return this.save();
};

// Instance method to check if task is overdue
TaskSchema.methods.isOverdue = function() {
    if (!this.dueDate || this.isCompleted) {
        return false;
    }
    return new Date() > this.dueDate;
};

// Static method to find tasks for a specific user
TaskSchema.statics.findByUser = function(userId, options = {}) {
    const query = this.find({ createdBy: userId });

    // Apply optional filters
    if (options.status) {
        query.where('status').equals(options.status);
    }
    if (options.isCompleted !== undefined) {
        query.where('isCompleted').equals(options.isCompleted);
    }
    if (options.tags && options.tags.length > 0) {
        query.where('tags').in(options.tags);
    }

    // Apply sorting (default to newest first)
    query.sort(options.sort || '-createdAt');

    return query.exec();
};

// Virtual property to get a formatted due date
TaskSchema.virtual('formattedDueDate').get(function() {
    if (!this.dueDate) return 'No due date';
    return this.dueDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
});

// Create the model from the schema
const Task = mongoose.model('Task', TaskSchema);

module.exports = Task;