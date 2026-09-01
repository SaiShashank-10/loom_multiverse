import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store';
import { fetchSuppliers, fetchProducts, fetchOrders } from './services/apiService';
import SuppliersList from './components/SuppliersList';
import ProductForm from './components/ProductForm';
import OrdersList from './components/OrdersList';

const App: React.FC = () => {
  const dispatch = useDispatch();
  const suppliers = useSelector((state: RootState) => state.suppliers.list);
  const products = useSelector((state: RootState) => state.products.list);
  const orders = useSelector((state: RootState) => state.orders.list);

  React.useEffect(() => {
    dispatch(fetchSuppliers());
    dispatch(fetchProducts());
    dispatch(fetchOrders());
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<SuppliersList suppliers={suppliers} />} />
        <Route path="/products" element={<ProductForm products={products} />} />
        <Route path="/orders" element={<OrdersList orders={orders} />} />
      </Routes>
    </Router>
  );
};

export default App;