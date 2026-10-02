import axios from 'axios';

const API_ENDPOINT = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const getTechnicalGaps = async (candidateId) => {
  try {
    const response = await axios.get(`${API_ENDPOINT}/technical-gaps/${candidateId}`);
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch technical gaps');
  }
};

export default {
  getTechnicalGaps,
};
