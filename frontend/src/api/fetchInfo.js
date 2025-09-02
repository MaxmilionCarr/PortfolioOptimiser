import axios from 'axios';

export const API = process.env.REACT_APP_API_BASE_URL ||
                    (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:8000' : null);

if (!API) {
    throw new Error("REACT_APP_API_BASE_URL must be set in production");
}

if (typeof window !== 'undefined') window.__API_BASE__ = API;

const client = axios.create({ baseURL: API});
export default client;

/**
 * Hit Flask
 */
export async function getInfo(ticker) {
    const res = await axios.post(`${API}/api/info`, { ticker });
    const info = res.data;
    return {
        ticker: info.symbol,
        price: info.regularMarketPrice ?? info.currentPrice ?? Error("Price not found"),
        name: info.shortName ?? info.longName ?? ticker,
        sector: info.sector ?? 'N/A',
        industry: info.industry ?? 'N/A',
    };
}
