import React from 'react';
import { useSuppliers } from '../hooks/useSuppliers';

const SupplierList: React.FC = () => {
  const { suppliers, isLoading, error } = useSuppliers();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Supplier List</h1>
      <ul>
        {suppliers.map(supplier => (
          <li key={supplier.id}>
            <strong>{supplier.name}</strong> - Location: {supplier.location}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SupplierList;