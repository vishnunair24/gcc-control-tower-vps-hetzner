const prisma = require("../prisma/client");

async function createAudit(req, { action, entity, entityId, details }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user ? req.user.id : null,
        action,
        entity,
        entityId: entityId ? Number(entityId) : null,
        details: details ? JSON.stringify(details) : null,
        ip: req.ip,
        userAgent: req.get("user-agent") || null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

module.exports = { createAudit };
