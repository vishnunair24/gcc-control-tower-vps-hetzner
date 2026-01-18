const prisma = require("../prisma/client");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const mailer = require("../utils/mailer");
const { normalizeCustomerName, defaultLogoUrlForCustomer } = require("../utils/customerName");

const COOKIE_NAME = "sid";

exports.registerAdmin = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const existingAdmin = await prisma.user.findFirst({ where: { role: "admin" } });
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, password: hash, name, role: "admin", mustSetPassword: false },
    });

    res.json({ id: user.id, email: user.email });
  } catch (err) {
    console.error("Register admin failed:", err);
    res.status(500).json({ error: "Failed to register admin" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, loginAs } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.disabled) return res.status(403).json({ error: "Account disabled" });

    if (!user.password) {
      return res.status(403).json({ error: "Password not set", mustSetPassword: true });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    // Role enforcement
    if (loginAs === "employee") {
      const emp = await prisma.employee.findUnique({ where: { userId: user.id } });
      if (!emp) return res.status(403).json({ error: "Not an employee" });
    } else if (loginAs === "customer") {
      const cust = await prisma.customer.findUnique({ where: { userId: user.id } });
      if (!cust) return res.status(403).json({ error: "Not a customer" });
    } else if (loginAs === "admin") {
      if (user.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    }

    // 🔒 PERMANENT FIX: allow only ONE session per user
    await prisma.session.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomBytes(32).toString("hex");

    const idleRaw = process.env.SESSION_IDLE_MS;
    const idleMs = idleRaw && Number(idleRaw) > 0 ? Number(idleRaw) : null;

    const expiresAt = idleMs
      ? new Date(Date.now() + idleMs)
      : new Date("9999-12-31T23:59:59.999Z");

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const maxAge =
      process.env.SESSION_MAX_AGE
        ? Number(process.env.SESSION_MAX_AGE)
        : idleMs || 365 * 24 * 60 * 60 * 1000;

    const sameSite = process.env.COOKIE_SAME_SITE || "lax";
    const secureEnv = process.env.COOKIE_SECURE === "true";
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    const secure = secureEnv && isHttps;

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite,
      secure,
      maxAge,
      path: "/",
    });

    res.json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ error: "Login failed" });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (token) {
      await prisma.session.deleteMany({ where: { token } });
      res.clearCookie(COOKIE_NAME, { path: "/" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Logout failed:", err);
    res.status(500).json({ error: "Logout failed" });
  }
};

exports.me = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { customer: true, employee: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const customerName =
      (user.customer && user.customer.customerName) ||
      user.customerName ||
      null;

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      disabled: user.disabled,
      name: user.name,
      signupType: user.signupType,
      customerName,
      logoUrl: user.customer ? user.customer.logoUrl : null,
    });
  } catch (err) {
    console.error("/auth/me failed:", err);
    res.status(500).json({ error: "Failed to load current user" });
  }
};
