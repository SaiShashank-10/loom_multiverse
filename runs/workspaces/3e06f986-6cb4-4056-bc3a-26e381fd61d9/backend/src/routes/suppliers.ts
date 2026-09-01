import express from 'express';
import { body, validationResult } from 'express-validator';
import SupplierController from '../controllers/supplierController';

const router = express.Router();

const supplierController = new SupplierController();

// GET /suppliers - Retrieve a list of suppliers
router.get('/', supplierController.getSuppliers.bind(supplierController));

// POST /suppliers - Add a new supplier
router.post(
  '/',
  [
    body('name').isString().not().isEmpty().withMessage('Name is required'),
    body('location').optional().isString(),
  ],
  supplierController.addSupplier.bind(supplierController)
);

// PUT /suppliers/:id - Update details of a specific supplier
router.put(
  '/:id',
  [
    body('name').isString().not().isEmpty().withMessage('Name is required'),
    body('location').optional().isString(),
  ],
  supplierController.updateSupplier.bind(supplierController)
);

// DELETE /suppliers/:id - Delete a specific supplier
router.delete('/:id', supplierController.deleteSupplier.bind(supplierController));

export default router;