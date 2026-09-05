import { useState, useEffect } from 'react';
import axios from 'axios';

interface Supplier {
  id: number;
  name: string;
  location: string;
}

const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await axios.get('/api/suppliers');
        setSuppliers(response.data);
      } catch (err) {
        setError('Failed to fetch suppliers');
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  return { suppliers, loading, error };
};

export default useSuppliers;