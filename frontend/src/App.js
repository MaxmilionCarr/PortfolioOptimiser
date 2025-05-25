import React, { useState } from 'react';
import { getInfo } from './api/fetchInfo';
import { optimize } from './api/optimize';
import './App.css';

function App() {
    const [tickers, setTickers] = useState([]);
    const [prices, setPrices] = useState({});
    const [params, setParams] = useState({
        start: '2025-01-01',
        end: '2025-05-25',
        maxWeight: 0.3,
        maxRisk: 0.2,
    });
    const [results, setResults] = useState({
        weights: [],
        expReturns: {},
        sharpe: 0,
    });
    const [loading, setLoading] = useState(false);

    const addTicker = async (sym) => {
        if (!tickers.includes(sym)) {
            setTickers([...tickers, sym]);
            const info = await getInfo(sym);
            setPrices(p => ({ ...p, [sym]: info.price }));
        }
    };

    const runOpt = async () => {
        setLoading(true);
        try {
            const res = await optimize({
                tickers,
                start: params.start,
                end: params.end,
                max_weight: params.maxWeight,
                max_risk: params.maxRisk
            });
            setResults(res);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="App">
            {/* … your inputs and sliders here … */}
            <button onClick={runOpt} disabled={loading || tickers.length===0}>
                {loading ? 'Running…' : 'Run Optimization'}
            </button>

            <div className="results">
                <h2>Metrics</h2>
                <p>Sharpe Ratio: {results.sharpe.toFixed(3)}</p>

                <h2>Weights</h2>
                {results.weights.length === 0
                    ? <p>No weights yet.</p>
                    : (
                        <table>
                            <thead>
                            <tr>
                                <th>Ticker</th><th>Weight</th>
                            </tr>
                            </thead>
                            <tbody>
                            {results.weights.map(([ticker, weight]) => (
                                <tr key={ticker}>
                                    <td>{ticker}</td>
                                    <td>
                                        {typeof weight === 'number'
                                            ? (weight * 100).toFixed(2) + '%'
                                            : '—'}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
            </div>
        </div>
    );
}

export default App;
