import axios from 'axios';
const API = process.env.REACT_APP_API_BASE_URL || '';

/**
 * Hit your Flask route @app.route('/api/optimize') :contentReference[oaicite:1]{index=1}
 */
export async function optimize({ tickers, date, maxWeight, maxRisk }) {
    const res = await axios.post(`${API}/api/optimize`, {
        tickers,
        date,
        max_weight: maxWeight,
        max_risk: maxRisk,
    });
    return res.data;
}
