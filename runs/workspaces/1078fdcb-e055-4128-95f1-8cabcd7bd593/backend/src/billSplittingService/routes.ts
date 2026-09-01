import express from 'express';
import { BillSplittingService } from '../services';
import authMiddleware from '../../middleware/auth';

const router = express.Router();
const billSplittingService = new BillSplittingService();

// Create a new group bill for a route plan
router.post('/bills/:routePlanId', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    const routePlanId = req.params.routePlanId;
    const userId = req.user._id;

    const bill = await billSplittingService.createBill(routePlanId, userId, amount);
    res.status(201).json(bill);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

// Retrieve all group bills for a specific route plan
router.get('/bills/:routePlanId', authMiddleware, async (req, res) => {
  try {
    const routePlanId = req.params.routePlanId;
    const userId = req.user._id;

    const bills = await billSplittingService.getBillsByRoutePlan(routePlanId, userId);
    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve bills' });
  }
});

export default router;