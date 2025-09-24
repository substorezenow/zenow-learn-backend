const express = require("express");
const { validateAuth } = require("../middleware/validateAuth");
const { authController } = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/register", validateAuth, authController.register);
router.post("/login", validateAuth, authController.login);

router.post("/validate-token", authenticate, authController.tokenValidated);

module.exports = router;
