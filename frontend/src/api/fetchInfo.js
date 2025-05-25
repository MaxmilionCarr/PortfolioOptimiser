import axios from 'axios';
const API = process.env.REACT_APP_API_BASE_URL || '';

/**
 * Hit your Flask route @app.route('/api/info') :contentReference[oaicite:0]{index=0}
 * and pull out exactly what we need.
 */
export async function getInfo(ticker) {
    const res = await axios.post(`${API}/api/info`, { ticker });
    const info = res.data;
    return {
        ticker,
        price: info.regularMarketPrice ?? info.currentPrice ?? 0,
        sector: info.sector ?? 'N/A',
        industry: info.industry ?? 'N/A',
    };
}
