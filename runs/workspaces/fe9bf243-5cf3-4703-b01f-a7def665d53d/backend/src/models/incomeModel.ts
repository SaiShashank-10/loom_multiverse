import mongoose, { Document } from 'mongoose';

interface IncomeDocument extends Document {
  userId: string;
  amount: number;
  categoryId: string;
  date: Date;
}

const incomeSchema = new mongoose.Schema<IncomeDocument>({
  userId: {
    type: String,
    required: true,
    ref: 'User',
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  categoryId: {
    type: String,
    required: true,
    ref: 'Category',
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

incomeSchema.pre('save', async function (next) {
  try {
    // Perform any pre-save logic here if needed
    next();
  } catch (error) {
    return next(error);
  }
});

incomeSchema.post('save', async function (doc, next) {
  try {
    // Perform any post-save logic here if needed
    next();
  } catch (error) {
    return next(error);
  }
});

const Income = mongoose.model<IncomeDocument>('Income', incomeSchema);

export default Income;