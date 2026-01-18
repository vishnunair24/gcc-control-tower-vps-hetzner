const prisma = require("../prisma/client");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const mailer = require('../utils/mailer');
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

    // If client requested to login specifically as employee/customer, enforce presence
    if (loginAs === 'employee') {
      const emp = await prisma.employee.findUnique({ where: { userId: user.id } });
      if (!emp) return res.status(403).json({ error: 'Not an employee' });
    } else if (loginAs === 'customer') {
      const cust = await prisma.customer.findUnique({ where: { userId: user.id } });
      if (!cust) return res.status(403).json({ error: 'Not a customer' });
    } else if (loginAs === 'admin') {
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    }

    // create session token; idle timeout is optional and can be disabled
    const token = crypto.randomBytes(32).toString("hex");
    const idleRaw = process.env.SESSION_IDLE_MS;
    const idleMs = idleRaw && Number(idleRaw) > 0 ? Number(idleRaw) : null;
    // When idle timeout is disabled (idleMs === null), push expiry far into
    // the future so that sessions effectively never expire until logout.
    const expiresAt = idleMs
      ? new Date(Date.now() + idleMs)
      : new Date("9999-12-31T23:59:59.999Z");
    await prisma.session.create({ data: { token, userId: user.id, expiresAt } });

    const maxAge = process.env.SESSION_MAX_AGE
      ? Number(process.env.SESSION_MAX_AGE)
      : idleMs || 365 * 24 * 60 * 60 * 1000; // default cookie: 1 year

    // Cookie settings for single-origin (nginx + backend on same host).
    // For your current HTTP-only VPS setup we must NOT force "secure"
    // in production, otherwise browsers will drop the cookie.
    //
    // - Default SameSite to "lax" for same-origin
    // - Allow overriding via COOKIE_SAME_SITE
    // - Only mark Secure when COOKIE_SECURE=true *and* the request
    //   is actually over HTTPS (x-forwarded-proto or req.secure).
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
      res.clearCookie(COOKIE_NAME);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Logout failed:", err);
    res.status(500).json({ error: "Logout failed" });
  }
};

// List all customers with their canonical customerName and logoUrl
exports.listCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        customerName: true,
        logoUrl: true,
      },
      orderBy: { customerName: "asc" },
    });

    res.json(customers);
  } catch (err) {
    console.error("/auth/customers failed:", err);
    res.status(500).json({ error: "Failed to load customers" });
  }
};

