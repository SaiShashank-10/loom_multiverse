import express from 'express';
import { BillSplittingService } from '../services';
import { authMiddleware } from '../../middleware/auth';

const router = express.Router();

// Create a new bill split request
router.post('/bills', authMiddleware, async (req, res) => {
  try {
    const { routePlanId, amount } = req.body;
    const userId = req.user._id;

    if (!routePlanId || !amount) {
      return res.status(400).json({ error: 'Route plan ID and amount are required' });
    }

    const bill = await BillSplittingService.createBill(routePlanId, userId, amount);
    res.status(201).json(bill);
  } catch (error) {
    console.error('Error creating bill split request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all bills for a specific route plan
router.get('/bills/:routePlanId', authMiddleware, async (req, res) => {
  try {
    const { routePlanId } = req.params;
    const userId = req.user._id;

    if (!routePlanId) {
      return res.status(400).json({ error: 'Route plan ID is required' });
    }

    const bills = await BillSplittingService.getBillsByRoutePlan(routePlanId, userId);
    res.json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;