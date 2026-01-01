const prisma = require("../prisma/client");

// GET all tasks
exports.getAllTasks = async (req, res) => {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(tasks);
};

// CREATE a task
exports.createTask = async (req, res) => {
  const task = await prisma.task.create({
    data: req.body,
  });
  res.status(201).json(task);
};

// UPDATE a task
exports.updateTask = async (req, res) => {
  const { id } = req.params;

  const task = await prisma.task.update({
    where: { id: Number(id) },
    data: req.body,
  });

  res.json(task);
};

// DELETE a task
exports.deleteTask = async (req, res) => {
  const { id } = req.params;

  await prisma.task.delete({
    where: { id: Number(id) },
  });

  res.json({ message: "Task deleted successfully" });
};
