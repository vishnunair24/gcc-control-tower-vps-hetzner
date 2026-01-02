const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * GET all tasks
 */
exports.getTasks = async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { id: "asc" },
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * UPDATE task (THIS IS WHERE DATE FIX IS)
 */
exports.updateTask = async (req, res) => {
  const id = Number(req.params.id);
  const data = req.body;

  try {
    const updated = await prisma.task.update({
      where: { id },
      data: {
        workstream: data.workstream,
        deliverable: data.deliverable,
        status: data.status,
        progress: Number(data.progress),
        phase: data.phase,
        milestone: data.milestone,
        owner: data.owner,

        // 🔥 CRITICAL FIX
        startDate: data.startDate
          ? new Date(data.startDate)
          : undefined,

        endDate: data.endDate
          ? new Date(data.endDate)
          : undefined,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ Update failed:", err);
    res.status(500).json({
      error: "Update failed",
      details: err.message,
    });
  }
};
