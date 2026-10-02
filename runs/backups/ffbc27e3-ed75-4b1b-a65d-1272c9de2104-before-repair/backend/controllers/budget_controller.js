const express = require('express');
const router = express.Router();
const budgetModel = require('../models/budget_model');
const authMiddleware = require('../middleware/auth_middleware');

// Middleware to check if the user has a valid token
router.use(authMiddleware);

// Get all budgets for a user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const budgets = await budgetModel.getAllBudgets(userId);
    res.status(200).json({ status: 'success', budgets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Create a new budget
router.post('/', async (req, res) => {
  try {
    const { amount, category, date } = req.body;
    const userId = req.user.userId;

    if (!amount || !category || !date) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const budget = await budgetModel.createBudget(userId, amount, category, date);
    res.status(201).json({ status: 'success', message: 'Budget created successfully', budget });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Update an existing budget
router.put('/:id', async (req, res) => {
  try {
    const { amount, category, date } = req.body;
    const userId = req.user.userId;
    const budgetId = req.params.id;

    if (!amount || !category || !date) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const updatedBudget = await budgetModel.updateBudget(userId, budgetId, amount, category, date);
    if (updatedBudget) {
      res.status(200).json({ status: 'success', message: 'Budget updated successfully', budget: updatedBudget });
    } else {
      res.status(404).json({ status: 'error', message: 'Budget not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Delete a budget
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const budgetId = req.params.id;

    const deletedBudget = await budgetModel.deleteBudget(userId, budgetId);
    if (deletedBudget) {
      res.status(200).json({ status: 'success', message: 'Budget deleted successfully' });
    } else {
      res.status(404).json({ status: 'error', message: 'Budget not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

module.exports = router;