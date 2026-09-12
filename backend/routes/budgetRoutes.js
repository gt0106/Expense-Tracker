const express = require("express");
const router = express.Router();

const {
  createBudget,
  getBudget
} = require("../controllers/budgetController");

const protect = require("../middleware/authMiddleware");

router.post("/", protect, createBudget);
router.get("/", protect, getBudget);

module.exports = router;