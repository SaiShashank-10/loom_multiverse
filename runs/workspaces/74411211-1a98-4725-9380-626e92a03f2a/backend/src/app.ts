import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authMiddleware } from '../middleware/authMiddleware';
import { suppliersRouter } from '../routes/suppliers';
import { productsRouter } from '../routes/products';
import { ordersRouter } from '../routes/orders';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());
app.use(morgan('combined'));

// Routes
app.use('/api/suppliers', authMiddleware, suppliersRouter);
app.use('/api/products', authMiddleware, productsRouter);
app.use('/api/orders', authMiddleware, ordersRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});