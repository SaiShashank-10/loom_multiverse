const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budget_controller');
const authMiddleware = require('../middleware/auth_middleware');

// Middleware to authenticate requests
router.use(authMiddleware.authenticateToken);

// Create a new budget for a user
router.post('/', async (req, res) => {
  try {
    const { amount, category, date } = req.body;
    const userId = req.user.userId;

    const result = await budgetController.createBudget(userId, amount, category, date);
    res.status(201).json({ status: 'success', message: 'Budget set successfully' });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Get all budgets for a user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const budgets = await budgetController.getBudgets(userId);
    res.status(200).json({ status: 'success', budgets });
  } catch (error) {
    res.status(404).json({ status: 'error', message: error.message });
  }
});

module.exports = router;