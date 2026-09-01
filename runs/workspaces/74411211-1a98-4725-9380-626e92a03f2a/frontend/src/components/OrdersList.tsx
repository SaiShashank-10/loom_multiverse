import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { fetchOrders } from '../../store/slices/ordersSlice';
import OrderItem from './OrderItem';

const OrdersList: React.FC = () => {
  const dispatch = useDispatch();
  const orders = useSelector((state: RootState) => state.orders.orders);
  const loading = useSelector((state: RootState) => state.orders.loading);
  const error = useSelector((state: RootState) => state.orders.error);

  useEffect(() => {
    if (!orders.length) {
      dispatch(fetchOrders());
    }
  }, [dispatch, orders]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Order List</h2>
      <ul>
        {orders.map((order) => (
          <li key={order.order_id}>
            <OrderItem order={order} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OrdersList;