import React, { useState } from 'react';
import { useSuppliers } from '../hooks/useSuppliers';
import { useProducts } from '../hooks/useProducts';

const ProductForm: React.FC = () => {
  const { suppliers } = useSuppliers();
  const { addProduct } = useProducts();

  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name || !price || !supplierId) return;

    addProduct({ name, price, supplier_id: supplierId })
      .then(() => {
        setName('');
        setPrice(null);
        setSupplierId(null);
      })
      .catch((error) => {
        console.error('Error adding product:', error);
      });
  };

  return (
    <div>
      <h2>Add New Product</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Product Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="price">Price:</label>
          <input
            type="number"
            id="price"
            value={price || ''}
            onChange={(e) => setPrice(Number(e.target.value))}
            step="0.01"
            required
          />
        </div>
        <div>
          <label htmlFor="supplier">Supplier:</label>
          <select
            id="supplier"
            value={supplierId || ''}
            onChange={(e) => setSupplierId(Number(e.target.value))}
            required
          >
            <option value="">Select a supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">Add Product</button>
      </form>
    </div>
  );
};

export default ProductForm;