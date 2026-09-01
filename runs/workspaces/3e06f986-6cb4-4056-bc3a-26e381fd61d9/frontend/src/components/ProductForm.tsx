import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSuppliers from '../hooks/useSuppliers';
import axios from 'axios';

interface Product {
  id: string | number;
  supplier_id: string | number;
  name: string;
  price: number | string;
}

const ProductForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { suppliers, loading: suppliersLoading, error: suppliersError } = useSuppliers();

  const [formData, setFormData] = useState<Product>({
    id: '',
    supplier_id: '',
    name: '',
    price: 0,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      axios.get(`/api/products/${id}`)
        .then(response => setFormData(response.data))
        .catch(error => setError('Error fetching product'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (id) {
        await axios.put(`/api/products/${id}`, formData);
      } else {
        await axios.post(`/api/products`, formData);
      }
      navigate('/products');
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  if (suppliersLoading || loading) return <div>Loading...</div>;
  if (suppliersError || error) return <div>Error: {suppliersError || error}</div>;

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Supplier:
        <select name="supplier_id" value={formData.supplier_id} onChange={handleChange}>
          <option value="">Select a supplier</option>
          {suppliers.map((supplier: any) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </label>
      <br />
      <label>
        Name:
        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
      </label>
      <br />
      <label>
        Price:
        <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} required />
      </label>
      <br />
      <button type="submit">{id ? 'Update Product' : 'Add Product'}</button>
    </form>
  );
};

export default ProductForm;