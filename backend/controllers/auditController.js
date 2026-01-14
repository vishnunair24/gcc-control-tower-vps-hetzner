const prisma = require("../prisma/client");

exports.list = async (req, res) => {
  try {
    const { limit = 200 } = req.query;
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load audit logs" });
  }
};
