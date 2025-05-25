import React, { useState, useEffect } from 'react';
import { getInfo } from './api/fetchInfo';
import { optimize } from './api/optimize';
import './App.css';

function App() {
    const [stocks, setStocks] = useState([]);         // {ticker, price, sector, industry}
    const [input, setInput] = useState('');
    const [maxWeight, setMaxWeight] = useState(1);
    const [maxRisk, setMaxRisk] = useState(1);
    const [results, setResults] = useState(null);     // full JSON from optimize()
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');

    // Warn if maxWeight < 1/#stocks
    useEffect(() => {
        if (stocks.length) {
            const minW = 1 / stocks.length;
            setWarning(
                maxWeight < minW
                    ? `Max weight too low; minimum is ${minW.toFixed(3)}`
                    : ''
            );
        }
    }, [stocks, maxWeight]);

    // Add a ticker & fetch its price/sector/industry
    const addTicker = async () => {
        const sym = input.trim().toUpperCase();
        if (!sym) return;
        if (stocks.some(s => s.ticker === sym)) {
            setError(`’${sym}’ already added`);
            return;
        }
        setError('');
        try {
            const info = await getInfo(sym);
            setStocks(prev => [...prev, info]);
            setInput('');
        } catch {
            setError(`Could not fetch info for ${sym}`);
        }
    };

    // Run your CAPM optimizer
    const runOptimize = async () => {
        setError('');
        setLoading(true);
        try {
            const tickers = stocks.map(s => s.ticker);
            const date = new Date().toISOString().slice(0, 10);
            const out = await optimize({ tickers, date, maxWeight, maxRisk });
            setResults(out);
        } catch {
            setError('Optimization failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container">
            <h1>Portfolio Optimizer</h1>

            <div className="form-group">
                <label>New Stock Ticker</label>
                <div className="input-row">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="e.g. AAPL"
                        onKeyDown={e => e.key === 'Enter' && addTicker()}
                    />
                    <button onClick={addTicker} className="submit-btn">
                        Add
                    </button>
                </div>
            </div>

            <div className="stocks-list">
                {stocks.length === 0 && <p>No stocks yet.</p>}
                {stocks.map((s, i) => (
                    <div key={i} className="stock-item">
                        <strong>{s.ticker}</strong> — ${s.price.toFixed(2)}{' '}
                        <span>({s.sector}, {s.industry})</span>
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
                    min={0}
                    max={1}
                    step={0.01}
                    value={maxRisk}
                    onChange={e => setMaxRisk(parseFloat(e.target.value) || 0)}
                />
            </div>

            {(warning || error) && (
                <div className={error ? 'error' : 'warning'}>
                    {error || warning}
                </div>
            )}

            <div className="button-container">
                <button
                    onClick={runOptimize}
                    disabled={
                        loading ||
                        !stocks.length ||
                        Boolean(warning)
                    }
                    className="submit-btn"
                >
                    {loading ? 'Running…' : 'Run Optimization'}
                </button>
            </div>

            {results && (
                <div className="results">
                    <h2>Metrics</h2>
                    <div className="metrics">
                        <div className="metric">
                            Sharpe Ratio: {results.sharpe_ratio.toFixed(3)}
                        </div>
                        <div className="metric">
                            Exp. Return: {results.expected_return.toFixed(3)}
                        </div>
                        <div className="metric">
                            Volatility: {results.volatility.toFixed(3)}
                        </div>
                        <div className="metric">
                            Min Volatility: {results.min_volatility.toFixed(3)}
                        </div>
                    </div>

                    <h2>Weights</h2>
                    <table>
                        <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Weight</th>
                        </tr>
                        </thead>
                        <tbody>
                        {results.tickers.map((t, i) => (
                            <tr key={t}>
                                <td>{t}</td>
                                <td>
                                    {(results.weights[i] * 100).toFixed(2)}%
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default App;
