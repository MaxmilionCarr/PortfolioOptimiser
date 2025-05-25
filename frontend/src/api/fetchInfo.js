import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

/**
 * Fetch price, full_name, sector, industry for a ticker
 * (calls your Flask endpoint in app.py) :contentReference[oaicite:0]{index=0}
 */
export async function getInfo(ticker) {
    const res = await axios.post(`${API_BASE}/api/info`, { ticker });
    return res.data;
}
