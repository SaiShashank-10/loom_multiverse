import express from 'express';
import { body, validationResult } from 'express-validator';
import * as ProductController from '../controllers/productController';

const router = express.Router();

// GET /products - Retrieve a list of products
router.get('/', ProductController.getProducts);

// POST /products - Add a new product
router.post(
  '/',
  [
    body('name').not().isEmpty().withMessage('Product name is required'),
    body('price').isNumeric().withMessage('Price must be a number')
  ],
  ProductController.createProduct
);

// GET /products/:id - Retrieve details of a specific product
router.get('/:id', ProductController.getProductById);

// PUT /products/:id - Update details of a specific product
router.put(
  '/:id',
  [
    body('name').not().isEmpty().withMessage('Product name is required'),
    body('price').isNumeric().withMessage('Price must be a number')
  ],
  ProductController.updateProduct
);

// DELETE /products/:id - Delete a specific product
router.delete('/:id', ProductController.deleteProduct);

export default router;