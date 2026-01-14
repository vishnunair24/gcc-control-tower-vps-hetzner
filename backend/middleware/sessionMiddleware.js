const prisma = require("../prisma/client");

const COOKIE_NAME = "sid";

exports.loadSession = async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token) return next();
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
    if (!session) return next();
    if (session.expiresAt < new Date()) {
      // expired
      await prisma.session.deleteMany({ where: { token } });
      return next();
    }
    // Strict expiration: do NOT extend session expiry on each request.
    // Use the session.expiresAt stored in DB as authoritative.
    req.session = session;
    req.user = session.user;
    next();
  } catch (err) {
    console.error("Session load failed:", err);
    next();
  }
};

exports.requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (req.user.disabled) return res.status(403).json({ error: "Account disabled" });
  next();
};

exports.requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin required" });
  next();
};
