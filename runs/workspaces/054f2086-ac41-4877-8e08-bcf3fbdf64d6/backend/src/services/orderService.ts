import { Order } from '../models/orderModel';
import { Product } from '../models/productModel';
import { User } from '../models/userModel';

export class OrderService {
  public async createOrder(userId: number, productId: number, quantity: number): Promise<Order> {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const order = await Order.create({
        user_id: userId,
        product_id: productId,
        quantity,
        status: 'pending',
      });

      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  public async getOrdersByUserId(userId: number): Promise<Order[]> {
    try {
      const orders = await Order.findAll({
        where: { user_id: userId },
        include: [Product, User],
      });

      return orders;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  public async updateOrderStatus(orderId: number, status: string): Promise<Order> {
    try {
      const order = await Order.findByPk(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      order.status = status;
      await order.save();

      return order;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
}