import { Bill } from '../database/models';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createBill = async (routePlanId: string, amount: number): Promise<Bill> => {
  try {
    const bill = await Bill.create({ route_plan_id: routePlanId, amount });
    return bill;
  } catch (error) {
    throw new Error(`Failed to create bill for route plan ${routePlanId}: ${error.message}`);
  }
};

export const initiatePayment = async (billId: string): Promise<{ order_id: string; razorpay_payment_link: string }> => {
  try {
    const bill = await Bill.findById(billId);
    if (!bill) throw new Error(`Bill with ID ${billId} not found`);

    const options = {
      amount: bill.amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `receipt_${bill._id}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    return { order_id: order.id, razorpay_payment_link: order.entity.razorpay_payment_link };
  } catch (error) {
    throw new Error(`Failed to initiate payment for bill ${billId}: ${error.message}`);
  }
};

export const verifyPayment = async (orderId: string, paymentId: string): Promise<void> => {
  try {
    await razorpay.payments.fetch(orderId);
    await razorpay.payments.verify(paymentId, {razorpay_order_id: orderId});
  } catch (error) {
    throw new Error(`Failed to verify payment for order ${orderId}: ${error.message}`);
  }
};

export const updateBillStatus = async (billId: string, status: 'paid' | 'failed'): Promise<void> => {
  try {
    await Bill.findByIdAndUpdate(billId, { status });
  } catch (error) {
    throw new Error(`Failed to update bill status for bill ${billId}: ${error.message}`);
  }
};