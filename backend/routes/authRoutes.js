const express = require("express");

const {
  registerUser,
  loginUser,
  updateProfile,
  getProfile
} = require("../controllers/authcontroller.js");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

module.exports = router;
