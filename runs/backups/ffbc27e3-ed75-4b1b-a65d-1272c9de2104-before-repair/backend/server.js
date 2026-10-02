const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');

const expenseRoutes = require('./routes/expense_routes');
const budgetRoutes = require('./routes/budget_routes');
const authMiddleware = require('./middleware/auth_middleware');
const errorHandler = require('./middleware/error_handler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());

// Routes
app.use('/api/expense', expenseRoutes);
app.use('/api/budget', budgetRoutes);

// Authentication middleware
app.use(authMiddleware);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});