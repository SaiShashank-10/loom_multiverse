import express from 'express';
import { celebrate, Joi } from 'celebrate';
import { OrderService } from '../services/orderService';

const router = express.Router();
const orderService = new OrderService();

// Middleware to validate order data
const validateOrderData = celebrate({
  body: Joi.object().keys({
    userId: Joi.number().integer().positive().required(),
    productId: Joi.number().integer().positive().required(),
    quantity: Joi.number().integer().positive().required(),
  }),
});

// Get all orders for a user
router.get(
  '/',
  validateOrderData,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.query;
      if (!userId || isNaN(Number(userId))) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      const orders = await orderService.getOrdersByUserId(Number(userId));
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Create a new order
router.post(
  '/',
  validateOrderData,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId, productId, quantity } = req.body;
      const order = await orderService.createOrder(userId, productId, quantity);
      res.status(201).json(order);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Update an existing order
router.put(
  '/:orderId',
  validateOrderData,
  async (req: express.Request, res: express.Response) => {
    try {
      const { orderId } = req.params;
      if (!orderId || isNaN(Number(orderId))) {
        return res.status(400).json({ error: 'Invalid order ID' });
      }
      const { userId, productId, quantity } = req.body;
      const updatedOrder = await orderService.updateOrder(
        Number(orderId),
        userId,
        productId,
        quantity,
      );
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Delete an existing order
router.delete(
  '/:orderId',
  async (req: express.Request, res: express.Response) => {
    try {
      const { orderId } = req.params;
      if (!orderId || isNaN(Number(orderId))) {
        return res.status(400).json({ error: 'Invalid order ID' });
      }
      await orderService.deleteOrder(Number(orderId));
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;