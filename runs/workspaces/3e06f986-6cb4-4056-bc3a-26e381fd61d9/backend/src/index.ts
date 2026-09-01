import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import { connectToDatabase } from './database';
import { authMiddleware } from './middleware/authMiddleware';
import suppliersRouter from '../routes/suppliers';
import productsRouter from '../routes/products';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());

// Authentication middleware
app.use(authMiddleware);

// Routes
app.use('/suppliers', suppliersRouter);
app.use('/products', productsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
const startServer = async () => {
  try {
    await connectToDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
};

startServer();