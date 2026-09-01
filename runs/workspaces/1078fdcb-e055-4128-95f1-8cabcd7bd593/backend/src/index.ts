import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectToDatabase } from './database';
import authMiddleware from './middleware/auth';
import routeServiceRoutes from '../routeService/routes';
import accommodationServiceRoutes from '../accommodationService/routes';
import passDocumentServiceRoutes from '../passDocumentService/routes';
import billSplittingServiceRoutes from '../billSplittingService/routes';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Authentication middleware
app.use(authMiddleware);

// Routes
app.use('/route_plans', routeServiceRoutes);
app.use('/accommodations', accommodationServiceRoutes);
app.use('/pass_documents', passDocumentServiceRoutes);
app.use('/bills', billSplittingServiceRoutes);

// Connect to database
connectToDatabase()
  .then(() => {
    console.log('Connected to the database');
  })
  .catch((error) => {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});