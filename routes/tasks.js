// /home/lenovo/code/ltphongssvn/task-management-final/routes/tasks.js

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { ensureAuthenticated } = require('../middleware/auth');

// All task routes require authentication
router.use(ensureAuthenticated);

// Task list (dashboard)
router.get('/', taskController.getTasks);

// New task form
router.get('/new', taskController.getNewTask);

// Create task
router.post('/', taskController.createTask);

// Edit task form
router.get('/edit/:id', taskController.getEditTask);

// Update task
router.post('/update/:id', taskController.updateTask);

// Delete task
router.post('/delete/:id', taskController.deleteTask);

module.exports = router;