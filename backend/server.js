require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const PORT = process.env.PORT || 3000;

const taskRoutes = require("./routes/taskRoutes");
const infraTaskRoutes = require("./routes/infraTaskRoutes");
const excelUploadRoutes = require("./routes/excelUploadRoutes");
const authRoutes = require("./routes/authRoutes");
const auditRoutes = require("./routes/auditRoutes");

const { loadSession } = require("./middleware/sessionMiddleware");

const app = express();

/* ============================
   🚨 REQUIRED FOR NGINX + DOCKER
============================ */
app.set("trust proxy", 1);

/* ============================
   CORS (COOKIE SAFE)
============================ */
app.use(
  cors({
    origin: true,          // allow same-origin + nginx
    credentials: true,     // 🔑 allow cookies
  })
);

/* ============================
   CORE MIDDLEWARE
============================ */
app.use(cookieParser());
app.use(express.json());

/* ============================
   DEBUG HEADER (SAFE)
============================ */
app.use((req, res, next) => {
  res.setHeader("X-GCC-Backend", "api");
  next();
});

/* ============================
   SESSION LOADER (CRITICAL)
============================ */
app.use(loadSession);

/* ============================
   API ROUTES
============================ */

// Auth
app.use("/api/auth", authRoutes);

// Business APIs
app.use("/api/tasks", taskRoutes);
app.use("/api/infra-tasks", infraTaskRoutes);
app.use("/api/excel", excelUploadRoutes);

// Admin
app.use("/api/audit", auditRoutes);

// Health
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend running" });
});

/* ============================
   GLOBAL ERROR HANDLER
============================ */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

/* ============================
   START SERVER
============================ */
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
