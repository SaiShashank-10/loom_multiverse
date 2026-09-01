import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/authMiddleware';
import suppliersRoutes from '../routes/suppliers';
import productsRoutes from '../routes/products';
import ordersRoutes from '../routes/orders';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());

// Authentication middleware
app.use(authMiddleware);

// Routes
app.use('/suppliers', suppliersRoutes);
app.use('/products', productsRoutes);
app.use('/orders', ordersRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});