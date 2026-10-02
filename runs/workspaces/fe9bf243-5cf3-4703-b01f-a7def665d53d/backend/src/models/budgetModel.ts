import mongoose, { Document } from 'mongoose';

export interface Budget extends Document {
  user_id: string;
  category_id: string;
  amount: number;
  start_date: Date;
  end_date: Date;
}

const budgetSchema = new mongoose.Schema<Budget>({
  user_id: {
    type: String,
    required: true,
    ref: 'User',
  },
  category_id: {
    type: String,
    required: true,
    ref: 'Category',
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  start_date: {
    type: Date,
    required: true,
  },
  end_date: {
    type: Date,
    required: true,
  },
});

budgetSchema.pre('save', async function (next) {
  if (!this.isModified('end_date')) return next();

  const startDate = this.start_date;
  const endDate = this.end_date;

  if (startDate >= endDate) {
    throw new Error('End date must be after start date');
  }

  next();
});

budgetSchema.post('save', async function (doc: Budget, next) {
  try {
    await doc.user.updateOne(
      { _id: doc.user_id },
      { $inc: { total_budgeted: doc.amount } }
    );
  } catch (error) {
    console.error('Error updating user budget:', error);
    next(error);
  }
});

budgetSchema.post('remove', async function (doc: Budget, next) {
  try {
    await doc.user.updateOne(
      { _id: doc.user_id },
      { $inc: { total_budgeted: -doc.amount } }
    );
  } catch (error) {
    console.error('Error updating user budget:', error);
    next(error);
  }
});

export default mongoose.model<Budget>('Budget', budgetSchema);