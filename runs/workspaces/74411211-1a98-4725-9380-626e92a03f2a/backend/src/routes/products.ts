import express from 'express';
import { body, validationResult } from 'express-validator';
import productService from '../services/productService';

const router = express.Router();

// GET /products - Retrieve a list of products
router.get('/', async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /products - Add a new product to the inventory
router.post(
  '/',
  [
    body('name').isString().not().isEmpty(),
    body('price').isNumeric().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, price } = req.body;
      const newProduct = await productService.addProduct(name, price);
      res.status(201).json(newProduct);
    } catch (error) {
      console.error('Error adding product:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

export default router;