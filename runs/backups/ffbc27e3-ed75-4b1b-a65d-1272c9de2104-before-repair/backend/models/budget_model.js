const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    ref: 'User',
  },
  amount: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

budgetSchema.pre('save', async function (next) {
  try {
    const user = await User.findById(this.user_id);
    if (!user.budgets.includes(this._id)) {
      user.budgets.push(this._id);
      await user.save();
    }
    next();
  } catch (error) {
    return next(error);
  }
});

budgetSchema.post('remove', async function (next) {
  try {
    const user = await User.findById(this.user_id);
    if (user.budgets.includes(this._id)) {
      user.budgets.pull(this._id);
      await user.save();
    }
    next();
  } catch (error) {
    return next(error);
  }
});

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;