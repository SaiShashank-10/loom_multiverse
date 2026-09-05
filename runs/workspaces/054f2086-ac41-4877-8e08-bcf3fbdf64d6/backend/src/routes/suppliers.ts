import express from 'express';
import { Supplier } from '../models/supplierModel';
import { supplierService } from '../services/supplierService';

const router = express.Router();

// Middleware to authenticate requests
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  // Verify the token and attach user to request
  // This is a placeholder for actual authentication logic
  req.user = { id: 1 }; // Assuming authenticated user ID is 1
  next();
};

// Get all suppliers
router.get('/', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const suppliers: Supplier[] = await supplierService.getAllSuppliers();
    res.status(200).json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Add a new supplier
router.post('/', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { name, location } = req.body;
    if (!name || !location) {
      return res.status(400).json({ message: 'Name and location are required' });
    }
    const newSupplier: Supplier = await supplierService.addSupplier(name, location);
    res.status(201).json(newSupplier);
  } catch (error) {
    console.error('Error adding supplier:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;