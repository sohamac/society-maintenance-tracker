import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "";

const client = axios.create({
  baseURL: API_BASE ? `${API_BASE.replace(/\/$/, "")}/api` : "/api",
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
