import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Product } from '../../models/productModel';

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  products: [],
  loading: false,
  error: null,
};

export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    fetchProductsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchProductsSuccess(state, action: PayloadAction<Product[]>) {
      state.loading = false;
      state.products = action.payload;
    },
    fetchProductsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    addProductStart(state) {
      state.loading = true;
      state.error = null;
    },
    addProductSuccess(state, action: PayloadAction<Product>) {
      state.loading = false;
      state.products.push(action.payload);
    },
    addProductFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { fetchProductsStart, fetchProductsSuccess, fetchProductsFailure, addProductStart, addProductSuccess, addProductFailure } = productsSlice.actions;

export default productsSlice.reducer;