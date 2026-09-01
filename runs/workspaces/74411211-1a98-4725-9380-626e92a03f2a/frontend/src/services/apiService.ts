import axios from 'axios';
import { Supplier, Product, Order } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  try {
    const response = await axios.get(`${API_URL}/suppliers`);
    return response.data;
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw error;
  }
};

export const addProduct = async (product: Product): Promise<Product> => {
  try {
    const response = await axios.post(`${API_URL}/products`, product);
    return response.data;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const response = await axios.get(`${API_URL}/orders`);
    return response.data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};