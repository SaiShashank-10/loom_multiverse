import express, { Request, Response } from 'express';
import incomeController from '../controllers/incomeController';

const router = express.Router();

// POST /api/income - Record a new income
router.post('/', incomeController.createIncome);

// GET /api/income/user/:user_id - Retrieve all incomes for a user
router.get('/user/:user_id', incomeController.getIncomesByUser);

export default router;