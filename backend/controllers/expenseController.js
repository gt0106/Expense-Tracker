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

module.exports = {
  addExpense,
  getExpenses
};
