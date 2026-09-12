const Expense = require("../models/expense");
const Budget = require("../models/budget");

const getDashboardAnalytics = async (req, res) => {
  try {
    const now = new Date();

    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get current month's expenses
    const expenses = await Expense.find({
      user: req.user.id,
      date: {
        $gte: new Date(currentYear, currentMonth - 1, 1),
        $lt: new Date(currentYear, currentMonth, 1)
      }
    }).sort({ date: -1 });

    // Get current month's budget
    const budget = await Budget.findOne({
      user: req.user.id,
      month: currentMonth,
      year: currentYear
    });

    // Total spent
    const totalSpent = expenses.reduce(
      (total, expense) => total + expense.amount,
      0
    );

    // Monthly budget
    const monthlyBudget = budget ? budget.amount : 0;

    // Remaining budget
    const remaining = monthlyBudget - totalSpent;

    // Category breakdown
    const categoryTotals = {};

    expenses.forEach((expense) => {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = 0;
      }

      categoryTotals[expense.category] += expense.amount;
    });

    const categoryBreakdown = Object.entries(categoryTotals).map(
      ([category, amount]) => ({
        category,
        amount
      })
    );

    // Top category
    let topCategory = null;

    if (categoryBreakdown.length > 0) {
      topCategory = categoryBreakdown.reduce((max, current) =>
        current.amount > max.amount ? current : max
      ).category;
    }

    // Average daily spending
    const today = now.getDate();

    const averageDailySpending =
      today > 0 ? totalSpent / today : 0;

    // Largest expense
    let largestExpense = null;

    if (expenses.length > 0) {
      largestExpense = expenses.reduce((max, current) =>
        current.amount > max.amount ? current : max
      );
    }

    // Recent expenses
    const recentExpenses = expenses.slice(0, 5);

    res.json({
      totalSpent,
      monthlyBudget,
      remaining,
      topCategory,
      categoryBreakdown,
      averageDailySpending,
      largestExpense,
      recentExpenses
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to get dashboard analytics",
      error: error.message
    });
  }
};

module.exports = {
  getDashboardAnalytics
};
