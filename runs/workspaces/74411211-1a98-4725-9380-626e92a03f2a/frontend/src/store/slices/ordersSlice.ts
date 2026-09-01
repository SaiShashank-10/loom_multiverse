import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Order } from '../../models/orderModel';

interface OrdersState {
  orders: Order[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: OrdersState = {
  orders: [],
  status: 'idle',
  error: null,
};

export const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    fetchOrdersStart(state) {
      state.status = 'loading';
      state.error = null;
    },
    fetchOrdersSuccess(state, action: PayloadAction<Order[]>) {
      state.status = 'succeeded';
      state.orders = action.payload;
    },
    fetchOrdersFailed(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.error = action.payload;
    },
    addOrderStart(state) {
      state.status = 'loading';
      state.error = null;
    },
    addOrderSuccess(state, action: PayloadAction<Order>) {
      state.status = 'succeeded';
      state.orders.push(action.payload);
    },
    addOrderFailed(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.error = action.payload;
    },
    updateOrderStart(state) {
      state.status = 'loading';
      state.error = null;
    },
    updateOrderSuccess(state, action: PayloadAction<Order>) {
      state.status = 'succeeded';
      const index = state.orders.findIndex(order => order.order_id === action.payload.order_id);
      if (index !== -1) {
        state.orders[index] = action.payload;
      }
    },
    updateOrderFailed(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.error = action.payload;
    },
    deleteOrderStart(state) {
      state.status = 'loading';
      state.error = null;
    },
    deleteOrderSuccess(state, action: PayloadAction<number>) {
      state.status = 'succeeded';
      state.orders = state.orders.filter(order => order.order_id !== action.payload);
    },
    deleteOrderFailed(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.error = action.payload;
    },
  },
});

export const {
  fetchOrdersStart,
  fetchOrdersSuccess,
  fetchOrdersFailed,
  addOrderStart,
  addOrderSuccess,
  addOrderFailed,
  updateOrderStart,
  updateOrderSuccess,
  updateOrderFailed,
  deleteOrderStart,
  deleteOrderSuccess,
  deleteOrderFailed,
} = ordersSlice.actions;

export default ordersSlice.reducer;