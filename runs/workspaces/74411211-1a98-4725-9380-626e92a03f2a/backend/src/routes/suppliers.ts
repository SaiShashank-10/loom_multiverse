import express from 'express';
import { Supplier } from '../models/supplierModel';
import { authMiddleware } from '../middleware/authMiddleware';
import { supplierService } from '../services/supplierService';

const router = express.Router();

// Middleware to authenticate requests
router.use(authMiddleware);

/**
 * @swagger
 * /suppliers:
 *   get:
 *     summary: Retrieve a list of suppliers.
 *     description: Returns a list of all suppliers.
 *     responses:
 *       200:
 *         description: A list of suppliers.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Supplier'
 */
router.get('/', async (req, res) => {
  try {
    const suppliers = await supplierService.getAllSuppliers();
    res.status(200).json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /suppliers:
 *   post:
 *     summary: Add a new supplier.
 *     description: Adds a new supplier to the database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Supplier'
 *     responses:
 *       201:
 *         description: Supplier created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Supplier'
 */
router.post('/', async (req, res) => {
  try {
    const newSupplier = req.body as Supplier;
    const createdSupplier = await supplierService.createSupplier(newSupplier);
    res.status(201).json(createdSupplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;