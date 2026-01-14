const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");
const { requireAdmin, loadSession } = require("../middleware/sessionMiddleware");

router.post("/register-admin", auth.registerAdmin);
router.post("/login", auth.login);
router.post("/logout", auth.logout);
router.get("/me", loadSession, auth.me);

// Public: check signup status by email
router.get("/signup-status", auth.signupStatus);

// Public signup
router.post('/signup', auth.signup);

// Admin endpoints
router.post("/users", loadSession, requireAdmin, auth.createUser);
router.get("/users", loadSession, requireAdmin, auth.listUsers);
router.patch("/users/:id", loadSession, requireAdmin, auth.updateUser);

// pending signups and approval
router.get('/pending', loadSession, requireAdmin, auth.listPending);
router.post('/approve/:id', loadSession, requireAdmin, auth.approveSignup);
router.post('/decline/:id', loadSession, requireAdmin, auth.declineSignup);

// Dev-only public admin endpoints (require ADMIN_UI_KEY env var)
router.get('/pending-public', auth.listPendingPublic);
router.post('/approve-public/:id', auth.approveSignupPublic);
router.post('/decline-public/:id', auth.declineSignupPublic);

// Password set via token
router.post("/set-password", auth.setPassword);

module.exports = router;
