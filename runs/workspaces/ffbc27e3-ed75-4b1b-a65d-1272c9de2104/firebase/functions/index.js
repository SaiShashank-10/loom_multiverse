const functions = require('firebase-functions');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Import routes
const expenseRoutes = require('./expense_routes');
const budgetRoutes = require('./budget_routes');

// Use routes
app.use('/api/expense', expenseRoutes);
app.use('/api/budget', budgetRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Export the API as a Firebase Cloud Function
exports.api = functions.https.onRequest(app);