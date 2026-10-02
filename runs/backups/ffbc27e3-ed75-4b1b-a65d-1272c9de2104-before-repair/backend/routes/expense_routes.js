const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense_controller');
const authMiddleware = require('../middleware/auth_middleware');

// Middleware to authenticate requests
router.use(authMiddleware.authenticateToken);

// Route to record a new expense
router.post('/', async (req, res) => {
  try {
    const result = await expenseController.recordExpense(req.body);
    res.status(201).json({ status: 'success', message: 'Expense recorded successfully' });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Route to fetch all expenses for a user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const expenses = await expenseController.getUserExpenses(userId);
    res.status(200).json({ status: 'success', expenses });
  } catch (error) {
    res.status(404).json({ status: 'error', message: error.message });
  }
});

module.exports = router;