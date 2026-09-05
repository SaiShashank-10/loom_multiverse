import { useEffect, useState } from 'react';
import axios from 'axios';

interface Order {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  status: string;
}

const useOrders = (userId: number) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`/api/orders?user_id=${userId}`);
        setOrders(response.data);
      } catch (err) {
        setError('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchOrders();
    }
  }, [userId]);

  return { orders, loading, error };
};

export default useOrders;