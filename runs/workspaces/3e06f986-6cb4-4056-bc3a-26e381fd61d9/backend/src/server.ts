import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import suppliersRoutes from './routes/suppliers';
import productsRoutes from './routes/products';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());

// Mock Database connection
const connectToDatabase = async () => {
  console.log('Mocking database connection (driver not generated)...');
  return true;
};

connectToDatabase()
  .then(() => {
    console.log('Connected to the database');
  })
  .catch((error) => {
    console.error('Failed to connect to the database', error);
    process.exit(1);
  });

// Routes
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/products', productsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});