exports.me = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });

  try {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      include: { customer: true, employee: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

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

// Public: check signup status by email (approved / declined / pending / not_found)
// Also indicates whether this user is still required to set an initial password.
exports.signupStatus = async (req, res) => {
  try {
    const email = (req.query.email || "").toString().trim();
    if (!email) return res.status(400).json({ error: "Email is required" });

    // Case-insensitive lookup so it works regardless of how user typed email
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (!user) return res.json({ status: "not_found" });

    if (user.declined) return res.json({ status: "declined" });
    if (!user.approved) return res.json({ status: "pending" });

    // For approved users, expose whether they are still in "first time password" state
    const mustSetPassword = !!user.mustSetPassword || !user.password;
    return res.json({ status: "approved", mustSetPassword });
  } catch (err) {
    console.error("signupStatus failed:", err);
    res.status(500).json({ error: "Failed to check status" });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, name, signupType, customerName, phone, country, place } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCustomerName = normalizeCustomerName(customerName || null);
    const logoUrl = defaultLogoUrlForCustomer(normalizedCustomerName);
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return res.status(400).json({ error: "User exists" });
    // create user without password; mustSetPassword true
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, name, mustSetPassword: true, resetToken, resetTokenExpires, signupType },
    });
    // create role-specific record with duplicated details
    if (signupType === 'employee') {
      await prisma.employee.create({ data: { userId: user.id, name, email: normalizedEmail, phone: phone || null, country: country || null, place: place || null } });
    } else if (signupType === 'customer') {
      await prisma.customer.create({ data: { userId: user.id, name, email: normalizedEmail, customerName: normalizedCustomerName, logoUrl, phone: phone || null, country: country || null, place: place || null } });
    }
    // attempt to send reset token to user (SMTP or console fallback)
    try {
      await mailer.sendResetToken(user.email, resetToken);
    } catch (e) {
      console.error('Mailer error (createUser):', e);
    }

    // audit log: admin created user
    try {
      await prisma.auditLog.create({ data: { userId: req.user ? req.user.id : null, action: 'create_user', entity: 'User', entityId: user.id, details: `Created user ${user.email}` } });
    } catch (e) { console.error('Audit log createUser failed', e); }

    // Return created user; admin will also see token in console if SMTP not configured
    res.status(201).json({ id: user.id, email: user.email, resetToken });
  } catch (err) {
    console.error("Create user failed:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
};

exports.signup = async (req, res) => {
  try {
    const { email, name, signupType, customerName, phone, country, place } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCustomerName = normalizeCustomerName(customerName || null);
    const logoUrl = defaultLogoUrlForCustomer(normalizedCustomerName);
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return res.status(400).json({ error: "User exists" });

    // create user without role-specific details; these go into role tables
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        signupType,
        mustSetPassword: true,
        approved: false,
        role: signupType === 'employee' ? 'employee' : 'customer'
      },
    });

    // create corresponding role record with duplicated details
    if (signupType === 'employee') {
      await prisma.employee.create({ data: { userId: user.id, name, email: normalizedEmail, phone: phone || null, country: country || null, place: place || null } });
    } else if (signupType === 'customer') {
      await prisma.customer.create({ data: { userId: user.id, name, email: normalizedEmail, customerName: normalizedCustomerName, logoUrl, phone: phone || null, country: country || null, place: place || null } });
    }

    res.status(201).json({ id: user.id, email: user.email, message: 'Submitted for approval' });
  } catch (err) {
    console.error('Signup failed:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
};

exports.listPending = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { approved: false, declined: false },
      orderBy: { createdAt: 'desc' },
      include: { employee: true, customer: true }
    });

    // Map to include role-specific fields expected by frontend
    const mapped = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      signupType: u.signupType,
      customerName: u.customer ? u.customer.customerName : null,
      phone: (u.employee && u.employee.phone) || (u.customer && u.customer.phone) || null,
      country: (u.employee && u.employee.country) || (u.customer && u.customer.country) || null,
      place: (u.employee && u.employee.place) || (u.customer && u.customer.place) || null,
      createdAt: u.createdAt
    }));

    res.json(mapped);
  } catch (err) {
    console.error('List pending failed:', err);
    res.status(500).json({ error: 'Failed to list pending signups' });
  }
};

exports.approveSignup = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.approved) return res.status(400).json({ error: 'Already approved' });

    // generate reset token so user can set password
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const updated = await prisma.user.update({ where: { id }, data: { approved: true, declined: false, resetToken, resetTokenExpires } });

    // send reset token via email (or console fallback)
    try {
      await mailer.sendResetToken(updated.email, resetToken);
    } catch (e) { console.error('Mailer error (approveSignup):', e); }

    // audit log: approved signup
    try {
      await prisma.auditLog.create({ data: { userId: req.user ? req.user.id : null, action: 'approve_signup', entity: 'User', entityId: updated.id, details: `Approved signup for ${updated.email}` } });
    } catch (e) { console.error('Audit log approveSignup failed', e); }

    // return resetToken as well for admin convenience (in dev)
    res.json({ id: updated.id, email: updated.email, resetToken });
  } catch (err) {
    console.error('Approve signup failed:', err);
    res.status(500).json({ error: 'Failed to approve signup' });
  }
};

exports.declineSignup = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.approved) return res.status(400).json({ error: 'Already approved' });
    if (user.declined) return res.status(400).json({ error: 'Already declined' });

    const updated = await prisma.user.update({ where: { id }, data: { declined: true } });

    try {
      await prisma.auditLog.create({ data: { userId: req.user ? req.user.id : null, action: 'decline_signup', entity: 'User', entityId: updated.id, details: `Declined signup for ${updated.email}` } });
    } catch (e) { console.error('Audit log declineSignup failed', e); }

    res.json({ id: updated.id, email: updated.email, declined: true });
  } catch (err) {
    console.error('Decline signup failed:', err);
    res.status(500).json({ error: 'Failed to decline signup' });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, disabled: true, createdAt: true } });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list users" });
  }
};

// Dev-only: list pending signups with admin key (useful for standalone admin UI)
exports.listPendingPublic = async (req, res) => {
  try {
    const key = req.query.key || req.headers['x-admin-key'];
    if (!process.env.ADMIN_UI_KEY) return res.status(403).json({ error: 'Admin UI key not configured' });
    if (!key || key !== process.env.ADMIN_UI_KEY) return res.status(403).json({ error: 'Invalid admin key' });

    const users = await prisma.user.findMany({
      where: { approved: false, declined: false },
      orderBy: { createdAt: 'desc' },
      include: { employee: true, customer: true }
    });

    const mapped = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      signupType: u.signupType,
      customerName: u.customer ? u.customer.customerName : null,
      phone: (u.employee && u.employee.phone) || (u.customer && u.customer.phone) || null,
      country: (u.employee && u.employee.country) || (u.customer && u.customer.country) || null,
      place: (u.employee && u.employee.place) || (u.customer && u.customer.place) || null,
      createdAt: u.createdAt
    }));

    res.json(mapped);
  } catch (err) {
    console.error('List pending public failed:', err);
    res.status(500).json({ error: 'Failed to list pending signups' });
  }
};

