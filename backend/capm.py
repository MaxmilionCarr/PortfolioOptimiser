import yfinance as yf
import numpy as np
from scipy.optimize import minimize
from functools import lru_cache


def get_beta(ticker):
    info = yf.Ticker(ticker).info
    return info.get("beta", 1)  # Default to 1 if beta is not available

def get_risk_free_rate():
    irx = yf.Ticker('^IRX')
    rate = irx.history(period='1d')['Close'].iloc[-1] # Check the accuracy on this !Important
    return rate / 100

def optimize_portfolio(tickers, date, max_weight, max_risk):
    start = str(int(date.split('-')[0]) - 5) + '-' + ('-').join(date.split('-')[1:])

    try:
        raw_data = yf.download(tickers, start, date)
        raw_market = yf.download(['SPY'], start, date)

    except Exception as e:
        return {'error': str(e)}

    # Market Returns
    market_data = raw_market['Close']
    market_returns = market_data.pct_change().dropna()
    market_return = (market_returns.mean() * 252)['SPY']

    # Riskfree
    risk_free_rate = get_risk_free_rate()
    
    # Ticker Data
    ticker_data = raw_data['Close']
    returns = ticker_data.pct_change().dropna()
    cov_matrix = returns.cov() * 252  # annualize

    # Calculate expected returns of each stock using CAPM
    expected_returns = []
    for ticker in tickers:
        beta = get_beta(ticker)
        expected_return = risk_free_rate + beta * (market_return - risk_free_rate)
        expected_returns.append(expected_return)

    expected_returns = np.array(expected_returns)

    num_assets = len(tickers)
    init_guess = [1 / num_assets] * num_assets
    bounds = [(0, max_weight)] * num_assets
    constraints = ({'type': 'eq', 'fun': lambda w: np.sum(w) - 1})

    def negative_sharpe(weights):
        port_return, port_vol = portfolio_perf(weights)
        return -port_return / port_vol
    
    def portfolio_perf(weights):
        port_return = np.dot(weights, expected_returns)
        port_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
        return port_return, port_vol
    
    min_vol_result = minimize(
        lambda w: np.sqrt(np.dot(w.T, np.dot(cov_matrix, w))),
        x0=init_guess,
        method='SLSQP',
        bounds=bounds,
        constraints=constraints
    )

    if not min_vol_result.success:
        return {'error': 'Minimum volatility check failed'}

    min_vol = min_vol_result.fun
    if max_risk > 0 and max_risk < min_vol:
        return {"min_vol": min_vol}

    result = minimize(negative_sharpe, init_guess, method='SLSQP', bounds=bounds, constraints=constraints)

    if not result.success:
        return {'error': 'Optimization failed'}
    
    opt_weights = result.x
    opt_return, opt_vol = portfolio_perf(opt_weights)

    return {
        "tickers": list(tickers),
        "weights": list([x.item() for x in opt_weights]),
        "expected_return": round(opt_return, 4).item(),
        "volatility": round(opt_vol, 4).item(),
        "sharpe_ratio": round(opt_return / opt_vol, 4).item(),
        "min_vol": min_vol
    }

# Tester
# print(optimize_portfolio(['NVDA', 'SHOP', 'AAPL', 'RKLB'], '2025-05-25', 1, 1))