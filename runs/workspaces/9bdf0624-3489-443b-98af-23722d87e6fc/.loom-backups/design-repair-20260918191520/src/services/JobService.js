import axios from 'axios';

const API_ENDPOINT = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const searchJobs = async (query) => {
  try {
    const response = await axios.get(`${API_ENDPOINT}/jobs/search`, { params: { query } });
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch jobs');
  }
};

export default {
  searchJobs,
};
