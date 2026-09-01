import { Order } from '../models/orderModel';
import { Product } from '../models/productModel';
import { Supplier } from '../models/supplierModel';
import { NotFoundError, BadRequestError } from '../utils/errors';

export class OrderService {
  public async createOrder(orderData: Partial<Order>): Promise<Order> {
    const { product_id, quantity } = orderData;

    // Validate input
    if (!product_id || !quantity) {
      throw new BadRequestError('Product ID and quantity are required');
    }

    // Fetch the product from the database
    const product = await Product.findOne({ where: { product_id } });
    if (!product) {
      throw new NotFoundError(`Product with ID ${product_id} not found`);
    }

    // Check if there is enough stock
    if (product.stock < quantity) {
      throw new BadRequestError('Not enough stock available');
    }

    // Create the order
    const order = await Order.create({
      product_id,
      quantity,
      status: 'Pending',
    });

    // Update the product stock
    await Product.update(
      { stock: product.stock - quantity },
      { where: { product_id } }
    );

    return order;
  }

  public async getOrders(): Promise<Order[]> {
    return Order.findAll();
  }

  public async getOrderById(orderId: number): Promise<Order> {
    const order = await Order.findOne({ where: { order_id: orderId } });
    if (!order) {
      throw new NotFoundError(`Order with ID ${orderId} not found`);
    }
    return order;
  }

  public async updateOrderStatus(orderId: number, status: string): Promise<Order> {
    const order = await Order.findOne({ where: { order_id: orderId } });
    if (!order) {
      throw new NotFoundError(`Order with ID ${orderId} not found`);
    }

    // Validate the status
    if (!['Pending', 'Shipped', 'Delivered'].includes(status)) {
      throw new BadRequestError('Invalid order status');
    }

    // Update the order status
    await Order.update(
      { status },
      { where: { order_id: orderId } }
    );

    return Order.findOne({ where: { order_id: orderId } });
  }
}