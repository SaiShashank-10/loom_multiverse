import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addProduct } from '../store/slices/productsSlice';
import { ProductService } from '../services/apiService';

const ProductForm: React.FC = () => {
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !price || !supplierId) {
      alert('Please fill in all fields.');
      return;
    }

    try {
      const productData = {
        name,
        price,
        supplier_id: supplierId
      };

      await ProductService.addProduct(productData);
      dispatch(addProduct(productData));
      setName('');
      setPrice(null);
      setSupplierId(null);
      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
    }
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
          <label htmlFor="supplierId">Supplier ID:</label>
          <input
            type="number"
            id="supplierId"
            value={supplierId || ''}
            onChange={(e) => setSupplierId(Number(e.target.value))}
            required
          />
        </div>
        <button type="submit">Add Product</button>
      </form>
    </div>
  );
};

export default ProductForm;