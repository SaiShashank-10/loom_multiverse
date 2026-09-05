import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SupplierList from './components/SupplierList';
import ProductForm from './components/ProductForm';
import OrderList from './components/OrderList';
import useSuppliers from './hooks/useSuppliers';
import useProducts from './hooks/useProducts';
import useOrders from './hooks/useOrders';

const App: React.FC = () => {
  const { suppliers, isLoading: suppliersLoading } = useSuppliers();
  const { products, isLoading: productsLoading } = useProducts();
  const { orders, isLoading: ordersLoading } = useOrders();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<SupplierList suppliers={suppliers} loading={suppliersLoading} />} />
        <Route path="/add-product" element={<ProductForm products={products} loading={productsLoading} />} />
        <Route path="/orders" element={<OrderList orders={orders} loading={ordersLoading} />} />
      </Routes>
    </Router>
  );
};

export default App;