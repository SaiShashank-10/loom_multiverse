const express = require('express');
const router = express.Router();
const expenseModel = require('../models/expense_model');
const budgetModel = require('../models/budget_model');
const authMiddleware = require('../middleware/auth_middleware');

// Middleware to validate expense data
const validateExpenseData = (req, res, next) => {
  const { amount, category, date } = req.body;
  if (!amount || !category || !date) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  next();
};

// Middleware to validate budget data
const validateBudgetData = (req, res, next) => {
  const { amount, category, date } = req.body;
  if (!amount || !category || !date) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  next();
};

// Route to record a new expense
router.post('/api/expense', authMiddleware.authenticateToken, validateExpenseData, async (req, res) => {
  try {
    const { user_id, amount, category, date } = req.body;
    await expenseModel.create(user_id, amount, category, date);
    await budgetModel.updateBudget(user_id, category, amount);
    res.status(201).json({ message: 'Expense recorded successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to fetch all expenses for a user
router.get('/api/expense/:user_id', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.params;
    const expenses = await expenseModel.getAll(user_id);
    res.status(200).json({ expenses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;