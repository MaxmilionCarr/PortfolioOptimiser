import React, { useState, useEffect, useMemo } from 'react';
import { getInfo } from "./api/fetchInfo";
import { optimize } from "./api/optimize";
import './App.css';
import SliderInput from './components/SliderInput';

function App() {
    // --- State hooks ---
    const [stocks, setStocks] = useState([]);    // { ticker, price, sector, industry, name }
    const [input, setInput] = useState('');
    const [type, setType] = useState('capm');    // 'capm' | 'historical'
    const [maxWeight, setMaxWeight] = useState(1);
    const [maxRisk, setMaxRisk] = useState(1);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [weightWarning, setWeightWarning] = useState('');
    const [riskWarning, setRiskWarning] = useState('');
    const [allocation, setAllocation] = useState(0);
    const [pendingTickers, setPendingTickers] = useState(new Set());
    const [tickerError, setTickerError] = useState('');

    // Fix the date once per session
    const date = useMemo(() => new Date().toISOString().slice(0, 10), []);

    // Warn if maxWeight is too low to allow sum(weights)=1 (long-only)
    useEffect(() => {
        if (!stocks.length) {
            setWeightWarning('');
            return;
        }
        const minFeasible = 1 / stocks.length;
        if (maxWeight < minFeasible) {
            setWeightWarning(`Max weight too low; must be at least ${(minFeasible * 100).toFixed(1)}% for ${stocks.length} stocks`);
        } else {
            setWeightWarning('');
        }
    }, [stocks, maxWeight]);

    // Clear stale warnings when inputs change (risk is only validated after optimise now)
    useEffect(() => {
        setRiskWarning('');
        // Keep results visible unless you prefer clearing them:
        // setResults(null);
    }, [stocks, maxRisk, type, date, maxWeight]);

    // Add a new ticker (calls POST /info via getInfo wrapper)
    const addTicker = async () => {
        const sym = input.trim().toUpperCase();
        if (!sym) {
            setError("Ticker can't be empty");
            return;
        }
        if (stocks.some(s => s.ticker === sym) || pendingTickers.has(sym)) {
            setError(`${sym} already added`);
            return;
        }

        setError('');
        setTickerError('');

        // mark pending
        setPendingTickers(prev => new Set(prev).add(sym));

        // optimistic placeholder row (so the user sees it immediately)
        setStocks(prev => [
            ...prev,
            {
            ticker: sym,
            name: "Fetching…",
            price: 0,
            sector: "—",
            industry: "—",
            _pending: true,
            }
        ]);

        setInput('');

        try {
            const info = await getInfo(sym);

            const priceNum = Number(info.price);
            if (!Number.isFinite(priceNum)) throw new Error("Price not found");
            if (priceNum === 0) throw new Error("Price is zero");

            // replace placeholder
            setStocks(prev =>
                prev.map(s => (s.ticker === sym ? { ...info, price: priceNum, _pending: false } : s))
            );
        } catch (e) {
            setTickerError(`Could not fetch info for ${sym}`);

            setStocks(prev => prev.filter(s => s.ticker !== sym));


        } finally {
            setPendingTickers(prev => {
            const next = new Set(prev);
            next.delete(sym);
            return next;
            });
        }
        };

    // Remove a ticker
    const removeTicker = ticker => {
        setStocks(old => old.filter(s => s.ticker !== ticker));
    };

    // Run the full optimization (calls POST /optimize only)
    const runOptimize = async () => {
        setError('');
        setRiskWarning('');
        setLoading(true);

        try {
            const tickers = stocks.map(s => s.ticker);
            const out = await optimize({ type, tickers, date, maxWeight, maxRisk });

            if (out?.error) {
                setError(out.error);
                setResults(null);
                return;
            }

            setResults(out);

            // Risk warning based on server-computed minimum volatility (no extra endpoint)
            const mv = out.min_volatility;
            if (typeof mv === "number" && Number.isFinite(mv) && maxRisk < mv) {
                setRiskWarning(`Max risk too low; minimum is ${mv.toFixed(3)}`);
            }
        } catch (e) {
            setError('Optimization failed');
            setResults(null);
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
            <div className="prev-error">
                {tickerError && <div className="error">{tickerError}</div>}
            </div>
            <div className="stocks-list">
                {stocks.length === 0 && <p>No stocks yet.</p>}
                
                {stocks.map((s, i) => {
                    const isPending = Boolean(s._pending) || pendingTickers.has(s.ticker);

                    return (
                        <div key={i} className="stock-item">
                        <strong>{s.ticker} ({s.name})</strong>{" "}
                        {isPending ? (
                            <em>— fetching info…</em>
                        ) : (
                            <>— ${Number(s.price).toFixed(2)} <span>({s.sector}, {s.industry})</span></>
                        )}


                        <button
                            className="remove-btn"
                            onClick={() => removeTicker(s.ticker)}
                            disabled={isPending}
                            title={isPending ? "Fetching data…" : "Remove"}
                        >
                            Remove
                        </button>
                        </div>
                    );
                })}
            </div>

            {/* --- Model Toggle --- */}
            <div className="form-group pill-toggle-group">
                <div className="pill-toggle-label">
                    {type === 'historical'
                        ? 'Using Historical Data'
                        : 'Using Forward-Looking (CAPM)'}
                </div>

                <label className="pill-toggle">
                    <input
                        type="checkbox"
                        checked={type === 'historical'}
                        onChange={e => setType(e.target.checked ? 'historical' : 'capm')}
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

            {/* Max risk slider */}
            <div className="form-group">
                <SliderInput
                    label="Max Allowable Risk"
                    min={0}
                    max={1}
                    step={0.01}
                    value={maxRisk}
                    onChange={setMaxRisk}
                />
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
                        pendingTickers.size > 0 ||
                        stocks.some(s => s._pending)
                    }
                    className="submit-btn"
                >
                    {loading ? 'Running…' : 'Run Optimization'}
                </button>
            </div>

            {/* Display results */}
            {results && !results.error && (
                <div className="results">
                    <h2>Metrics</h2>
                    <div className="metrics">
                        <div className="metric">Sharpe Ratio: {Number(results.sharpe_ratio).toFixed(3)}</div>
                        <div className="metric">Exp. Return: {Number(results.expected_return).toFixed(3)}</div>
                        <div className="metric">Volatility: {Number(results.volatility).toFixed(3)}</div>
                        <div className="metric">Min Volatility: {Number(results.min_volatility).toFixed(3)}</div>
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