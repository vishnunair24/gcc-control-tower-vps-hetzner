const express = require("express");
const router = express.Router();
const audit = require("../controllers/auditController");
const { loadSession, requireAdmin } = require("../middleware/sessionMiddleware");

router.get("/", loadSession, requireAdmin, audit.list);

module.exports = router;
