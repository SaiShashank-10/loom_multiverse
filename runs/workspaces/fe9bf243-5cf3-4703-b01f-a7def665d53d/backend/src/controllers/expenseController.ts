import { Request, Response } from 'express';
import { ExpenseModel } from '../models/expenseModel';
import { IncomeModel } from '../models/incomeModel';
import { BudgetModel } from '../models/budgetModel';
import { User } from '../models/userModel';
import { validateExpenseInput } from '../utils/validation';

export const createExpense = async (req: Request, res: Response) => {
    try {
        const { amount, category_id, date } = req.body;
        const user_id = req.user.id;

        // Validate input
        const { error } = validateExpenseInput({ amount, category_id, date });
        if (error) return res.status(400).json({ message: error.details[0].message });

        // Check if category exists for the user
        const category = await CategoryModel.findOne({
            _id: category_id,
            user_id,
        });
        if (!category) return res.status(404).json({ message: 'Category not found' });

        // Create new expense
        const expense = new ExpenseModel({
            amount,
            category_id,
            date,
            user_id,
        });

        await expense.save();
        res.status(201).json(expense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getExpenses = async (req: Request, res: Response) => {
    try {
        const user_id = req.user.id;

        // Get all expenses for the user
        const expenses = await ExpenseModel.find({ user_id }).sort({ date: -1 });

        res.status(200).json(expenses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateExpense = async (req: Request, res: Response) => {
    try {
        const { amount, category_id, date } = req.body;
        const expense_id = req.params.id;
        const user_id = req.user.id;

        // Validate input
        const { error } = validateExpenseInput({ amount, category_id, date });
        if (error) return res.status(400).json({ message: error.details[0].message });

        // Check if expense exists for the user
        const expense = await ExpenseModel.findOne({
            _id: expense_id,
            user_id,
        });
        if (!expense) return res.status(404).json({ message: 'Expense not found' });

        // Update expense
        expense.amount = amount;
        expense.category_id = category_id;
        expense.date = date;

        await expense.save();
        res.status(200).json(expense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteExpense = async (req: Request, res: Response) => {
    try {
        const expense_id = req.params.id;
        const user_id = req.user.id;

        // Check if expense exists for the user
        const expense = await ExpenseModel.findOne({
            _id: expense_id,
            user_id,
        });
        if (!expense) return res.status(404).json({ message: 'Expense not found' });

        // Delete expense
        await expense.remove();
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getExpensesByCategory = async (req: Request, res: Response) => {
    try {
        const category_id = req.params.category_id;
        const user_id = req.user.id;

        // Get all expenses for the category and user
        const expenses = await ExpenseModel.find({
            category_id,
            user_id,
        }).sort({ date: -1 });

        res.status(200).json(expenses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getExpensesByDateRange = async (req: Request, res: Response) => {
    try {
        const { start_date, end_date } = req.query;
        const user_id = req.user.id;

        // Get all expenses within the date range for the user
        const expenses = await ExpenseModel.find({
            user_id,
            date: {
                $gte: new Date(start_date as string),
                $lte: new Date(end_date as string),
            },
        }).sort({ date: -1 });

        res.status(200).json(expenses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};