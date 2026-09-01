import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { fetchSuppliers } from '../../store/slices/suppliersSlice';

const SuppliersList: React.FC = () => {
  const dispatch = useDispatch();
  const suppliers = useSelector((state: RootState) => state.suppliers.list);
  const loading = useSelector((state: RootState) => state.suppliers.loading);
  const error = useSelector((state: RootState) => state.suppliers.error);

  useEffect(() => {
    if (!suppliers.length) {
      dispatch(fetchSuppliers());
    }
  }, [dispatch, suppliers]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Suppliers List</h1>
      <ul>
        {suppliers.map((supplier) => (
          <li key={supplier.supplier_id}>
            {supplier.name} - {supplier.location}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SuppliersList;