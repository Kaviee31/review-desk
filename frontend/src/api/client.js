import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_APP_API_BASE_URL,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
