const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { randomUUID, randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(scrypt);
const db = require('./config/db_config');
const auth = require('./middleware/auth_middleware');
const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/ }));
app.use(express.json({ limit: '64kb' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.post('/api/auth/:action', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!['register', 'login'].includes(req.params.action)) return res.sendStatus(404);
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Use a valid email and a password of 8â€“128 characters' });
    const normalized = email.trim().toLowerCase();
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalized);
    if (req.params.action === 'register') {
      if (user) return res.status(409).json({ message: 'Account already exists' });
      const salt = randomBytes(16).toString('hex');
      const hash = (await derive(password, salt, 64)).toString('hex');
      user = { id: randomUUID(), email: normalized, salt, password: hash };
      db.prepare('INSERT INTO users VALUES (?, ?, ?, ?)').run(user.id, normalized, salt, hash);
    } else {
      const hash = await derive(password, user?.salt || 'invalid-user', 64);
      if (!user || !timingSafeEqual(hash, Buffer.from(user.password, 'hex'))) return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(token, user.id, Date.now() + 86400000);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) { next(error); }
});
app.post('/api/logout', auth, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.headers.authorization.replace(/^Bearer /, ''));
  res.sendStatus(204);
});
app.use('/api/expense', require('./routes/expense_routes'));
app.use('/api/budget', require('./routes/budget_routes'));
app.use(require('./middleware/error_handler'));
if (require.main === module) app.listen(Number(process.env.PORT || 5000), process.env.HOST || '127.0.0.1', () => console.log('ExpenseMaster API: http://127.0.0.1:' + (process.env.PORT || 5000)));
module.exports = app;
