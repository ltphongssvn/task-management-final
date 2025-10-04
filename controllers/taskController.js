// /home/lenovo/code/ltphongssvn/task-management-final/controllers/taskController.js

const Task = require('../models/Task');
const { body, validationResult } = require('express-validator');
const { getToken } = require('host-csrf');

// Display all tasks for the logged-in user with search and filter
// GET /tasks
exports.getTasks = async (req, res) => {
    try {
        // Extract query parameters for filtering and searching
        const {
            search,     // Text search term
            status,     // Filter by status
            priority,   // Filter by priority
            tag,        // Filter by tag
            sort        // Sort order
        } = req.query;

        // Build the query object starting with user ownership
        // This ensures users only see their own tasks (security requirement)
        let query = { createdBy: req.user._id };

        // Add search functionality if search term provided
        // This uses MongoDB's regex to search in title and description
        if (search && search.trim() !== '') {
            // The $or operator allows matching in multiple fields
            // The 'i' flag makes the search case-insensitive
            query.$or = [
                { title: { $regex: search.trim(), $options: 'i' } },
                { description: { $regex: search.trim(), $options: 'i' } }
            ];
        }

        // Add status filter if specified
        // Only add to query if it's a valid status value
        if (status && ['pending', 'in-progress', 'completed'].includes(status)) {
            query.status = status;
        }

        // Add priority filter if specified
        // Convert to number and validate it's in range
        if (priority) {
            const priorityNum = parseInt(priority);
            if (priorityNum >= 1 && priorityNum <= 5) {
                query.priority = priorityNum;
            }
        }

        // Add tag filter if specified
        // This finds tasks that contain the specified tag
        if (tag && tag.trim() !== '') {
            query.tags = { $in: [tag.trim()] };
        }

        // Determine sort order
        // Default to newest first, but allow other sort options
        let sortOption = '-createdAt'; // Default: newest first
        if (sort) {
            switch(sort) {
                case 'oldest':
                    sortOption = 'createdAt';
                    break;
                case 'priority-high':
                    sortOption = '-priority';
                    break;
                case 'priority-low':
                    sortOption = 'priority';
                    break;
                case 'due-soon':
                    sortOption = 'dueDate';
                    break;
                case 'title':
                    sortOption = 'title';
                    break;
                default:
                    sortOption = '-createdAt';
            }
        }

        // Execute the query with all filters applied
        const tasks = await Task.find(query).sort(sortOption);

        // Get all unique tags from user's tasks for the filter dropdown
        // This helps users see what tags are available to filter by
        const allUserTasks = await Task.find({ createdBy: req.user._id });
        const allTags = [...new Set(allUserTasks.flatMap(task => task.tags))];

        // Group filtered tasks by status for the statistics
        const tasksByStatus = {
            pending: tasks.filter(task => task.status === 'pending'),
            'in-progress': tasks.filter(task => task.status === 'in-progress'),
            completed: tasks.filter(task => task.status === 'completed')
        };

        res.render('tasks/index', {
            title: 'My Tasks - Task Management',
            tasks,
            tasksByStatus,
            allTags,
            // Pass the current filter values back to the view
            // This allows the form to show what filters are active
            filters: {
                search: search || '',
                status: status || '',
                priority: priority || '',
                tag: tag || '',
                sort: sort || ''
            },
            _csrf: getToken(req, res)
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        req.flash('error', 'Unable to fetch tasks. Please try again.');
        res.redirect('/');
    }
};

// Display form to create a new task
// GET /tasks/new
exports.getNewTask = (req, res) => {
    res.render('tasks/new', {
        title: 'New Task - Task Management',
        _csrf: getToken(req, res),
        formData: {} // Always provide formData, even if empty
    });
};

// Process new task creation
// POST /tasks
exports.createTask = [
    // Validation middleware chain
    body('title')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Title must be between 3 and 100 characters')
        .escape(),

    body('description')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters')
        .escape(),

    body('priority')
        .isInt({ min: 1, max: 5 })
        .withMessage('Priority must be between 1 and 5'),

    body('status')
        .isIn(['pending', 'in-progress', 'completed'])
        .withMessage('Invalid status'),

    body('dueDate')
        .optional({ checkFalsy: true })
        .isISO8601()
        .withMessage('Invalid date format'),

    body('tags')
        .optional()
        .customSanitizer(value => {
            // Convert comma-separated string to array
            if (typeof value === 'string') {
                return value.split(',').map(tag => tag.trim()).filter(tag => tag);
            }
            return [];
        }),

    // Main handler
    async (req, res) => {
        try {
            // Check for validation errors
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).render('tasks/new', {
                    title: 'New Task - Task Management',
                    errors: errors.array(),
                    formData: req.body,
                    _csrf: getToken(req, res)
                });
            }

            // Create new task with validated data
            const taskData = {
                title: req.body.title,
                description: req.body.description || '',
                priority: parseInt(req.body.priority),
                status: req.body.status,
                tags: req.body.tags || [],
                createdBy: req.user._id
            };

            // Add due date if provided
            if (req.body.dueDate) {
                taskData.dueDate = new Date(req.body.dueDate);
            }

            const task = new Task(taskData);
            await task.save();

            req.flash('success', 'Task created successfully!');
            res.redirect('/tasks');

        } catch (error) {
            console.error('Task creation error:', error);
            req.flash('error', 'Unable to create task. Please try again.');
            res.redirect('/tasks/new');
        }
    }
];

