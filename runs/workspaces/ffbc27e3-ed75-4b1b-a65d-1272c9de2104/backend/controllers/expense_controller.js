const model = require('../models/expense_model');
exports.list = (req, res) => res.json(model.list(req.userId));
exports.create = (req, res) => {
  const { amount, category, date } = req.body;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0  || typeof category !== 'string' || !category.trim() || category.length > 80 || typeof date !== 'string' || !Number.isFinite(Date.parse(date))) return res.status(400).json({ message: 'Provide a valid nonzero amount, category and date' });
  const normalizedDate = new Date(date).toISOString();
  res.status(201).json(model.create(req.userId, { amount, category: category.trim(), date: normalizedDate }));
};
exports.remove = (req, res) => {
  const removed = model.remove(req.userId, req.params.id);
  res.status(removed ? 204 : 404).end();
};
