import React from 'react';
import { useOrders } from '../hooks/useOrders';

const OrderList: React.FC = () => {
  const { orders, isLoading, error } = useOrders();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Order List</h2>
      <ul>
        {orders.map(order => (
          <li key={order.id}>
            <strong>Product:</strong> {order.product.name} - 
            <strong>Quantity:</strong> {order.quantity} - 
            <strong>Status:</strong> {order.status}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OrderList;