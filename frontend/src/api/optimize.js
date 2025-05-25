import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

/**
 * Optimize the portfolio given tickers, date, max_weight, max_risk
 * (calls your Flask endpoint in app.py) :contentReference[oaicite:1]{index=1}
 */
export async function optimize({ tickers, date, maxWeight, maxRisk }) {
    const res = await axios.post(
        `${API_BASE}/api/optimize`,
        { tickers, date, max_weight: maxWeight, max_risk: maxRisk }
    );
    return res.data;
}
