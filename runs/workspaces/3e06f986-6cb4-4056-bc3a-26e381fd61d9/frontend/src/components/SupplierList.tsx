import React from 'react';
import useSuppliers from '../hooks/useSuppliers';

const SupplierList: React.FC = () => {
  const { suppliers, loading, error } = useSuppliers();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Supplier List</h1>
      <ul>
        {suppliers.map((supplier: any) => (
          <li key={supplier.id}>
            {supplier.name} - {supplier.location}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SupplierList;