import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/userModel';
import Expense from '../models/expenseModel';

const router = express.Router();

// Middleware to check if the user is authenticated
const authenticateToken = (req: Request, res: Response, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Route to record a new expense
router.post(
    '/api/expense',
    authenticateToken,
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('category_id').isUUID().withMessage('Category ID must be a valid UUID'),
    body('date').isISO8601().withMessage('Date must be in ISO 8601 format'),
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        try {
            const { amount, category_id, date } = req.body;
            const user = await User.findById(req.user.id);
            if (!user) return res.status(404).json({ msg: 'User not found' });

            const expense = new Expense({
                user_id: user._id,
                amount,
                category_id,
                date
            });

            await expense.save();
            res.json(expense);
        } catch (error) {
            console.error(error.message);
            res.status(500).send('Server error');
        }
    }
);

// Route to retrieve all expenses for a user
router.get(
    '/api/expense/user/:user_id',
    authenticateToken,
    async (req: Request, res: Response) => {
        try {
            const user = await User.findById(req.params.user_id);
            if (!user) return res.status(404).json({ msg: 'User not found' });

            const expenses = await Expense.find({ user_id: user._id });
            res.json(expenses);
        } catch (error) {
            console.error(error.message);
            res.status(500).send('Server error');
        }
    }
);

export default router;