// Dev-only: approve signup with admin key
exports.approveSignupPublic = async (req, res) => {
  try {
    const key = req.query.key || req.headers['x-admin-key'];
    if (!process.env.ADMIN_UI_KEY) return res.status(403).json({ error: 'Admin UI key not configured' });
    if (!key || key !== process.env.ADMIN_UI_KEY) return res.status(403).json({ error: 'Invalid admin key' });

    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.approved) return res.status(400).json({ error: 'Already approved' });

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const updated = await prisma.user.update({ where: { id }, data: { approved: true, declined: false, resetToken, resetTokenExpires } });

    try { await mailer.sendResetToken(updated.email, resetToken); } catch (e) { console.error('Mailer error (approveSignupPublic):', e); }

    try {
      await prisma.auditLog.create({ data: { userId: null, action: 'approve_signup_public', entity: 'User', entityId: updated.id, details: `Approved signup for ${updated.email} via public UI` } });
    } catch (e) { console.error('Audit log approveSignupPublic failed', e); }

    res.json({ id: updated.id, email: updated.email, resetToken });
  } catch (err) {
    console.error('Approve signup public failed:', err);
    res.status(500).json({ error: 'Failed to approve signup' });
  }
};

// Dev-only: decline signup with admin key
exports.declineSignupPublic = async (req, res) => {
  try {
    const key = req.query.key || req.headers['x-admin-key'];
    if (!process.env.ADMIN_UI_KEY) return res.status(403).json({ error: 'Admin UI key not configured' });
    if (!key || key !== process.env.ADMIN_UI_KEY) return res.status(403).json({ error: 'Invalid admin key' });

    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.approved) return res.status(400).json({ error: 'Already approved' });
    if (user.declined) return res.status(400).json({ error: 'Already declined' });

    const updated = await prisma.user.update({ where: { id }, data: { declined: true } });

    try {
      await prisma.auditLog.create({ data: { userId: null, action: 'decline_signup_public', entity: 'User', entityId: updated.id, details: `Declined signup for ${updated.email} via public UI` } });
    } catch (e) { console.error('Audit log declineSignupPublic failed', e); }

    res.json({ id: updated.id, email: updated.email, declined: true });
  } catch (err) {
    console.error('Decline signup public failed:', err);
    res.status(500).json({ error: 'Failed to decline signup' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { disabled, role } = req.body;
    const user = await prisma.user.update({ where: { id }, data: { disabled, role } });
    res.json({ id: user.id, email: user.email, disabled: user.disabled, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
};

// First-time password set via token (from approval email)
exports.setPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await prisma.user.findFirst({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    if (user.declined) {
      return res.status(400).json({ error: "Your signup request has been declined" });
    }
    if (!user.approved) {
      return res.status(400).json({ error: "Your signup is not yet approved" });
    }
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        mustSetPassword: false,
        resetToken: null,
        resetTokenExpires: null,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to set password" });
  }
};

// Subsequent password change: requires current password instead of token.
// This is intended for already-approved users who have set a password before.
exports.changePassword = async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;
    const normalizedEmail = (email || "").toString().trim().toLowerCase();
    if (!normalizedEmail || !oldPassword || !newPassword) {
      return res.status(400).json({ error: "Email, old password and new password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.password) {
      return res.status(400).json({ error: "Account not found or password not set" });
    }
    if (user.declined) {
      return res.status(400).json({ error: "Your signup request has been declined" });
    }
    if (!user.approved) {
      return res.status(400).json({ error: "Your signup is not yet approved" });
    }

    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) {
      return res.status(400).json({ error: "Old password is incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        mustSetPassword: false,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("changePassword failed:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
};

// List customers for employee landing (minimal fields)
exports.listCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      select: { id: true, customerName: true, name: true },
      orderBy: { customerName: "asc" },
    });
    res.json(customers);
  } catch (err) {
    console.error("List customers failed:", err);
    res.status(500).json({ error: "Failed to list customers" });
  }
};
