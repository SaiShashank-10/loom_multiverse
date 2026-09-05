import express from 'express';
import { body, validationResult } from 'express-validator';
import { Product } from '../models/productModel';
import { ProductService } from '../services/productService';

const router = express.Router();
const productService = new ProductService();

// Middleware to validate product creation request
const validateProductCreation = [
  body('name').not().isEmpty().withMessage('Name is required'),
  body('price').isNumeric().withMessage('Price must be a number')
];

// GET /products - Retrieve all products
router.get('/', async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /products - Add a new product
router.post('/', validateProductCreation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, price } = req.body;
    const product = await productService.createProduct(name, price);
    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /products/:id - Retrieve a single product by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await productService.getProductById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /products/:id - Update a product by ID
router.put('/:id', validateProductCreation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  try {
    const { name, price } = req.body;
    const updatedProduct = await productService.updateProduct(id, name, price);
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /products/:id - Delete a product by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedProduct = await productService.deleteProduct(id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;