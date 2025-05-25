import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
    const [stocks, setStocks] = useState([]); // {ticker, price}
    const [inputTicker, setInputTicker] = useState('');
    const [maxWeight, setMaxWeight] = useState(1);
    const [maxRisk, setMaxRisk] = useState(1);
    const [weights, setWeights] = useState([]);
    const [expected_return, setExpectedReturn] = useState('');
    const [volatility, setVolatility] = useState('');
    const [minRisk, setMinRisk] = useState(0);
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');

    // Check min maxWeight based on number of tickers
    useEffect(() => {
        const minWeight = stocks.length > 0 ? 1 / stocks.length : 0;
        if (maxWeight < minWeight) {
            setWarning(`Max weight too low. Minimum allowed is ${minWeight.toFixed(3)}`);
        } else {
            setWarning('');
        }
    }, [maxWeight, stocks]);

    // Trigger optimization when stocks or parameters change and valid
    useEffect(() => {
        if (stocks.length === 0) {
            setWeights([]);
            return;
        }
        if (maxWeight < 1 / stocks.length) {
            setWeights([]);
            return;
        }

        const tickers = stocks.map(s => s.ticker.toUpperCase());
        const today = new Date().toISOString().slice(0, 10);

        axios.post('/api/optimize', {
            tickers: tickers,
            date: today,
            max_weight: maxWeight,
            max_risk: maxRisk,
        }).then(res => {
            if (res.data.error) {
                setError(res.data.error);
                setMinRisk(res.data.min_vol.toFixed(2))
                setWeights([]);
            } else {
                setError('');
                setWeights(res.data.weights);
                setExpectedReturn(res.data.expected_return.toFixed(2));
                setVolatility(res.data.volatility.toFixed(2));
                setMinRisk(res.data.min_vol.toFixed(2))
            }
        }).catch(() => {
            setError('Optimization failed');
            setWeights([])
        });
    }, [stocks, maxWeight, maxRisk]);

    // Fetch price for ticker, add to stocks list
    const addTicker = async () => {
        const ticker = inputTicker.trim().toUpperCase();
        if (!ticker) return;

        // prevent duplicates
        if (stocks.find(s => s.ticker === ticker)) {
            setError(`Ticker ${ticker} already added.`);
            return;
        }

        try {
            const res = await axios.post('/api/fetch', { ticker });
            if (res.data.price) {
                setStocks([...stocks, { ticker, price: res.data.price, sector: res.data.sector, industry: res.data.industry }]);
                setInputTicker('');
                setError('');
            } else {
                setError(`Could not fetch price for ${ticker}`);
            }
        } catch {
            setError(`Error fetching data for ${ticker}`);
        }
    };

    return (
        <div className="app-container">
            <h1>Portfolio Optimizer</h1>

            <div className="form-group">
                <label>New Stock Ticker</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={inputTicker}
                        onChange={e => setInputTicker(e.target.value)}
                        placeholder="Enter ticker (e.g. AAPL)"
                        onKeyDown={e => e.key === 'Enter' && addTicker()}
                    />
                    <button onClick={addTicker} className="submit-btn">Add Stock</button>
                </div>
            </div>

            <div className="stocks-list">
                {stocks.length === 0 && <p>No stocks added yet.</p>}
                {stocks.map((s, i) => (
                    <div key={i} className="stock-item">
                        <strong>{s.ticker}</strong>: ${s.price.toFixed(2)}
                        {weights.length === stocks.length && weights[i] !== undefined && (
                            <span> — Weight: {(weights[i] * 100).toFixed(2)}%</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="form-group">
                <label>Max Weight per Stock</label>
                <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={maxWeight}
                    onChange={e => setMaxWeight(parseFloat(e.target.value) || 0)}
                />
            </div>

            <div className="form-group">
                <label>Max Allowable Risk (Std Dev)</label>
                <input
                    type="number"
                    min={minRisk}
                    max={1}
                    step={0.01}
                    value={maxRisk}
                    onChange={e => setMaxRisk(parseFloat(e.target.value) || 0)}
                />
            </div>

            <div>
                <h1>Expected Return and Volatility</h1>
                <p>{expected_return}, {volatility}, {minRisk}</p>
            </div>

            {warning && <div className="warning">{warning}</div>}
            {error && <div className="error">{error}</div>}
        </div>
    );
}

export default App;
