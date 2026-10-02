import { Request, Response } from 'express';
import { IncomeModel } from '../models/incomeModel';
import { User } from '../models/userModel';

// Create a new income record
export const createIncome = async (req: Request, res: Response) => {
  try {
    const { amount, category_id, date } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const income = new IncomeModel({
      user,
      amount,
      category_id,
      date
    });

    await income.save();
    res.status(201).json(income);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all incomes for a user
export const getIncomes = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const incomes = await IncomeModel.find({ user });
    res.json(incomes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};