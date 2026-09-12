const Expense = require("../models/expense");

const addExpense = async (req, res) => {
  try {
    const {
      title,
      amount,
      category,
      date,
      description
    } = req.body;

    const expense = await Expense.create({
      user: req.user.id,
      title,
      amount,
      category,
      date,
      description
    });

    res.status(201).json(expense);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({
      user: req.user.id
    }).sort({ date: -1 });

    res.json(expenses);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    expense.title = req.body.title || expense.title;
    expense.amount = req.body.amount || expense.amount;
    expense.category = req.body.category || expense.category;
    expense.date = req.body.date || expense.date;
    expense.description = req.body.description || expense.description;

    const updatedExpense = await expense.save();

    res.json({
      message: "Expense updated successfully",
      expense: updatedExpense
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update expense",
      error: error.message
    });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    await Expense.deleteOne({
      _id: req.params.id
    });

    res.json({
      message: "Expense deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete expense",
      error: error.message
    });
  }
};

module.exports = {
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense
};
