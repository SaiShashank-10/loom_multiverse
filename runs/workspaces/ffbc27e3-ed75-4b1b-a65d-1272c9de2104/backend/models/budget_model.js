const db = require('../config/db_config');
const { randomUUID } = require('node:crypto');
exports.list = user => db.prepare('SELECT id, amount, category, date FROM budgets WHERE user_id = ? ORDER BY date DESC').all(user);
exports.create = (user, value) => {
  const item = { id: randomUUID(), ...value };
  db.prepare('INSERT INTO budgets (id, user_id, amount, category, date) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, category, date) DO UPDATE SET amount = excluded.amount').run(item.id, user, item.amount, item.category, item.date);
  return item;
};
exports.remove = (user, id) => db.prepare('DELETE FROM budgets WHERE user_id = ? AND id = ?').run(user, id).changes;
