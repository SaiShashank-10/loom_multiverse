import axios from 'axios';
const API_ENDPOINT = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const getRecommendations = async (candidateId) => {
  try {
    const response = await axios.get(`${API_ENDPOINT}/recommendations/${candidateId}`);
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch career recommendations');
  }
};

export default {
  getRecommendations,
};
