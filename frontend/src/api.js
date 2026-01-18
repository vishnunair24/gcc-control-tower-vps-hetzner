import axios from 'axios';
import config from './config';

const api = axios.create({
  baseURL: config.API_BASE_URL,
  withCredentials: true, // 🔴 THIS IS THE FIX
});

export default api;
