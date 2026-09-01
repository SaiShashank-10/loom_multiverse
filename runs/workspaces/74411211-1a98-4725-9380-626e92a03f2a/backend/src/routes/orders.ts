import express from 'express';
import { OrderService } from '../services/orderService';

const router = express.Router();
const orderService = new OrderService();

// GET /orders - Retrieve a list of orders
router.get('/', async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error retrieving orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /orders - Create a new order
router.post('/', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity) {
      return res.status(400).json({ message: 'Product ID and quantity are required' });
    }
    const order = await orderService.createOrder(productId, quantity);
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /orders/:orderId - Retrieve a single order by ID
router.get('/:orderId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json(order);
  } catch (error) {
    console.error('Error retrieving order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /orders/:orderId - Update an existing order
router.put('/:orderId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    const { quantity, status } = req.body;
    if (!quantity && !status) {
      return res.status(400).json({ message: 'Quantity or status is required' });
    }
    const updatedOrder = await orderService.updateOrder(orderId, quantity, status);
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /orders/:orderId - Delete an existing order
router.delete('/:orderId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    const deletedOrder = await orderService.deleteOrder(orderId);
    if (!deletedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;