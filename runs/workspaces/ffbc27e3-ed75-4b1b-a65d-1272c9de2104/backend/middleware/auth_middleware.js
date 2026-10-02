const db = require('../config/db_config');
module.exports = (req, res, next) => {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const session = db.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires > ?').get(token, Date.now());
  if (!session) return res.status(401).json({ message: 'Unauthorized' });
  req.userId = session.user_id;
  next();
};
