const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const PORT = process.env.PORT || 3001;

const taskRoutes = require("./routes/taskRoutes");
const infraTaskRoutes = require("./routes/infraTaskRoutes");
const excelUploadRoutes = require("./routes/excelUploadRoutes");
const authRoutes = require("./routes/authRoutes");
const { loadSession } = require("./middleware/sessionMiddleware");
const auditRoutes = require("./routes/auditRoutes");
const authController = require("./controllers/authController");

const app = express();

// app.use(cors());
// Allow Vite dev server origin for credentialed requests during development
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());

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
