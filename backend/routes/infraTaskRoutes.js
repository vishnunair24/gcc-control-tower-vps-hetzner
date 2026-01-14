const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/* =====================================================
   GET ALL INFRA TASKS
===================================================== */
router.get("/", async (req, res) => {
  try {
    const tasks = await prisma.infraTask.findMany({
      orderBy: { id: "asc" },
    });
    res.json(tasks);
  } catch (error) {
    console.error("❌ Fetch infra tasks failed:", error);
    res.status(500).json({ error: "Failed to fetch infra tasks" });
  }
});

/* =====================================================
   CREATE INFRA TASK  (ADD ROW FIX)
===================================================== */
router.post("/", async (req, res) => {
  try {
    let {
      infraPhase,
      taskName,
      status,
      percentComplete,
      startDate,
      endDate,
      owner,
    } = req.body;

    /**
     * 🔑 ABSOLUTE GUARANTEE
     * Prisma schema requires startDate NOT NULL
     */
    if (!startDate) {
      startDate = endDate ? endDate : new Date().toISOString();
    }

    const task = await prisma.infraTask.create({
      data: {
        infraPhase: infraPhase || "",
        taskName: taskName || "",
        status: status || "Planned",
        percentComplete: Number(percentComplete) || 0,
        startDate: new Date(startDate), // NEVER NULL
        endDate: endDate ? new Date(endDate) : null,
        owner: owner || "",
      },
    });

    res.status(201).json(task);
    try {
      const { createAudit } = require("../utils/audit");
      createAudit(req, { action: "create", entity: "InfraTask", entityId: task.id, details: task });
    } catch (e) {
      console.error("Audit failed:", e);
    }
  } catch (error) {
    console.error("❌ Create infra task failed:", error);
    res.status(500).json({ error: "Failed to create infra task" });
  }
});

/* =====================================================
   UPDATE INFRA TASK (INLINE EDIT)
===================================================== */
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      infraPhase,
      taskName,
      status,
      percentComplete,
      startDate,
      endDate,
      owner,
    } = req.body;

    const task = await prisma.infraTask.update({
      where: { id },
      data: {
        infraPhase,
        taskName,
        status,
        percentComplete: Number(percentComplete),
        startDate: new Date(startDate), // REQUIRED
        endDate: endDate ? new Date(endDate) : null,
        owner,
      },
    });

    res.json(task);
    try {
      const { createAudit } = require("../utils/audit");
      createAudit(req, { action: "update", entity: "InfraTask", entityId: id, details: task });
    } catch (e) {
      console.error("Audit failed:", e);
    }
  } catch (error) {
    console.error("❌ Update infra task failed:", error);
    res.status(500).json({ error: "Failed to update infra task" });
  }
});

module.exports = router;