// Display form to edit a task
// GET /tasks/edit/:id
exports.getEditTask = async (req, res) => {
    try {
        // Find the task and verify ownership
        const task = await Task.findOne({
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!task) {
            req.flash('error', 'Task not found or you do not have permission to edit it.');
            return res.redirect('/tasks');
        }

        res.render('tasks/edit', {
            title: 'Edit Task - Task Management',
            task,
            _csrf: getToken(req, res),
            formData: {} // Always provide formData for consistency
        });

    } catch (error) {
        console.error('Error fetching task for edit:', error);
        req.flash('error', 'Unable to load task for editing.');
        res.redirect('/tasks');
    }
};

// Process task update
// POST /tasks/update/:id
exports.updateTask = [
    // Validation middleware (same as create)
    body('title')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Title must be between 3 and 100 characters')
        .escape(),

    body('description')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters')
        .escape(),

    body('priority')
        .isInt({ min: 1, max: 5 })
        .withMessage('Priority must be between 1 and 5'),

    body('status')
        .isIn(['pending', 'in-progress', 'completed'])
        .withMessage('Invalid status'),

    body('dueDate')
        .optional({ checkFalsy: true })
        .isISO8601()
        .withMessage('Invalid date format'),

    body('tags')
        .optional()
        .customSanitizer(value => {
            if (typeof value === 'string') {
                return value.split(',').map(tag => tag.trim()).filter(tag => tag);
            }
            return [];
        }),

    // Main handler
    async (req, res) => {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                // Reload the task for the form
                const task = await Task.findById(req.params.id);

                return res.status(400).render('tasks/edit', {
                    title: 'Edit Task - Task Management',
                    errors: errors.array(),
                    task,
                    formData: req.body,
                    _csrf: getToken(req, res)
                });
            }

            // Find and update the task
            const task = await Task.findOneAndUpdate(
                {
                    _id: req.params.id,
                    createdBy: req.user._id
                },
                {
                    title: req.body.title,
                    description: req.body.description || '',
                    priority: parseInt(req.body.priority),
                    status: req.body.status,
                    tags: req.body.tags || [],
                    dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null
                },
                { new: true }
            );

            if (!task) {
                req.flash('error', 'Task not found or you do not have permission to edit it.');
                return res.redirect('/tasks');
            }

            req.flash('success', 'Task updated successfully!');
            res.redirect('/tasks');

        } catch (error) {
            console.error('Task update error:', error);
            req.flash('error', 'Unable to update task. Please try again.');
            res.redirect('/tasks');
        }
    }
];

// Delete a task
// POST /tasks/delete/:id
exports.deleteTask = async (req, res) => {
    try {
        // Find and delete the task, ensuring the user owns it
        const task = await Task.findOneAndDelete({
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!task) {
            req.flash('error', 'Task not found or you do not have permission to delete it.');
        } else {
            req.flash('success', 'Task deleted successfully!');
        }

        res.redirect('/tasks');

    } catch (error) {
        console.error('Task deletion error:', error);
        req.flash('error', 'Unable to delete task. Please try again.');
        res.redirect('/tasks');
    }
};