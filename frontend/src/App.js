import React, { useState, useEffect, useMemo } from 'react';
import { getInfo } from './api/fetchInfo';
import { optimize } from './api/optimize';
import { getMin } from './api/minimumVolatility';
import './App.css';
import SliderInput from './components/SliderInput';

function App() {
    // --- State hooks ---
    const [stocks, setStocks] = useState([]);    // { ticker, price, sector, industry }
    const [input, setInput] = useState('');
    const [type, setType] = useState('capm')
    const [maxWeight, setMaxWeight] = useState(1);
    const [maxRisk, setMaxRisk] = useState(1);
    const [minVol, setMinVol] = useState(0);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [weightWarning, setWeightWarning] = useState('');
    const [riskWarning, setRiskWarning] = useState('');
    const [allocation, setAllocation] = useState(0);

    // Fix the date once per session
    const date = useMemo(() => new Date().toISOString().slice(0, 10), []);

    // Warn if maxWeight < 1/#stocks
    useEffect(() => {
        if (stocks.length) {
            const minW = 1 / stocks.length;
            setWeightWarning(
                maxWeight < minW
                    ? `Max weight too low; minimum is ${minW.toFixed(3)}`
                    : ''
            );
        } else {
            setWeightWarning('');
        }
    }, [stocks, maxWeight]);

    // Fetch minimum volatility whenever stocks, date, maxWeight or maxRisk change
    useEffect(() => {
        if (!stocks.length) {
            setMinVol(0);
            setRiskWarning('');
            return;
        }
        const tickers = stocks.map(s => s.ticker);
        getMin({ tickers, date, maxWeight })
            .then(data => {
                setMinVol(data.min_volatility);
                if (maxRisk < data.min_volatility) {
                    setRiskWarning(`Max risk too low; minimum is ${data.min_volatility.toFixed(3)}`);
                } else {
                    setRiskWarning('');
                }
            })
            .catch(err => {
                console.error("Failed to fetch min volatility", err);
                setMinVol(0);
                setRiskWarning('');
            });
    }, [stocks, date, maxWeight, maxRisk]);

    // Add a new ticker
    const addTicker = async () => {
        const sym = input.trim().toUpperCase();
        if (!sym) {
            setError("Ticker can't be empty");
            return;
        }
        if (stocks.some(s => s.ticker === sym)) {
            setError(`${sym} already added`);
            return;
        }
        try {
            setError('');
            const info = await getInfo(sym);
            if (info.price instanceof Error) {
                throw info.price;
            }
            setStocks(prev => [...prev, info]);
            setInput('');
        } catch {
            setError(`Could not fetch info for ${sym}`);
        }
    };

    // Remove a ticker
    const removeTicker = ticker => {
        setStocks(old => old.filter(s => s.ticker !== ticker));
    };

    // Run the full optimization
    const runOptimize = async () => {
        setError('');
        setLoading(true);
        try {
            const tickers = stocks.map(s => s.ticker);
            const out = await optimize({ type, tickers, date, maxWeight, maxRisk });
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

            {/* Ticker input */}
            <div className="form-group">
                <label>New Stock Ticker</label>
                <div className="input-row">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addTicker()}
                        placeholder="e.g. AAPL"
                    />
                    <button
                        onClick={addTicker}
                        className="submit-btn"
                        disabled={
                            !input.trim() ||
                            stocks.some(s => s.ticker === input.trim().toUpperCase())
                        }
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* List of added stocks */}
            <div className="stocks-list">
                {stocks.length === 0 && <p>No stocks yet.</p>}
                {stocks.map((s, i) => (
                    <div key={i} className="stock-item">
                        <strong>{s.ticker} ({s.name})</strong> — ${s.price.toFixed(2)}{' '}
                        <span>({s.sector}, {s.industry})</span>
                        <button className="remove-btn" onClick={() => removeTicker(s.ticker)}>
                            Remove
                        </button>
                    </div>
                ))}
            </div>
            {/* --- Model Toggle --- */}
            <div className="form-group pill-toggle-group">
                {/* Description above */}
                <div className="pill-toggle-label">
                    {type === 'historical'
                        ? 'Using Historical Data'
                        : 'Using Forward-Looking (CAPM)'}
                </div>

                {/* The pill switch */}
                <label className="pill-toggle">
                    <input
                        type="checkbox"
                        checked={type === 'historical'}
                        onChange={e =>
                            setType(e.target.checked ? 'historical' : 'capm')
                        }
                    />
                    <span className="pill-slider" />
                </label>
            </div>

            <div className="form-group">
                <label>Allocation ($)</label>
                <div className="input-box">
                    <input
                        type="number"
                        value={allocation}
                        onChange={e => setAllocation(Number(e.target.value))}
                    />
                </div>

            </div>

            {/* Max weight slider */}
            <div className="form-group">
                <SliderInput
                    label="Max Weight per Stock"
                    min={0}
                    max={1}
                    step={0.05}
                    value={maxWeight}
                    onChange={setMaxWeight}
                />
            </div>

            {/* Max risk slider, driven by fetched minimum volatility */}
            <div className="form-group">
                <SliderInput
                    label="Max Allowable Risk"
                    min={0}
                    max={1}
                    step={0.01}
                    value={maxRisk}
                    onChange={setMaxRisk}
                />
                {minVol > 0 && (
                    <small className="hint">
                        Minimum possible volatility: {minVol.toFixed(3)}
                    </small>
                )}
            </div>

            {/* Display warnings or errors */}
            {(error || weightWarning || riskWarning) && (
                <div className={error ? 'error' : 'warning'}>
                    {error || weightWarning || riskWarning}
                </div>
            )}

            {/* Run optimization */}
            <div className="button-container">
                <button
                    onClick={runOptimize}
                    disabled={
                        loading ||
                        !stocks.length ||
                        Boolean(weightWarning) ||
                        Boolean(riskWarning)
                    }
                    className="submit-btn"
                >
                    {loading ? 'Running…' : 'Run Optimization'}
                </button>
            </div>

            {/* Display results */}
            {results && (
                <div className="results">
                    <h2>Metrics</h2>
                    <div className="metrics">
                        <div className="metric">Sharpe Ratio: {results.sharpe_ratio.toFixed(3)}</div>
                        <div className="metric">Exp. Return: {results.expected_return.toFixed(3)}</div>
                        <div className="metric">Volatility: {results.volatility.toFixed(3)}</div>
                        <div className="metric">Min Volatility: {results.min_volatility.toFixed(3)}</div>
                    </div>

                    <h2>Weights</h2>
                    <table>
                        <thead>
                            <tr><th>Ticker</th><th>Weight</th><th>Allocation</th></tr>
                        </thead>
                        <tbody>
                        {results.tickers.map((t, i) => (
                            <tr key={t}>
                                <td>{t}</td>
                                <td>{(results.weights[i] * 100).toFixed(2)}%</td>
                                <td>${(results.weights[i] * allocation).toFixed(2)}</td>
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
