import axios from 'axios';
const API = process.env.REACT_APP_API_BASE_URL || '';

/**
 * Hit Flask
 */
export async function getMin({ tickers, date, maxWeight }) {
    const res = await axios.post(`${API}/api/minimum`,
        { tickers, date, max_weight: maxWeight });
    return res.data;
}
