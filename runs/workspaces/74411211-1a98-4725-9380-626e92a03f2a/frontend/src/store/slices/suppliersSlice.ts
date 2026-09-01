import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Supplier } from '../../models/Supplier';

interface SuppliersState {
  suppliers: Supplier[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: SuppliersState = {
  suppliers: [],
  status: 'idle',
  error: null,
};

export const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {
    fetchSuppliersStart(state) {
      state.status = 'loading';
    },
    fetchSuppliersSuccess(state, action: PayloadAction<Supplier[]>) {
      state.status = 'succeeded';
      state.suppliers = action.payload;
    },
    fetchSuppliersFailed(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.error = action.payload;
    },
  },
});

export const { fetchSuppliersStart, fetchSuppliersSuccess, fetchSuppliersFailed } =
  suppliersSlice.actions;

export default suppliersSlice.reducer;