require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const PORT = process.env.PORT || 4000;

const taskRoutes = require("./routes/taskRoutes");
const infraTaskRoutes = require("./routes/infraTaskRoutes");
const excelUploadRoutes = require("./routes/excelUploadRoutes");
const authRoutes = require("./routes/authRoutes");
const { loadSession } = require("./middleware/sessionMiddleware");
const auditRoutes = require("./routes/auditRoutes");
const authController = require("./controllers/authController");

const app = express();

// CORS: custom handler + cors helper to guarantee headers
// are present for both simple and preflight requests.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
  }
  next();
});

// Express 5 uses a stricter path-to-regexp implementation that no longer
// accepts "*" as a valid path pattern, so we use "/*" to match all paths
// for OPTIONS (CORS preflight) requests.
app.options("/*", (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(204);
});
app.use(cookieParser());
app.use(express.json());

// Debug header to verify which backend instance is responding
app.use((req, res, next) => {
  res.setHeader("X-GCC-Backend", "main-3001");
  next();
});

// load session (optional) to populate req.user for downstream routes
app.use(loadSession);

// Optionally clear all sessions on startup (helpful in local dev to force re-login)
const prisma = require('./prisma/client');
const CLEAR_SESSIONS_ON_START = process.env.CLEAR_SESSIONS_ON_START === 'true' || process.env.NODE_ENV !== 'production';
if (CLEAR_SESSIONS_ON_START) {
  prisma.session.deleteMany()
    .then(() => console.log('Cleared session table on startup (dev mode)'))
    .catch((e) => console.error('Failed to clear sessions on startup', e));
  }

// =======================
// ROUTES
// =======================

// Program Tracker
app.use("/tasks", taskRoutes);

// Infra Setup Tracker
app.use("/infra-tasks", infraTaskRoutes);

// Excel Uploads (Program + Infra)
app.use("/excel", excelUploadRoutes);

// Public signup status helper (explicit route to avoid any router issues)
app.get("/auth/signup-status", authController.signupStatus);

// Auth routes
app.use("/auth", authRoutes);

// Audit (admin)
app.use("/audit", auditRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "Backend running" });
});

// app.listen(4000, () => {
//   console.log("Server running on http://localhost:4000");
// });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
