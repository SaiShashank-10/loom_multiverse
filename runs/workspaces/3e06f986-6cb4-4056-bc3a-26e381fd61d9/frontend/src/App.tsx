import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SupplierList from './components/SupplierList';
import ProductForm from './components/ProductForm';
import useSuppliers from './hooks/useSuppliers';
import useProducts from './hooks/useProducts';

const App: React.FC = () => {
  const { loading: suppliersLoading, error: suppliersError } = useSuppliers();
  const { loading: productsLoading, error: productsError } = useProducts();

  if (suppliersLoading || productsLoading) return <div>Loading...</div>;
  if (suppliersError || productsError) return <div>Error: {suppliersError || productsError}</div>;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<SupplierList />} />
        <Route path="/products/new" element={<ProductForm />} />
        <Route path="/products/:id" element={<ProductForm />} />
      </Routes>
    </Router>
  );
};

export default App;