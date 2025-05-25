import axios from 'axios';
const API = process.env.REACT_APP_API_BASE_URL || '';

/**
 * Hit your Flask route @app.route('/api/info') :contentReference[oaicite:0]{index=0}
 * and pull out exactly what we need.
 */
export async function getMin({ tickers, date, maxWeight }) {
    const res = await axios.post(`${API}/api/minimum`,
        { tickers, date, max_weight: maxWeight });
    return res.data;
}
