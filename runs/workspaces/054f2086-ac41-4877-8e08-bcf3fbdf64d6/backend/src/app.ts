import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectToDatabase } from './database';
import authMiddleware from './middleware/authMiddleware';
import suppliersRoutes from '../routes/suppliers';
import productsRoutes from '../routes/products';
import ordersRoutes from '../routes/orders';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('combined'));

// Database connection
connectToDatabase()
  .then(() => {
    console.log('Connected to the database');
  })
  .catch((error) => {
    console.error('Failed to connect to the database', error);
    process.exit(1);
  });

// Authentication middleware
app.use(authMiddleware);

// Routes
app.use('/suppliers', suppliersRoutes);
app.use('/products', productsRoutes);
app.use('/orders', ordersRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});