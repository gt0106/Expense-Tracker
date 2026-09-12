const Budget = require("../models/budget");

// Create or update budget
const createBudget = async (req, res) => {
  try {
    const { month, year, amount } = req.body;

    if (!month || !year || amount === undefined) {
      return res.status(400).json({
        message: "Month, year and amount are required"
      });
    }

    const existingBudget = await Budget.findOne({
      user: req.user.id,
      month,
      year
    });

    if (existingBudget) {
      existingBudget.amount = amount;

      const updatedBudget = await existingBudget.save();

      return res.json({
        message: "Budget updated successfully",
        budget: updatedBudget
      });
    }

    const budget = await Budget.create({
      user: req.user.id,
      month,
      year,
      amount
    });

    res.status(201).json({
      message: "Budget created successfully",
      budget
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create budget",
      error: error.message
    });
  }
};


// Get user's budget
const getBudget = async (req, res) => {
  try {
    const { month, year } = req.query;

    const budget = await Budget.findOne({
      user: req.user.id,
      month,
      year
    });

    if (!budget) {
      return res.status(404).json({
        message: "Budget not found"
      });
    }

    res.json(budget);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get budget",
      error: error.message
    });
  }
};


module.exports = {
  createBudget,
  getBudget
};