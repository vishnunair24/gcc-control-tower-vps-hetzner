const express = require("express");
const router = express.Router();

const {
  getTasks,
  updateTask,
} = require("../controllers/taskController");

// =======================
// Routes
// =======================

// Get all tasks
router.get("/", getTasks);

// Update task (edit from tracker)
router.put("/:id", updateTask);

module.exports = router;
