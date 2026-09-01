import { configureStore } from '@reduxjs/toolkit';
import suppliersReducer from '../slices/suppliersSlice';
import productsReducer from '../slices/productsSlice';
import ordersReducer from '../slices/ordersSlice';

const store = configureStore({
  reducer: {
    suppliers: suppliersReducer,
    products: productsReducer,
    orders: ordersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;