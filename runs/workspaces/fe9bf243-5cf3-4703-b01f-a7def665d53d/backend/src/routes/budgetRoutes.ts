import express, { Request, Response } from 'express';
import budgetController from '../controllers/budgetController';

const router = express.Router();

// Create a new budget
router.post('/', async (req: Request, res: Response) => {
    try {
        const budget = await budgetController.createBudget(req.body);
        res.status(201).json(budget);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get all budgets for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId;
        const budgets = await budgetController.getBudgetsByUser(userId);
        res.status(200).json(budgets);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// Update a budget
router.put('/:budgetId', async (req: Request, res: Response) => {
    try {
        const budgetId = req.params.budgetId;
        const updatedBudget = await budgetController.updateBudget(budgetId, req.body);
        res.status(200).json(updatedBudget);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a budget
router.delete('/:budgetId', async (req: Request, res: Response) => {
    try {
        const budgetId = req.params.budgetId;
        await budgetController.deleteBudget(budgetId);
        res.status(204).send();
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

export default router;