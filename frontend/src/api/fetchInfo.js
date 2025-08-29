// frontend/src/api/fetchInfo.js
import axios from 'axios';

const API =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:8000' : null);

if (!API) {
  throw new Error('REACT_APP_API_BASE_URL is not set. Set it in GitHub Actions Variables.');
}

const client = axios.create({
  baseURL: API,
  withCredentials: false,
});

export async function getInfo(ticker) {
  const res = await client.post('/api/info', { ticker }, {
    headers: { 'Content-Type': 'application/json' },
  });
  const info = res.data;
  return {
    ticker,
    price: info.regularMarketPrice ?? info.currentPrice ?? 0,
    name: info.shortName ?? info.longName ?? ticker,
    sector: info.sector ?? 'N/A',
    industry: info.industry ?? 'N/A',
  };
}
