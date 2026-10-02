import mongoose, { Document } from 'mongoose';

interface IExpense extends Document {
  user_id: string;
  amount: number;
  category_id: string;
  date: Date;
}

const expenseSchema = new mongoose.Schema<IExpense>({
  user_id: {
    type: String,
    required: true,
    ref: 'User',
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  category_id: {
    type: String,
    required: true,
    ref: 'Category',
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

expenseSchema.pre('save', async function (next) {
  try {
    // Perform any pre-save logic here if needed
    next();
  } catch (error) {
    return next(error);
  }
});

expenseSchema.post('save', async function (doc, next) {
  try {
    // Perform any post-save logic here if needed
    next();
  } catch (error) {
    return next(error);
  }
});

const Expense = mongoose.model<IExpense>('Expense', expenseSchema);

export default Expense;