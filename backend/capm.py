import yfinance as yf
import numpy as np
from scipy.optimize import minimize
from functools import lru_cache

# Global cache for tickers info
_tickers_info_cache = None

def get_all_info(tickers):
    """
    Fetch and cache info for all tickers in one go.
    Accepts any iterable of ticker strings.
    """
    global _tickers_info_cache
    tickers_list = list(tickers)
    cache_key = tuple(tickers_list)
    if _tickers_info_cache is None or _tickers_info_cache[0] != cache_key:
        yf_tickers = yf.Tickers(tickers_list)
        info_dict = {t: yf_tickers.tickers[t].info for t in tickers_list}
        _tickers_info_cache = (cache_key, info_dict)
    return _tickers_info_cache[1]

@lru_cache(maxsize=1)
def get_risk_free_rate():
    """
    Retrieve the most recent 1-day IRX close as the risk-free rate.
    """
    irx = yf.Ticker('^IRX')
    rate = irx.history(period='1d')['Close'].iloc[-1]
    return rate / 100


def fetch_data(tickers, start, end):
    """
    Download adjusted close prices for tickers + SPY and return their daily returns.
    """
    data = yf.download(tickers + ['SPY'], start=start, end=end)['Close']
    returns = data.pct_change().dropna()
    return returns[tickers], returns['SPY']


def compute_inputs(returns, market_returns):
    """
    Compute annualized covariance matrix, expected returns (via CAPM), and risk-free rate.
    """
    cov_matrix = returns.cov() * 252
    market_return = market_returns.mean() * 252
    rf = get_risk_free_rate()
    info = get_all_info(returns.columns)
    betas = [info[t].get('beta', 1) for t in returns.columns]
    exp_returns = rf + np.array(betas) * (market_return - rf)
    return cov_matrix, exp_returns, rf


def portfolio_performance(weights, exp_returns, cov_matrix):
    """
    Calculate portfolio return and volatility given weights.
    """
    port_return = np.dot(weights, exp_returns)
    port_vol = np.sqrt(weights.T.dot(cov_matrix).dot(weights))
    return port_return, port_vol


def min_variance(weights, exp_returns, cov_matrix):
    return portfolio_performance(weights, exp_returns, cov_matrix)[1]


def negative_sharpe(weights, exp_returns, cov_matrix):
    ret, vol = portfolio_performance(weights, exp_returns, cov_matrix)
    rf = get_risk_free_rate()
    return - (ret - rf) / vol


def optimize_weights(tickers, cov_matrix, exp_returns, max_weight, max_risk):
    """
    Solve for weights that first minimize volatility and then maximize Sharpe ratio
    under constraints. Always returns a sharpe value, even if risk constraint is active.
    """
    n = len(tickers)
    bounds = [(0, max_weight)] * n
    constraints = [
        {'type': 'eq', 'fun': lambda w: np.sum(w) - 1},
        {'type': 'ineq', 'fun': lambda w: max_risk - np.sqrt(w.T.dot(cov_matrix).dot(w))}
    ]
    x0 = np.ones(n) / n

    # 1) Minimum-volatility portfolio
    minvol_res = minimize(
        fun=min_variance,
        x0=x0,
        args=(exp_returns, cov_matrix),
        method='SLSQP',
        bounds=bounds,
        constraints=[{'type': 'eq', 'fun': lambda w: np.sum(w) - 1}]
    )
    w_minvol = minvol_res.x
    min_vol = np.sqrt(w_minvol.T.dot(cov_matrix).dot(w_minvol))

    # Compute Sharpe for min-vol portfolio
    ret_minvol = np.dot(w_minvol, exp_returns)
    sharpe_minvol = (ret_minvol - get_risk_free_rate()) / min_vol

    # If min-vol exceeds max_risk, return early with min-vol Sharpe
    if min_vol > max_risk:
        return w_minvol, min_vol, sharpe_minvol

    # 2) Maximum Sharpe ratio portfolio
    sharpe_res = minimize(
        fun=negative_sharpe,
        x0=w_minvol,
        args=(exp_returns, cov_matrix),
        method='SLSQP',
        bounds=bounds,
        constraints=constraints
    )
    w_sharpe = sharpe_res.x
    sharpe_value = -sharpe_res.fun

    return w_sharpe, min_vol, sharpe_value


def optimize_portfolio(tickers, date, max_weight, max_risk):
    """
    Main entry point. Orchestrates data fetching, input computation, and optimization.
    """
    year, month, day = date.split('-')
    start = f"{int(year) - 5}-{month}-{day}"
    returns, market = fetch_data(list(tickers), start, date)
    cov_matrix, exp_returns, rf = compute_inputs(returns, market)
    weights, min_vol, sharpe = optimize_weights(
        tickers, cov_matrix, exp_returns, max_weight, max_risk
    )
    exp_return, vol = portfolio_performance(weights, exp_returns, cov_matrix)
    return {
        "tickers": list(tickers),
        "weights": [float(w) for w in weights],
        "expected_return": round(float(exp_return), 6),
        "volatility": round(float(vol), 6),
        "sharpe_ratio": round(float(sharpe), 6),
        "min_volatility": round(float(min_vol), 6)
    }


def get_minimum_risk_portfolio(tickers, date, max_weight):
    """
    Compute the minimum-volatility portfolio given tickers, date, and max weight.
    Returns the weights and the minimum volatility.
    """
    year, month, day = date.split('-')
    start = f"{int(year) - 5}-{month}-{day}"
    returns, _ = fetch_data(list(tickers), start, date)
    cov_matrix, _, _ = compute_inputs(returns, returns)
    weights, min_vol, _ = optimize_weights(
        tickers, cov_matrix, np.zeros(len(tickers)), max_weight, max_risk=float('inf')
    )
    return {
        "weights": [float(w) for w in weights],
        "min_volatility": round(float(min_vol), 6)
    }


def get_minimum_volatility(tickers, date, max_weight):
    """
    Alias to get_minimum_risk_portfolio for a direct call to retrieve minimum volatility.
    """
    return get_minimum_risk_portfolio(tickers, date, max_weight)

# Example usage:
# if __name__ == "__main__":
#     print(get_minimum_volatility(['NVDA', 'SHOP', 'AAPL'], '2025-05-25', 0.3))
