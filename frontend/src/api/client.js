import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:8000" : null);

if (!API_BASE) {
  throw new Error("REACT_APP_API_BASE_URL must be set in production");
}

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000",
  headers: { "Content-Type": "application/json" },
});