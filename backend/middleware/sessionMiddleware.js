const prisma = require("../prisma/client");

const COOKIE_NAME = "sid";

// Extend session only if it's close to expiry (5 min window)
const EXTEND_WINDOW_MS = 5 * 60 * 1000;

exports.loadSession = async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return next();

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) return next();

    const now = new Date();

    // Hard expiry check
    if (session.expiresAt && session.expiresAt < now) {
      await prisma.session.delete({ where: { token } });
      return next();
    }

    // 🔒 ONLY extend session if close to expiry
    if (session.expiresAt) {
      const remaining = session.expiresAt.getTime() - now.getTime();

      if (remaining < EXTEND_WINDOW_MS) {
        const idleRaw = process.env.SESSION_IDLE_MS;
        const idleMs =
          idleRaw && Number(idleRaw) > 0 ? Number(idleRaw) : null;

        if (idleMs) {
          const newExpiresAt = new Date(now.getTime() + idleMs);

          // Best-effort update (NO FAILURE IMPACT)
          prisma.session
            .update({
              where: { token },
              data: { expiresAt: newExpiresAt },
            })
            .catch(() => {});
        }
      }
    }

    // Attach session & user
    req.session = session;
    req.user = session.user;

    next();
  } catch (err) {
    console.error("Session load failed:", err);
    next();
  }
};

exports.requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.user.disabled) {
    return res.status(403).json({ error: "Account disabled" });
  }
  next();
};

exports.requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin required" });
  }
  next();
};
